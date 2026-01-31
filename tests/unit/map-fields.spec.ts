import { describe, expect, it } from 'vitest'
import { createHelpers, createStore, getField, mapFields, mapMultiRowFields, updateField } from '../../src/index'
import { mount } from '../helpers'

describe('mapFields', () => {
  it('should get and set field', () => {
    const store = createStore({
      state: {
        fieldA: 'a',
        fieldB: 'b',
      },
      getters: {
        getField,
      },
      mutations: {
        updateField,
      },
    })

    const vm = mount(store, {
      computed: {
        ...mapFields(['fieldA', 'fieldB']),
      },
    }) as any

    expect(vm.fieldA).toBe('a')
    expect(vm.fieldB).toBe('b')

    vm.fieldA = 'new a'
    expect(store.state.fieldA).toBe('new a')
    expect(vm.fieldA).toBe('new a')
  })

  it('should handle nested fields', () => {
    const store = createStore({
      state: {
        user: {
          name: 'John',
          email: 'john@example.com',
        },
      },
      getters: {
        getField,
      },
      mutations: {
        updateField,
      },
    })

    const vm = mount(store, {
      computed: {
        ...mapFields(['user.name']),
      },
    }) as any

    expect(vm.name).toBe('John')

    vm.name = 'Doe'
    expect(store.state.user.name).toBe('Doe')
  })

  it('should support renaming with object syntax', () => {
    const store = createStore({
      state: {
        user: {
          name: 'John',
        },
      },
      getters: {
        getField,
      },
      mutations: {
        updateField,
      },
    })

    const vm = mount(store, {
      computed: {
        ...mapFields({
          userName: 'user.name',
        }),
      },
    }) as any

    expect(vm.userName).toBe('John')
    vm.userName = 'Doe'
    expect(store.state.user.name).toBe('Doe')
  })

  it('should work with namespaced modules', () => {
    const store = createStore({
      modules: {
        foo: {
          namespaced: true,
          state: {
            field: 'foo',
          },
          getters: {
            getField,
          },
          mutations: {
            updateField,
          },
        },
      },
    })

    const vm = mount(store, {
      computed: {
        ...mapFields('foo', ['field']),
      },
    }) as any

    expect(vm.field).toBe('foo')
    vm.field = 'bar'
    expect((store as any).state.foo.field).toBe('bar')
  })

  it('should work with namespaced modules (slash)', () => {
    const store = createStore({
      modules: {
        foo: {
          namespaced: true,
          state: {
            field: 'foo',
          },
          getters: {
            getField,
          },
          mutations: {
            updateField,
          },
        },
      },
    })

    const vm = mount(store, {
      computed: {
        ...mapFields('foo/', ['field']),
      },
    }) as any

    expect(vm.field).toBe('foo')
    vm.field = 'bar'
    expect((store as any).state.foo.field).toBe('bar')
  })

  it('should work with multi-row fields', () => {
    const store = createStore({
      state: {
        users: [
          { name: 'John', email: 'john@example.com' },
          { name: 'Jane', email: 'jane@example.com' },
        ],
      },
      getters: {
        getField,
      },
      mutations: {
        updateField,
      },
    })

    const vm = mount(store, {
      computed: {
        ...mapMultiRowFields(['users']),
      },
    }) as any

    expect(vm.users[0].name).toBe('John')
    expect(vm.users[1].email).toBe('jane@example.com')

    vm.users[0].name = 'Doe'
    expect(store.state.users[0].name).toBe('Doe')

    vm.users[1].email = 'doe@example.com'
    expect(store.state.users[1].email).toBe('doe@example.com')
  })

  it('should work with createHelpers', () => {
    const { mapFields: mapFieldsCustom } = createHelpers({
      getterType: 'getFoo',
      mutationType: 'updateFoo',
    })

    const store = createStore({
      state: {
        foo: 'bar',
      },
      getters: {
        getFoo: getField,
      },
      mutations: {
        updateFoo: updateField,
      },
    })

    const vm = mount(store, {
      computed: {
        ...mapFieldsCustom(['foo']),
      },
    }) as any

    expect(vm.foo).toBe('bar')
    vm.foo = 'baz'
    expect(store.state.foo).toBe('baz')
  })

  it('should work with createHelpers and namespace', () => {
    const { mapFields: mapFieldsCustom } = createHelpers({
      getterType: 'getFoo',
      mutationType: 'updateFoo',
    })

    const store = createStore({
      modules: {
        foo: {
          namespaced: true,
          state: {
            bar: 'baz',
          },
          getters: {
            getFoo: getField,
          },
          mutations: {
            updateFoo: updateField,
          },
        },
      },
    })

    const vm = mount(store, {
      computed: {
        ...mapFieldsCustom('foo', ['bar']),
      },
    }) as any

    expect(vm.bar).toBe('baz')
    vm.bar = 'qux'
    expect((store as any).state.foo.bar).toBe('qux')
  })
})
