import { describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { createStore } from '../src'

describe('store', () => {
  it('state reactivity', () => {
    const store = createStore({
      state: {
        count: 0,
      },
      mutations: {
        increment(state: any) {
          state.count++
        },
      },
    })
    expect(store.state.count).toBe(0)
    store.commit('increment')
    expect(store.state.count).toBe(1)
  })

  it('getters', () => {
    const store = createStore({
      state: {
        count: 0,
      },
      getters: {
        doubled: (state: any) => state.count * 2,
      },
      mutations: {
        increment(state: any) {
          state.count++
        },
      },
    })
    expect(store.getters.doubled).toBe(0)
    store.commit('increment')
    expect(store.getters.doubled).toBe(2)
  })

  it('actions', async () => {
    const store = createStore({
      state: {
        count: 0,
      },
      mutations: {
        increment(state: any) {
          state.count++
        },
      },
      actions: {
        incrementAsync({ commit }: any) {
          return new Promise((resolve) => {
            setTimeout(() => {
              commit('increment')
              resolve(true)
            }, 0)
          })
        },
      },
    })
    await store.dispatch('incrementAsync')
    expect(store.state.count).toBe(1)
  })

  it('modules', () => {
    const store = createStore({
      modules: {
        a: {
          state: {
            val: 1,
          },
          mutations: {
            incA(state: any) {
              state.val++
            },
          },
        },
      },
    })
    expect((store.state as any).a.val).toBe(1)
    store.commit('incA')
    expect((store.state as any).a.val).toBe(2)
  })

  it('namespaced modules', () => {
    const store = createStore({
      modules: {
        a: {
          namespaced: true,
          state: {
            val: 1,
          },
          mutations: {
            inc(state: any) {
              state.val++
            },
          },
          getters: {
            val: (state: any) => state.val,
          },
        },
      },
    })
    expect((store.state as any).a.val).toBe(1)
    expect(store.getters['a/val']).toBe(1)
    store.commit('a/inc')
    expect((store.state as any).a.val).toBe(2)
    expect(store.getters['a/val']).toBe(2)
  })

  it('nested modules', () => {
    const store = createStore({
      modules: {
        a: {
          namespaced: true,
          modules: {
            b: {
              namespaced: true,
              state: { val: 1 },
              mutations: {
                inc(state: any) {
                  state.val++
                },
              },
            },
          },
        },
      },
    })
    expect((store.state as any).a.b.val).toBe(1)
    store.commit('a/b/inc')
    expect((store.state as any).a.b.val).toBe(2)
  })

  it('subscribe', () => {
    const store = createStore({
      state: { count: 0 },
      mutations: {
        inc(state: any) {
          state.count++
        },
      },
    })
    const spy = vi.fn()
    store.subscribe(spy)
    store.commit('inc')
    expect(spy).toHaveBeenCalledWith(
      { type: 'inc', payload: undefined },
      store.state,
    )
  })

  it('plugins', () => {
    const spy = vi.fn()
    const plugin = (store: any) => {
      store.subscribe(spy)
    }
    const store = createStore({
      state: { count: 0 },
      mutations: { inc(state: any) {
        state.count++
      } },
      plugins: [plugin],
    })
    store.commit('inc')
    expect(spy).toHaveBeenCalled()
  })

  it('strict mode', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const store = createStore({
      strict: true,
      state: { count: 0 },
    })

    // Direct mutation
    store.state.count++

    await nextTick()

    expect(spy).toHaveBeenCalledWith(expect.stringContaining('do not mutate vuex store state outside mutation handlers'))
    spy.mockRestore()
  })
})
