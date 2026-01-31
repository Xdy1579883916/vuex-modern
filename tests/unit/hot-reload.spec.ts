import { describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import Vuex from '../../src/index'
import { mount } from '../helpers'

const TEST = 'TEST'
// const isSSR = process.env.VUE_ENV === 'server'
const isSSR = false

describe('hot Reload', () => {
  it('mutations', () => {
    const mutations = {
      [TEST](state: any, n: any) {
        state.a += n
      },
    }
    const store = new Vuex.Store({
      state: {
        a: 1,
      },
      mutations,
      modules: {
        nested: {
          state: { a: 2 },
          mutations,
          modules: {
            one: {
              state: { a: 3 },
              mutations,
            },
            nested: {
              modules: {
                two: {
                  state: { a: 4 },
                  mutations,
                },
                three: {
                  state: { a: 5 },
                  mutations,
                },
              },
            },
          },
        },
        four: {
          state: { a: 6 },
          mutations,
        },
      },
    })
    store.commit(TEST, 1)
    expect(store.state.a).toBe(2)
    expect((store.state as any).nested.a).toBe(3)
    expect((store.state as any).nested.one.a).toBe(4)
    expect((store.state as any).nested.nested.two.a).toBe(5)
    expect((store.state as any).nested.nested.three.a).toBe(6)
    expect((store.state as any).four.a).toBe(7)

    // hot reload only root mutations
    store.hotUpdate({
      mutations: {
        [TEST](state: any, n: any) {
          state.a = n
        },
      },
    })
    store.commit(TEST, 1)
    expect(store.state.a).toBe(1) // only root mutation updated
    expect((store.state as any).nested.a).toBe(4)
    expect((store.state as any).nested.one.a).toBe(5)
    expect((store.state as any).nested.nested.two.a).toBe(6)
    expect((store.state as any).nested.nested.three.a).toBe(7)
    expect((store.state as any).four.a).toBe(8)

    // hot reload modules
    store.hotUpdate({
      modules: {
        nested: {
          state: { a: 234 },
          mutations,
          modules: {
            one: {
              state: { a: 345 },
              mutations,
            },
            nested: {
              modules: {
                two: {
                  state: { a: 456 },
                  mutations,
                },
                three: {
                  state: { a: 567 },
                  mutations,
                },
              },
            },
          },
        },
        four: {
          state: { a: 678 },
          mutations,
        },
      },
    })
    store.commit(TEST, 2)
    expect(store.state.a).toBe(2)
    expect((store.state as any).nested.a).toBe(6) // should not reload initial state
    expect((store.state as any).nested.one.a).toBe(7) // should not reload initial state
    expect((store.state as any).nested.nested.two.a).toBe(8) // should not reload initial state
    expect((store.state as any).nested.nested.three.a).toBe(9) // should not reload initial state
    expect((store.state as any).four.a).toBe(10) // should not reload initial state

    // hot reload all
    store.hotUpdate({
      mutations: {
        [TEST](state: any, n: any) {
          state.a -= n
        },
      },
      modules: {
        nested: {
          state: { a: 234 },
          mutations: {
            [TEST](state: any, n: any) {
              state.a += n
            },
          },
          modules: {
            one: {
              state: { a: 345 },
              mutations: {
                [TEST](state: any, n: any) {
                  state.a += n
                },
              },
            },
            nested: {
              modules: {
                two: {
                  state: { a: 456 },
                  mutations: {
                    [TEST](state: any, n: any) {
                      state.a += n
                    },
                  },
                },
                three: {
                  state: { a: 567 },
                  mutations: {
                    [TEST](state: any, n: any) {
                      state.a -= n
                    },
                  },
                },
              },
            },
          },
        },
        four: {
          state: { a: 678 },
          mutations: {
            [TEST](state: any, n: any) {
              state.a -= n
            },
          },
        },
      },
    })
    store.commit(TEST, 3)
    expect(store.state.a).toBe(-1)
    expect((store.state as any).nested.a).toBe(9)
    expect((store.state as any).nested.one.a).toBe(10)
    expect((store.state as any).nested.nested.two.a).toBe(11)
    expect((store.state as any).nested.nested.three.a).toBe(6)
    expect((store.state as any).four.a).toBe(7)
  })

  it('actions', () => {
    const store = new Vuex.Store({
      state: {
        list: [],
      },
      mutations: {
        [TEST](state: any, n: any) {
          state.list.push(n)
        },
      },
      actions: {
        [TEST]({ commit }: any) {
          commit(TEST, 1)
        },
      },
      modules: {
        a: {
          actions: {
            [TEST]({ commit }: any) {
              commit(TEST, 2)
            },
          },
        },
      },
    })
    store.dispatch(TEST)
    expect(store.state.list.join()).toBe('1,2')

    // update root
    store.hotUpdate({
      actions: {
        [TEST]({ commit }: any) {
          commit(TEST, 3)
        },
      },
    })
    store.dispatch(TEST)
    expect(store.state.list.join()).toBe('1,2,3,2')

    // update modules
    store.hotUpdate({
      actions: {
        [TEST]({ commit }: any) {
          commit(TEST, 4)
        },
      },
      modules: {
        a: {
          actions: {
            [TEST]({ commit }: any) {
              commit(TEST, 5)
            },
          },
        },
      },
    })
    store.dispatch(TEST)
    expect(store.state.list.join()).toBe('1,2,3,2,4,5')
  })

  it('getters', async () => {
    const store = new Vuex.Store({
      state: {
        count: 0,
      },
      mutations: {
        inc: (state: any) => state.count++,
      },
      getters: {
        count: (state: any) => state.count,
      },
      actions: {
        check({ getters }: any, value: any) {
          expect(getters.count).toBe(value)
        },
      },
    })

    const spy = vi.fn()

    const vm = mount(store, {
      computed: {
        a: () => store.getters.count,
      },
      watch: {
        a: spy,
      },
    })

    expect((vm as any).a).toBe(0)
    store.dispatch('check', 0)

    store.commit('inc')

    expect((vm as any).a).toBe(1)
    store.dispatch('check', 1)

    // update getters
    store.hotUpdate({
      getters: {
        count: (state: any) => state.count * 10,
      },
    })

    expect((vm as any).a).toBe(10)
    store.dispatch('check', 10)

    if (isSSR) {
      // done()
    } else {
      await nextTick()
      expect(spy).toHaveBeenCalled()
    }
  })

  it('provide warning if a new module is given', () => {
    const store = new Vuex.Store({})

    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    store.hotUpdate({
      modules: {
        test: {
          state: {
            count: 0,
          },
        },
      },
    })

    expect(spy).toHaveBeenCalledWith(
      '[vuex] trying to add a new module \'test\' on hot reloading, '
      + 'manual reload is needed',
    )
    spy.mockRestore()
  })

  it('update namespace', () => {
    // prevent to print notification of unknown action/mutation
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const actionSpy = vi.fn()
    const mutationSpy = vi.fn()

    const store = new Vuex.Store({
      modules: {
        a: {
          namespaced: true,
          state: { value: 1 },
          getters: { foo: (state: any) => state.value },
          actions: { foo: actionSpy },
          mutations: { foo: mutationSpy },
        },
      },
    })

    expect(store.state.a.value).toBe(1)
    expect(store.getters['a/foo']).toBe(1)
    store.dispatch('a/foo')
    expect(actionSpy).toHaveBeenCalledTimes(1)
    store.commit('a/foo')
    expect(mutationSpy).toHaveBeenCalledTimes(1)

    store.hotUpdate({
      modules: {
        a: {
          namespaced: false,
        },
      },
    })

    expect(store.state.a.value).toBe(1)
    expect(store.getters['a/foo']).toBe(undefined) // removed
    expect(store.getters.foo).toBe(1) // renamed

    // should not be called
    store.dispatch('a/foo')
    expect(actionSpy).toHaveBeenCalledTimes(1)

    // should be called
    store.dispatch('foo')
    expect(actionSpy).toHaveBeenCalledTimes(2)

    // should not be called
    store.commit('a/foo')
    expect(mutationSpy).toHaveBeenCalledTimes(1)

    // should be called
    store.commit('foo')
    expect(mutationSpy).toHaveBeenCalledTimes(2)

    errorSpy.mockRestore()
  })
})
