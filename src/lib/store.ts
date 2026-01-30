import type { App, EffectScope } from 'vue'
import type { Module, RawModule } from '../module/module'
import { computed, effectScope, reactive, watch } from 'vue'
import { ModuleCollection } from '../module/module-collection'
import { useDevtools } from '../plugins/devtools'
import { storeKey } from './inject'
import { assert, forEachValue, isObject, isPromise } from './util'

export type VuexPlugin<S> = (store: Store<S>) => any

export interface ActionSubscriber<S, R> {
  before?: (action: ActionPayload, state: S) => any
  after?: (action: ActionPayload, state: S) => any
  error?: (action: ActionPayload, state: S, error: Error) => any
}

export interface ActionPayload {
  type: string
  payload: any
}

export interface StoreOptions<S> {
  state?: S | (() => S)
  getters?: Record<string, any>
  actions?: Record<string, any>
  mutations?: Record<string, any>
  modules?: Record<string, any>
  plugins?: VuexPlugin<S>[]
  strict?: boolean
  devtools?: boolean
}

type Mutation<S> = (state: S, payload?: any) => any

export interface ActionContext<S, R> {
  dispatch: (type: string, payload?: any, options?: any) => Promise<any>
  commit: (type: string, payload?: any, options?: any) => void
  state: S
  getters: any
  rootState: R
  rootGetters: any
}

export class Store<S = any> {
  public _modules: ModuleCollection<S>
  public _actions: Record<string, Function[]> = Object.create(null)
  public _mutations: Record<string, Mutation<S>[]> = Object.create(null)
  public _wrappedGetters: Record<string, Function> = Object.create(null)
  public _modulesNamespaceMap: Record<string, Module<any, S>> = Object.create(null)
  public _subscribers: Function[] = []
  public _actionSubscribers: ActionSubscriber<S, S>[] = []
  public _scope: EffectScope | null = null
  public strict: boolean
  public _devtools?: boolean

  public _state: any
  public _committing: boolean = false
  public getters: any = {}

  constructor(options: StoreOptions<S> = {}) {
    const {
      plugins = [],
      strict = false,
      devtools,
    } = options

    this._modules = new ModuleCollection(options)
    this.strict = strict
    this._devtools = devtools

    // bind commit and dispatch to self
    const store = this
    const { dispatch, commit } = this
    this.dispatch = function boundDispatch(type: string, payload?: any) {
      return dispatch.call(store, type, payload)
    }
    this.commit = function boundCommit(type: string, payload?: any, options?: any) {
      return commit.call(store, type, payload, options)
    }

    // init root module.
    // this also recursively registers all sub-modules
    // and collects all module getters inside this._wrappedGetters
    const state = this._modules.root.state
    installModule(this, state, [], this._modules.root)

    // initialize the store state, which is responsible for the reactivity
    // (also registers _wrappedGetters as computed properties)
    resetStoreState(this, state)

    // apply plugins
    plugins.forEach(plugin => plugin(this as any))
  }

  get state(): S {
    return this._state
  }

