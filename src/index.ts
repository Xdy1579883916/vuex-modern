import type { StoreOptions } from './store'
import { createNamespacedHelpers, mapActions, mapGetters, mapMutations, mapState } from './helpers'
import { storeKey, useStore } from './inject'
import { Module } from './module/module'
import { Store } from './store'

export * from './helpers'
export * from './inject'
export * from './module/module'
export * from './map-fields'
export * from './store'

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
