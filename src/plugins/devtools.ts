import type { Store } from '../lib/store'
import { setupDevtoolsPlugin } from '@vue/devtools-api'

const LABEL_VUEX_BINDINGS = 'vuex bindings'
const MUTATIONS_LAYER_ID = 'vuex:mutations'
const ACTIONS_LAYER_ID = 'vuex:actions'
const INSPECTOR_ID = 'vuex'

let actionId = 0

export function useDevtools(app: any, store: Store<any>) {
  setupDevtoolsPlugin(
    {
      id: 'org.vuejs.vuex',
      app,
      label: 'Vuex Modern',
      homepage: 'https://github.com/Xdy1579883916/vuex-modern',
      logo: 'https://vuejs.org/images/icons/favicon-96x96.png',
      packageName: 'vuex',
      componentStateTypes: [LABEL_VUEX_BINDINGS],
    },
    (api) => {
      api.addTimelineLayer({
        id: MUTATIONS_LAYER_ID,
        label: 'Vuex Mutations',
        color: COLOR_LIME_500,
      })

      api.addTimelineLayer({
        id: ACTIONS_LAYER_ID,
        label: 'Vuex Actions',
        color: COLOR_LIME_500,
      })

      api.addInspector({
        id: INSPECTOR_ID,
        label: 'Vuex Modern',
        icon: 'storage',
        treeFilterPlaceholder: 'Filter stores...',
      })

      api.on.getInspectorTree((payload) => {
        if (payload.app === app && payload.inspectorId === INSPECTOR_ID) {
          if (payload.filter) {
            const nodes: any[] = []
            flattenStoreForInspectorTree(nodes, store._modules.root, payload.filter, '')
            payload.rootNodes = nodes
          } else {
            payload.rootNodes = [
              formatStoreForInspectorTree(store._modules.root, ''),
            ]
          }
        }
      })

      api.on.getInspectorState((payload) => {
        if (payload.app === app && payload.inspectorId === INSPECTOR_ID) {
          const modulePath = payload.nodeId
          const pathArray = modulePath === 'root' ? [] : modulePath.split('/').filter(Boolean)
          const module = store._modules.get(pathArray)

          if (module) {
            // Simulate makeLocalGetters logic
            const namespace = store._modules.getNamespace(pathArray)
            const localGetters = getModuleGetters(store, namespace)

            payload.state = formatStoreForInspectorState(
              module,
              store, // Pass store
              localGetters,
              modulePath,
            )
          }
        }
      })

      api.on.editInspectorState((payload) => {
        if (payload.app === app && payload.inspectorId === INSPECTOR_ID) {
          const modulePath = payload.nodeId
          let path = payload.path
          if (modulePath !== 'root') {
            path = [...modulePath.split('/').filter(Boolean), ...path]
          }
          store._withCommit(() => {
            payload.set(store._state.data, path, payload.state.value)
          })
        }
      })

      store.subscribe((mutation: any, state: any) => {
        const data: any = {}

        if (mutation.payload) {
          data.payload = mutation.payload
        }

        data.state = state

        api.notifyComponentUpdate()
        api.sendInspectorTree(INSPECTOR_ID)
        api.sendInspectorState(INSPECTOR_ID)

        api.addTimelineEvent({
          layerId: MUTATIONS_LAYER_ID,
          event: {
            time: Date.now(),
            title: mutation.type,
            data,
          },
        })
      })

      store.subscribeAction({
        before: (action: any, state: any) => {
          const data: any = {}
          if (action.payload) {
            data.payload = action.payload
          }
          action._id = actionId++
          action._time = Date.now()
          data.state = state

          api.addTimelineEvent({
            layerId: ACTIONS_LAYER_ID,
            event: {
              time: action._time,
              title: action.type,
              groupId: action._id,
              subtitle: 'start',
              data,
            },
          })
        },
        after: (action: any, state: any) => {
          const data: any = {}
          const duration = Date.now() - action._time
          data.duration = {
            _custom: {
              type: 'duration',
              display: `${duration}ms`,
              tooltip: 'Action duration',
              value: duration,
            },
          }
          if (action.payload) {
            data.payload = action.payload
          }
          data.state = state

          api.addTimelineEvent({
            layerId: ACTIONS_LAYER_ID,
            event: {
              time: Date.now(),
              title: action.type,
              groupId: action._id,
              subtitle: 'end',
              data,
            },
          })
        },
      })
    },
  )
}

