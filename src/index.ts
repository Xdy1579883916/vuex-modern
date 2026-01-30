import type { StoreOptions } from './lib/store'
import { createNamespacedHelpers, mapActions, mapGetters, mapMutations, mapState } from './lib/helpers'
import { storeKey, useStore } from './lib/inject'
import { Store } from './lib/store'
import { Module } from './module/module'

export * from './lib/helpers'
export * from './lib/inject'
export * from './lib/map-fields'
export * from './lib/store'
export * from './module/module'

export function createStore<S>(options: StoreOptions<S>) {
  return new Store(options)
}

export default {
  Store,
  createStore,
  useStore,
  storeKey,
  mapState,
  mapMutations,
  mapGetters,
  mapActions,
  createNamespacedHelpers,
  Module,
}
