import { describe, expect, it, vi } from 'vitest'
import Vuex, { createNamespacedHelpers, mapActions, mapGetters, mapMutations, mapState } from '../../src/index'
import { mount } from '../helpers'

describe('helpers', () => {
  it('mapState (array)', () => {
    const store = new Vuex.Store({
      state: {
        a: 1,
      },
    })
    const vm = mount(store, {
      computed: mapState(['a']),
    })
    expect((vm as any).a).toBe(1)
    store.state.a++
    expect((vm as any).a).toBe(2)
  })

  it('mapState (object)', () => {
    const store = new Vuex.Store({
      state: {
        a: 1,
      },
      getters: {
        b: () => 2,
      },
    })
    const vm = mount(store, {
      computed: mapState({
        a: (state: any, getters: any) => {
          return state.a + getters.b
        },
      }),
    })
    expect((vm as any).a).toBe(3)
    store.state.a++
    expect((vm as any).a).toBe(4)
  })

  it('mapState (with namespace)', () => {
    const store = new Vuex.Store({
      modules: {
        foo: {
          namespaced: true,
          state: { a: 1 },
          getters: {
            b: (state: any) => state.a + 1,
          },
        },
      },
    })
    const vm = mount(store, {
      computed: mapState('foo', {
        a: (state: any, getters: any) => {
          return state.a + getters.b
        },
      }),
    })
    expect((vm as any).a).toBe(3)
    store.state.foo.a++
    expect((vm as any).a).toBe(5)
    store.replaceState({
      foo: { a: 3 },
    })
    expect((vm as any).a).toBe(7)
  })

  // #708
  it('mapState (with namespace and a nested module)', () => {
    const store = new Vuex.Store({
      modules: {
        foo: {
          namespaced: true,
          state: { a: 1 },
          modules: {
            bar: {
              state: { b: 2 },
            },
          },
        },
      },
    })
    const vm = mount(store, {
      computed: mapState('foo', {
        value: (state: any) => state,
      }),
    })
    expect((vm as any).value.a).toBe(1)
    expect((vm as any).value.bar.b).toBe(2)
    expect((vm as any).value.b).toBeUndefined()
  })

  it('mapState (with undefined states)', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const store = new Vuex.Store({
      modules: {
        foo: {
          namespaced: true,
          state: { a: 1 },
        },
      },
    })
    const vm = mount(store, {
      computed: mapState('foo'),
    })
    expect((vm as any).a).toBeUndefined()
    expect(spy).toHaveBeenCalledWith('[vuex] mapState: mapper parameter must be either an Array or an Object')
    spy.mockRestore()
  })

  it('mapMutations (array)', () => {
    const store = new Vuex.Store({
      state: { count: 0 },
      mutations: {
        inc: (state: any) => state.count++,
        dec: (state: any) => state.count--,
      },
    })
    const vm = mount(store, {
      methods: mapMutations(['inc', 'dec']),
    })
    ;(vm as any).inc()
    expect(store.state.count).toBe(1)
    ;(vm as any).dec()
    expect(store.state.count).toBe(0)
  })

  it('mapMutations (object)', () => {
    const store = new Vuex.Store({
      state: { count: 0 },
      mutations: {
        inc: (state: any) => state.count++,
        dec: (state: any) => state.count--,
      },
    })
    const vm = mount(store, {
      methods: mapMutations({
        plus: 'inc',
        minus: 'dec',
      }),
    })
    ;(vm as any).plus()
    expect(store.state.count).toBe(1)
    ;(vm as any).minus()
    expect(store.state.count).toBe(0)
  })

  it('mapMutations (function)', () => {
    const store = new Vuex.Store({
      state: { count: 0 },
      mutations: {
        inc(state: any, amount: any) {
          state.count += amount
        },
      },
    })
    const vm = mount(store, {
      methods: mapMutations({
        plus(commit: any, amount: any) {
          commit('inc', amount + 1)
        },
      }),
    })
    ;(vm as any).plus(42)
    expect(store.state.count).toBe(43)
  })

  it('mapMutations (with namespace)', () => {
    const store = new Vuex.Store({
      modules: {
        foo: {
          namespaced: true,
          state: { count: 0 },
          mutations: {
            inc: (state: any) => state.count++,
            dec: (state: any) => state.count--,
          },
        },
      },
    })
    const vm = mount(store, {
      methods: mapMutations('foo', {
        plus: 'inc',
        minus: 'dec',
      }),
    })
    ;(vm as any).plus()
    expect(store.state.foo.count).toBe(1)
    ;(vm as any).minus()
    expect(store.state.foo.count).toBe(0)
  })

  it('mapMutations (function with namepsace)', () => {
    const store = new Vuex.Store({
      modules: {
        foo: {
          namespaced: true,
          state: { count: 0 },
          mutations: {
            inc(state: any, amount: any) {
              state.count += amount
            },
          },
        },
      },
    })
    const vm = mount(store, {
      methods: mapMutations('foo', {
        plus(commit: any, amount: any) {
          commit('inc', amount + 1)
        },
      }),
    })
    ;(vm as any).plus(42)
    expect(store.state.foo.count).toBe(43)
  })

  it('mapMutations (with undefined mutations)', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const store = new Vuex.Store({
      modules: {
        foo: {
          namespaced: true,
          state: { count: 0 },
          mutations: {
            inc: (state: any) => state.count++,
            dec: (state: any) => state.count--,
          },
        },
      },
    })
    const vm = mount(store, {
      methods: mapMutations('foo'),
    })
    expect((vm as any).inc).toBeUndefined()
    expect((vm as any).dec).toBeUndefined()
    expect(spy).toHaveBeenCalledWith('[vuex] mapMutations: mapper parameter must be either an Array or an Object')
    spy.mockRestore()
  })

  it('mapGetters (array)', () => {
    const store = new Vuex.Store({
      state: { count: 0 },
      mutations: {
        inc: (state: any) => state.count++,
        dec: (state: any) => state.count--,
      },
      getters: {
        hasAny: ({ count }: any) => count > 0,
        negative: ({ count }: any) => count < 0,
      },
    })
    const vm = mount(store, {
      computed: mapGetters(['hasAny', 'negative']),
    })
    expect((vm as any).hasAny).toBe(false)
    expect((vm as any).negative).toBe(false)
    store.commit('inc')
    expect((vm as any).hasAny).toBe(true)
    expect((vm as any).negative).toBe(false)
    store.commit('dec')
    store.commit('dec')
    expect((vm as any).hasAny).toBe(false)
    expect((vm as any).negative).toBe(true)
  })

  it('mapGetters (object)', () => {
    const store = new Vuex.Store({
      state: { count: 0 },
      mutations: {
        inc: (state: any) => state.count++,
        dec: (state: any) => state.count--,
      },
      getters: {
        hasAny: ({ count }: any) => count > 0,
        negative: ({ count }: any) => count < 0,
      },
    })
    const vm = mount(store, {
      computed: mapGetters({
        a: 'hasAny',
        b: 'negative',
      }),
    })
    expect((vm as any).a).toBe(false)
    expect((vm as any).b).toBe(false)
    store.commit('inc')
    expect((vm as any).a).toBe(true)
    expect((vm as any).b).toBe(false)
    store.commit('dec')
    store.commit('dec')
    expect((vm as any).a).toBe(false)
    expect((vm as any).b).toBe(true)
  })

  it('mapGetters (with namespace)', () => {
    const store = new Vuex.Store({
      modules: {
        foo: {
          namespaced: true,
          state: { count: 0 },
          mutations: {
            inc: (state: any) => state.count++,
            dec: (state: any) => state.count--,
          },
          getters: {
            hasAny: ({ count }: any) => count > 0,
            negative: ({ count }: any) => count < 0,
          },
        },
      },
    })
    const vm = mount(store, {
      computed: mapGetters('foo', {
        a: 'hasAny',
        b: 'negative',
      }),
    })
    expect((vm as any).a).toBe(false)
    expect((vm as any).b).toBe(false)
    store.commit('foo/inc')
    expect((vm as any).a).toBe(true)
    expect((vm as any).b).toBe(false)
    store.commit('foo/dec')
    store.commit('foo/dec')
    expect((vm as any).a).toBe(false)
    expect((vm as any).b).toBe(true)
  })

  it('mapGetters (with namespace and nested module)', () => {
    const store = new Vuex.Store({
      modules: {
        foo: {
          namespaced: true,
          modules: {
            bar: {
              namespaced: true,
              state: { count: 0 },
              mutations: {
                inc: (state: any) => state.count++,
                dec: (state: any) => state.count--,
              },
              getters: {
                hasAny: ({ count }: any) => count > 0,
                negative: ({ count }: any) => count < 0,
              },
            },
            cat: {
              state: { count: 9 },
              getters: {
                count: ({ count }: any) => count,
              },
            },
          },
        },
      },
    })
    const vm = mount(store, {
      computed: {
        ...mapGetters('foo/bar', [
          'hasAny',
          'negative',
        ]),
        ...mapGetters('foo', [
          'count',
        ]),
      },
    })
    expect((vm as any).hasAny).toBe(false)
    expect((vm as any).negative).toBe(false)
    store.commit('foo/bar/inc')
    expect((vm as any).hasAny).toBe(true)
    expect((vm as any).negative).toBe(false)
    store.commit('foo/bar/dec')
    store.commit('foo/bar/dec')
    expect((vm as any).hasAny).toBe(false)
    expect((vm as any).negative).toBe(true)

    expect((vm as any).count).toBe(9)
  })

  it('mapGetters (with undefined getters)', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const store = new Vuex.Store({
      modules: {
        foo: {
          namespaced: true,
          state: { count: 0 },
          mutations: {
            inc: (state: any) => state.count++,
            dec: (state: any) => state.count--,
          },
          getters: {
            hasAny: ({ count }: any) => count > 0,
            negative: ({ count }: any) => count < 0,
          },
        },
      },
    })
    const vm = mount(store, {
      computed: mapGetters('foo'),
    })
    expect((vm as any).a).toBeUndefined()
    expect((vm as any).b).toBeUndefined()
    expect(spy).toHaveBeenCalledWith('[vuex] mapGetters: mapper parameter must be either an Array or an Object')
    spy.mockRestore()
  })

  it('mapActions (array)', () => {
    const a = vi.fn()
    const b = vi.fn()
    const store = new Vuex.Store({
      actions: {
        a,
        b,
      },
    })
    const vm = mount(store, {
      methods: mapActions(['a', 'b']),
    })
    ;(vm as any).a()
    expect(a).toHaveBeenCalled()
    expect(b).not.toHaveBeenCalled()
    ;(vm as any).b()
    expect(b).toHaveBeenCalled()
  })

  it('mapActions (object)', () => {
    const a = vi.fn()
    const b = vi.fn()
    const store = new Vuex.Store({
      actions: {
        a,
        b,
      },
    })
    const vm = mount(store, {
      methods: mapActions({
        foo: 'a',
        bar: 'b',
      }),
    })
    ;(vm as any).foo()
    expect(a).toHaveBeenCalled()
    expect(b).not.toHaveBeenCalled()
    ;(vm as any).bar()
    expect(b).toHaveBeenCalled()
  })

  it('mapActions (function)', () => {
    const a = vi.fn()
    const store = new Vuex.Store({
      actions: { a },
    })
    const vm = mount(store, {
      methods: mapActions({
        foo(dispatch: any, arg: any) {
          dispatch('a', `${arg}bar`)
        },
      }),
    })
    ;(vm as any).foo('foo')
    expect(a.mock.calls[0][1]).toBe('foobar')
  })

  it('mapActions (with namespace)', () => {
    const a = vi.fn()
    const b = vi.fn()
    const store = new Vuex.Store({
      modules: {
        foo: {
          namespaced: true,
          actions: {
            a,
            b,
          },
        },
      },
    })
    const vm = mount(store, {
      methods: mapActions('foo/', {
        foo: 'a',
        bar: 'b',
      }),
    })
    ;(vm as any).foo()
    expect(a).toHaveBeenCalled()
    expect(b).not.toHaveBeenCalled()
    ;(vm as any).bar()
    expect(b).toHaveBeenCalled()
  })

  it('mapActions (function with namespace)', () => {
    const a = vi.fn()
    const store = new Vuex.Store({
      modules: {
        foo: {
          namespaced: true,
          actions: { a },
        },
      },
    })
    const vm = mount(store, {
      methods: mapActions('foo/', {
        foo(dispatch: any, arg: any) {
          dispatch('a', `${arg}bar`)
        },
      }),
    })
    ;(vm as any).foo('foo')
    expect(a.mock.calls[0][1]).toBe('foobar')
  })

  it('mapActions (with undefined actions)', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const a = vi.fn()
    const store = new Vuex.Store({
      modules: {
        foo: {
          namespaced: true,
          actions: {
            a,
          },
        },
      },
    })
    const vm = mount(store, {
      methods: mapActions('foo/'),
    })
    expect((vm as any).a).toBeUndefined()
    expect(a).not.toHaveBeenCalled()
    expect(spy).toHaveBeenCalledWith('[vuex] mapActions: mapper parameter must be either an Array or an Object')
    spy.mockRestore()
  })

  it('createNamespacedHelpers', () => {
    const actionA = vi.fn()
    const actionB = vi.fn()
    const store = new Vuex.Store({
      modules: {
        foo: {
          namespaced: true,
          state: { count: 0 },
          getters: {
            isEven: (state: any) => state.count % 2 === 0,
          },
          mutations: {
            inc: (state: any) => state.count++,
            dec: (state: any) => state.count--,
          },
          actions: {
            actionA,
            actionB,
          },
        },
      },
    })
    const {
      mapState,
      mapGetters,
      mapMutations,
      mapActions,
    } = createNamespacedHelpers('foo/')
    const vm = mount(store, {
      computed: {
        ...mapState(['count']),
        ...mapGetters(['isEven']),
      },
      methods: {
        ...mapMutations(['inc', 'dec']),
        ...mapActions(['actionA', 'actionB']),
      },
    })
    expect((vm as any).count).toBe(0)
    expect((vm as any).isEven).toBe(true)
    store.state.foo.count++
    expect((vm as any).count).toBe(1)
    expect((vm as any).isEven).toBe(false)
    ;(vm as any).inc()
    expect(store.state.foo.count).toBe(2)
    expect(store.getters['foo/isEven']).toBe(true)
    ;(vm as any).dec()
    expect(store.state.foo.count).toBe(1)
    expect(store.getters['foo/isEven']).toBe(false)
    ;(vm as any).actionA()
    expect(actionA).toHaveBeenCalled()
    expect(actionB).not.toHaveBeenCalled()
    ;(vm as any).actionB()
    expect(actionB).toHaveBeenCalled()
  })
})
