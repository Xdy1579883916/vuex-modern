import type { ActionContext } from '../lib/store'
import { forEachValue } from '../lib/util'

// Base type for the raw module shape provided by user
export interface RawModule<S = any, R = any> {
  namespaced?: boolean
  state?: S | (() => S)
  getters?: Record<string, (state: S, getters: any, rootState: R, rootGetters: any) => any>
  actions?: Record<string, Function>
  mutations?: Record<string, Function>
  modules?: Record<string, RawModule>
  [key: string]: any
}

export class Module<S, R> {
  public runtime: boolean
  public _children: Record<string, Module<any, R>>
  public _rawModule: RawModule<S, R>
  public state: S
  public context!: ActionContext<S, R>

  constructor(rawModule: RawModule<S, R>, runtime = false) {
    this.runtime = runtime
    this._children = Object.create(null)
    this._rawModule = rawModule
    const rawState = rawModule.state

    // Initialize state - 修复类型错误
    if (typeof rawState === 'function') {
      this.state = (rawState as () => S)()
    } else {
      this.state = rawState || ({} as S)
    }
  }

  get namespaced(): boolean {
    return !!this._rawModule.namespaced
  }

  addChild(key: string, module: Module<any, R>): void {
    this._children[key] = module
  }

  removeChild(key: string): void {
    delete this._children[key]
  }

  getChild(key: string): Module<any, R> | undefined {
    return this._children[key]
  }

  hasChild(key: string): boolean {
    return key in this._children
  }

  update(rawModule: RawModule<S, R>): void {
    this._rawModule.namespaced = rawModule.namespaced
    if (rawModule.actions) {
      this._rawModule.actions = rawModule.actions
    }
    if (rawModule.mutations) {
      this._rawModule.mutations = rawModule.mutations
    }
    if (rawModule.getters) {
      this._rawModule.getters = rawModule.getters
    }
  }

  forEachChild(fn: (child: Module<any, R>, key: string) => void): void {
    forEachValue(this._children, fn)
  }

  forEachGetter(fn: (getter: Function, key: string) => void): void {
    if (this._rawModule.getters) {
      forEachValue(this._rawModule.getters, fn)
    }
  }

  forEachAction(fn: (action: Function, key: string) => void): void {
    if (this._rawModule.actions) {
      forEachValue(this._rawModule.actions, fn)
    }
  }

  forEachMutation(fn: (mutation: Function, key: string) => void): void {
    if (this._rawModule.mutations) {
      forEachValue(this._rawModule.mutations, fn)
    }
  }
}