// extracted from tailwind palette
const COLOR_LIME_500 = 0x84CC16
const COLOR_DARK = 0x666666
const COLOR_WHITE = 0xFFFFFF

const TAG_NAMESPACED = {
  label: 'namespaced',
  textColor: COLOR_WHITE,
  backgroundColor: COLOR_DARK,
}

function extractNameFromPath(path: string) {
  return path && path !== 'root' ? path.split('/').slice(-2, -1)[0] : 'Root'
}

function formatStoreForInspectorTree(module: any, path: string): any {
  return {
    id: path || 'root',
    // all modules end with a `/`, we want the last segment only
    // cart/ -> cart
    // nested/cart/ -> cart
    label: extractNameFromPath(path),
    tags: module.namespaced ? [TAG_NAMESPACED] : [],
    children: Object.keys(module._children).map(moduleName =>
      formatStoreForInspectorTree(
        module._children[moduleName],
        `${path + moduleName}/`,
      ),
    ),
  }
}

function flattenStoreForInspectorTree(result: any[], module: any, filter: string, path: string) {
  if (path.includes(filter)) {
    result.push({
      id: path || 'root',
      label: path.endsWith('/') ? path.slice(0, path.length - 1) : path || 'Root',
      tags: module.namespaced ? [TAG_NAMESPACED] : [],
    })
  }
  Object.keys(module._children).forEach((moduleName) => {
    flattenStoreForInspectorTree(result, module._children[moduleName], filter, `${path + moduleName}/`)
  })
}

function formatStoreForInspectorState(module: any, store: Store<any>, getters: any, path: string): any {
  const gettersKeys = Object.keys(getters)
  // Resolve real state from store.state using path
  // path is 'root', 'cart', 'nested/cart' etc.
  let realState = store.state
  if (path !== 'root') {
    const keys = path.split('/').filter(Boolean)
    for (const key of keys) {
      if (realState)
        realState = realState[key]
    }
  }

  const storeState: any = {
    state: Object.keys(realState || module.state).map(key => ({ // Fallback to module.state if traversal fails, but realState should be correct
      key,
      editable: true,
      value: (realState || module.state)[key],
    })),
  }

  if (gettersKeys.length) {
    const tree = PcToObjectTree(getters)
    storeState.getters = Object.keys(tree).map(key => ({
      key: key.endsWith('/') ? extractNameFromPath(key) : key,
      editable: false,
      value: canThrow(() => tree[key]),
    }))
  }

  return storeState
}

function PcToObjectTree(getters: any) {
  const result: any = {}
  Object.keys(getters).forEach((key) => {
    const path = key.split('/')
    if (path.length > 1) {
      let target = result
      const leafKey = path.pop()!
      path.forEach((p) => {
        if (!target[p]) {
          target[p] = {
            _custom: {
              value: {},
              display: p,
              tooltip: 'Module',
              abstract: true,
            },
          }
        }
        target = target[p]._custom.value
      })
      target[leafKey] = canThrow(() => getters[key])
    } else {
      result[key] = canThrow(() => getters[key])
    }
  })
  return result
}

function canThrow(cb: () => any) {
  try {
    return cb()
  } catch (e) {
    return e
  }
}

function getModuleGetters(store: Store<any>, namespace: string) {
  if (!namespace)
    return store.getters
  const getters: any = {}
  const len = namespace.length
  Object.keys(store.getters).forEach((key) => {
    if (key.startsWith(namespace)) {
      const localKey = key.slice(len)
      getters[localKey] = store.getters[key]
    }
  })
  return getters
}
