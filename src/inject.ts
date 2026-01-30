import type { InjectionKey } from 'vue'
import { inject } from 'vue'

export const storeKey: InjectionKey<any> = Symbol('vuex')

export function useStore<S = any>(key: InjectionKey<S> | string | null = null): S {
  return inject(key !== null ? key : storeKey)!
}