  set state(v: S) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[vuex] use store.replaceState() to explicit replace store state.`)
    }
  }

  install(app: App, injectKey?: any) {
    app.provide(injectKey || storeKey, this)
    app.config.globalProperties.$store = this

    const devtools = __DEV__ || __VUE_PROD_DEVTOOLS__

    if (devtools) {
      useDevtools(app, this)
    }
  }

  commit(type: string | Record<string, any>, payload?: any, options?: any) {
    let mutation: any
    let typeStr: string

    if (isObject(type) && type.type) {
      options = payload
      payload = type
      typeStr = (type as any).type
    } else {
      typeStr = type as string
    }

    const entry = this._mutations[typeStr]
    if (!entry) {
      if (process.env.NODE_ENV !== 'production') {
        console.error(`[vuex] unknown mutation type: ${typeStr}`)
      }
      return
    }

    this._withCommit(() => {
      entry.forEach((handler) => {
        handler(payload)
      })
    })

    this._subscribers.slice().forEach(sub => sub(mutation || { type: typeStr, payload }, this.state))
  }

  dispatch(type: string | Record<string, any>, payload?: any): Promise<any> {
    let typeStr: string

    if (isObject(type) && type.type) {
      payload = type
      typeStr = (type as any).type
    } else {
      typeStr = type as string
    }

    const entry = this._actions[typeStr]
    if (!entry) {
      if (process.env.NODE_ENV !== 'production') {
        console.error(`[vuex] unknown action type: ${typeStr}`)
      }
      return Promise.resolve()
    }

    try {
      this._actionSubscribers
        .slice() // shallow copy to prevent iterator invalidation if subscriber unsubscribes itself
        .filter(sub => sub.before)
        .forEach(sub => sub.before?.({ type: typeStr, payload }, this.state))
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`[vuex] error in before action subscribers: `)
        console.error(e)
      }
    }

    const result = entry.length > 1
      ? Promise.all(entry.map(handler => handler(payload)))
      : entry[0](payload)

    return new Promise((resolve, reject) => {
      result.then((res: any) => {
        try {
          this._actionSubscribers
            .filter(sub => sub.after)
            .forEach(sub => sub.after?.({ type: typeStr, payload }, this.state))
        } catch (e) {
          if (process.env.NODE_ENV !== 'production') {
            console.warn(`[vuex] error in after action subscribers: `)
            console.error(e)
          }
        }
        resolve(res)
      }, (error: any) => {
        try {
          this._actionSubscribers
            .filter(sub => sub.error)
            .forEach(sub => sub.error?.({ type: typeStr, payload }, this.state, error))
        } catch (e) {
          if (process.env.NODE_ENV !== 'production') {
            console.warn(`[vuex] error in error action subscribers: `)
            console.error(e)
          }
        }
        reject(error)
      })
    })
  }

  subscribe(fn: Function, options?: any): Function {
    return genericSubscribe(fn, this._subscribers, options)
  }

  subscribeAction(fn: ActionSubscriber<S, S> | ((action: ActionPayload, state: S) => any), options?: any): Function {
    const subs = typeof fn === 'function' ? { before: fn } : fn
    return genericSubscribe(subs, this._actionSubscribers, options)
  }

  watch(getter: (state: S, getters: any) => any, cb: (value: any, oldValue: any) => void, options?: any): Function {
    return watch(() => getter(this.state, this.getters), cb, options)
  }

  replaceState(state: S) {
    this._withCommit(() => {
      this._state = reactive(state as any)
      resetStoreState(this, state)
    })
  }

  registerModule(path: string | string[], rawModule: RawModule<S>, options: any = {}) {
    if (typeof path === 'string')
      path = [path]

    if (process.env.NODE_ENV !== 'production') {
      assert(Array.isArray(path), `module path must be a string or an Array.`)
      assert(path.length > 0, 'cannot register the root module by using registerModule.')
    }

    this._modules.register(path, rawModule)
    installModule(this, this.state, path, this._modules.get(path)!, options.preserveState)
    // reset store to update getters/computed
    resetStoreState(this, this.state)
  }

  unregisterModule(path: string | string[]) {
    if (typeof path === 'string')
      path = [path]

    if (process.env.NODE_ENV !== 'production') {
      assert(Array.isArray(path), `module path must be a string or an Array.`)
    }

    this._modules.unregister(path)
    this._withCommit(() => {
      const parentState = getNestedState(this.state, path.slice(0, -1))
      delete parentState[path[path.length - 1]]
    })
    resetStore(this)
  }

  hasModule(path: string | string[]) {
    if (typeof path === 'string')
      path = [path]

    if (process.env.NODE_ENV !== 'production') {
      assert(Array.isArray(path), `module path must be a string or an Array.`)
    }

    return this._modules.isRegistered(path)
  }

  hotUpdate(newOptions: StoreOptions<S>) {
    this._modules.update(newOptions)
    resetStore(this, true)
  }

  _withCommit(fn: () => void) {
    const committing = this._committing
    this._committing = true
    fn()
    this._committing = committing
  }
}

function genericSubscribe(fn: Function | object, subs: any[], options?: any) {
  if (!subs.includes(fn)) {
    subs.push(fn)
  }
  return () => {
    const i = subs.indexOf(fn)
    if (i > -1) {
      subs.splice(i, 1)
    }
  }
}

function resetStoreState(store: Store<any>, state: any, hot = false) {
  const oldState = store._state
  const oldScope = store._scope

  // bind store public getters
  store.getters = {}
  store._scope = effectScope(true)

  // We make the state reactive
  store._state = reactive(state)

  // We need to make sure internal modules state references are updated if we replaced the state object?
  // In `installModule`, we assigned `parentState[moduleName] = module.state`.
  // If `state` is replaced, those links are broken in the NEW state.
  // We might need to re-install modules if state structure changed significantly,
  // but `replaceState` usually assumes same structure.
  // However, `module.state` is just the initial state.
  // The persistent state is `store._state`.
  // We need to sync `store._state` with `module.state`? No.

  store._scope.run(() => {
    forEachValue(store._wrappedGetters, (fn, key) => {
      // use computed for getters
      const calculated = computed(() => fn(store._state))
      Object.defineProperty(store.getters, key, {
        get: () => calculated.value,
        enumerable: true,
      })
    })
  })

  if (store.strict) {
    enableStrictMode(store)
  }

  if (oldState && hot) {
    // dispatch change?
  }

  if (oldScope) {
    oldScope.stop()
  }
}

function installModule(store: Store<any>, rootState: any, path: string[], module: Module<any, any>, hot = false) {
  const isRoot = !path.length
  const namespace = store._modules.getNamespace(path)

  // register in namespace map
  if (module.namespaced) {
    if (store._modulesNamespaceMap[namespace] && process.env.NODE_ENV !== 'production') {
      console.error(`[vuex] duplicate namespace ${namespace} for the namespaced module ${path.join('/')}`)
    }
    store._modulesNamespaceMap[namespace] = module
  }

  // set state
  if (!isRoot && !hot) {
    const parentState = getNestedState(rootState, path.slice(0, -1))
    const moduleName = path[path.length - 1]
    store._withCommit(() => {
      // Vue 3 reactive automatically handles new property addition?
      // Yes, if parentState is reactive.
      // But `rootState` passed here is the raw initial state object in the first run.
      // Wait, `this._modules.root.state` is raw object.
      // `resetStoreState` makes it reactive LATER.
      // So here we are just building the tree on the raw object.
      parentState[moduleName] = module.state
    })
  }

  const local = module.context = makeLocalContext(store, namespace, path) as any

  module.forEachMutation((mutation, key) => {
    const namespacedType = namespace + key
    registerMutation(store, namespacedType, mutation, local)
  })

  module.forEachAction((action, key) => {
    const type = (action as any).root ? key : namespace + key
    const handler = (action as any).handler || action
    registerAction(store, type, handler, local)
  })

  module.forEachGetter((getter, key) => {
    const namespacedType = namespace + key
    registerGetter(store, namespacedType, getter, local)
  })

  module.forEachChild((child, key) => {
    installModule(store, rootState, path.concat(key), child, hot)
  })
}

function makeLocalContext(store: Store<any>, namespace: string, path: string[]) {
  const noNamespace = namespace === ''

  const local = {
    dispatch: noNamespace
      ? store.dispatch
      : (_type: string, _payload: any, _options: any) => {
          const args = unifyObjectStyle(_type, _payload, _options)
          const { payload, options } = args
          let { type } = args

          if (!options || !options.root) {
            type = namespace + type
            if (process.env.NODE_ENV !== 'production' && !store._actions[type]) {
              console.error(`[vuex] unknown local action type: ${args.type}, global type: ${type}`)
              return
            }
          }

          return store.dispatch(type, payload)
        },

    commit: noNamespace
      ? store.commit
      : (_type: string, _payload: any, _options: any) => {
          const args = unifyObjectStyle(_type, _payload, _options)
          const { payload, options } = args
          let { type } = args

          if (!options || !options.root) {
            type = namespace + type
            if (process.env.NODE_ENV !== 'production' && !store._mutations[type]) {
              console.error(`[vuex] unknown local mutation type: ${args.type}, global type: ${type}`)
              return
            }
          }

          store.commit(type, payload, options)
        },
  }

  // getters and state object must be lazy because they will be changed by vm update
  Object.defineProperties(local, {
    getters: {
      get: noNamespace
        ? () => store.getters
        : () => makeLocalGetters(store, namespace),
    },
    state: {
      get: () => getNestedState(store.state, path),
    },
  })

  return local
}

function makeLocalGetters(store: Store<any>, namespace: string) {
  if (!store._modulesNamespaceMap[namespace]) {
    return {}
  }
  const splitPos = namespace.length
  const rawGetters = store.getters
  const localGetters = {}
  Object.keys(rawGetters).forEach((type) => {
    if (type.slice(0, splitPos) !== namespace)
      return
    const localType = type.slice(splitPos)
    Object.defineProperty(localGetters, localType, {
      get: () => rawGetters[type],
      enumerable: true,
    })
  })
  return localGetters
}

function registerMutation(store: Store<any>, type: string, handler: Function, local: any) {
  const entry = store._mutations[type] || (store._mutations[type] = [])
  entry.push((payload: any) => {
    handler.call(store, local.state, payload)
  })
}

function registerAction(store: Store<any>, type: string, handler: Function, local: any) {
  const entry = store._actions[type] || (store._actions[type] = [])
  entry.push((payload: any) => {
    let res = handler.call(store, {
      dispatch: local.dispatch,
      commit: local.commit,
      getters: local.getters,
      state: local.state,
      rootGetters: store.getters,
      rootState: store.state,
    }, payload)
    if (!isPromise(res)) {
      res = Promise.resolve(res)
    }
    return res
  })
}

function registerGetter(store: Store<any>, type: string, rawGetter: Function, local: any) {
  if (store._wrappedGetters[type]) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(`[vuex] duplicate getter key: ${type}`)
    }
    return
  }
  store._wrappedGetters[type] = function wrappedGetter(storeState: any) {
    return rawGetter(
      local.state, // local state
      local.getters, // local getters
      storeState, // root state
      store.getters, // root getters
    )
  }
}

function enableStrictMode(store: Store<any>) {
  watch(() => store._state, () => {
    if (process.env.NODE_ENV !== 'production' && !store._committing) {
      console.error(`[vuex] do not mutate vuex store state outside mutation handlers.`)
    }
  }, { deep: true, flush: 'sync' })
}

function getNestedState(state: any, path: string[]) {
  return path.reduce((state, key) => state[key], state)
}

function unifyObjectStyle(type: any, payload: any, options: any) {
  if (isObject(type) && (type as any).type) {
    options = payload
    payload = type
    type = (type as any).type
  }
  return { type, payload, options }
}

function resetStore(store: Store<any>, hot = false) {
  store._actions = Object.create(null)
  store._mutations = Object.create(null)
  store._wrappedGetters = Object.create(null)
  store._modulesNamespaceMap = Object.create(null)
  const state = store.state
  // init all modules
  installModule(store, state, [], store._modules.root, true)
  // reset vm
  resetStoreState(store, state, hot)
}
