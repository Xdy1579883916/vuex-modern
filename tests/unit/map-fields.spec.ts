import { describe, it, expect } from 'vitest'
import { createStore, getField, updateField, mapFields } from '../../src/index'
import { mount } from '../helpers'
import { reactive } from 'vue'

describe('mapFields', () => {
  it('should get and set field', () => {
    const store = createStore({
      state: {
        fieldA: 'a',
        fieldB: 'b'
      },
      getters: {
        getField
      },
      mutations: {
        updateField
      }
    })

    const vm = mount(store, {
      computed: {
        ...mapFields(['fieldA', 'fieldB'])
      }
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
          email: 'john@example.com'
        }
      },
      getters: {
        getField
      },
      mutations: {
        updateField
      }
    })

    const vm = mount(store, {
      computed: {
        ...mapFields(['user.name'])
      }
    }) as any

    expect(vm['user.name']).toBe('John') // Wait, mapFields array uses path as key?

    // mapFields(['user.name']) creates computed property "user.name" which is invalid JS identifier for this access?
    // Actually standard mapFields behavior: 
    // If array ['field'], key is 'field'.
    // If array ['a.b'], key is 'a.b'? 
    // vuex-map-fields documentation says:
    // mapFields(['user.firstName']) -> computed['user.firstName']? No, usually not.
    // Usually you use object syntax for renaming: mapFields({ firstName: 'user.firstName' })
    // Let's check array behavior implementation in my code:
    // fields.map(key => [key, key]) -> key is 'user.name'.
    // So vm['user.name'] is correct.
    
    vm['user.name'] = 'Doe'
    expect(store.state.user.name).toBe('Doe')
  })

  it('should support renaming with object syntax', () => {
    const store = createStore({
      state: {
        user: {
          name: 'John'
        }
      },
      getters: {
        getField
      },
      mutations: {
        updateField
      }
    })

    const vm = mount(store, {
      computed: {
        ...mapFields({
          userName: 'user.name'
        })
      }
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
            field: 'foo'
          },
          getters: {
            getField
          },
          mutations: {
            updateField
          }
        }
      }
    })

    const vm = mount(store, {
      computed: {
        ...mapFields('foo', ['field'])
      }
    }) as any

    expect(vm.field).toBe('foo')
    vm.field = 'bar'
    expect(store.state.foo.field).toBe('bar')
  })
})
