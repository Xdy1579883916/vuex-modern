import type { Store } from './store'

export function getField(state: any): (path: string) => any {
  return (path: string) => {
    return path.split('.').reduce((prev, key) => prev[key], state)
  }
}

export function updateField(state: any, { path, value }: { path: string, value: any }) {
  path.split('.').reduce((prev, key, index, array) => {
    if (index === array.length - 1) {
      prev[key] = value
    }
    return prev[key]
  }, state)
}

export function mapFields(namespace: string | any, fields?: any): any {
  if (typeof namespace !== 'string') {
    fields = namespace
    namespace = ''
  } else if (namespace.length > 0 && namespace.charAt(namespace.length - 1) !== '/') {
    namespace += '/'
  }

  const res: any = {}
  const fieldEntries = Array.isArray(fields)
    ? fields.map(key => [key, key])
    : Object.entries(fields)

  fieldEntries.forEach(([key, value]) => {
    res[key] = {
      get(this: any) {
        const store = this.$store as Store<any>
        const getterPath = `${namespace}getField`
        const getter = store.getters[getterPath]
        if (process.env.NODE_ENV !== 'production' && !getter) {
          console.warn(`[vuex-modern] mapFields: getter "${getterPath}" not found.`)
          return
        }
        return getter(value)
      },
      set(this: any, val: any) {
        const store = this.$store as Store<any>
        const mutationPath = `${namespace}updateField`
        store.commit(mutationPath, { path: value, value: val })
      },
    }
  })

  return res
}

export function createHelpers(namespace: string) {
  return {
    mapFields: mapFields.bind(null, namespace),
    getField,
    updateField,
  }
}
