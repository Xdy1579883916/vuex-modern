import type { Store } from './store'

function arrayToObject(fields: string[] = []): Record<string, string> {
  return fields.reduce((prev, path) => {
    const key = path.split('.').slice(-1)[0]

    if (prev[key]) {
      throw new Error(`The key \`${key}\` is already in use.`)
    }

    prev[key] = path

    return prev
  }, {} as Record<string, string>)
}

function normalizeNamespace(fn: Function) {
  return (...params: any[]) => {
    let [namespace, map, getterType, mutationType] = typeof params[0] === 'string'
      ? [...params]
      : ['', ...params]

    if (namespace.length && namespace.charAt(namespace.length - 1) !== '/') {
      namespace += '/'
    }

    getterType = `${namespace}${getterType || 'getField'}`
    mutationType = `${namespace}${mutationType || 'updateField'}`

    return fn(namespace, map, getterType, mutationType)
  }
}

export function getField(state: any): (path: string) => any {
  return (path: string) => {
    return path.split(/[.[\]]+/).reduce((prev, key) => prev[key], state)
  }
}

export function updateField(state: any, { path, value }: { path: string, value: any }) {
  path.split(/[.[\]]+/).reduce((prev, key, index, array) => {
    if (index === array.length - 1) {
      prev[key] = value
    }
    return prev[key]
  }, state)
}

export const mapFields = normalizeNamespace((namespace: string, fields: any, getterType: string, mutationType: string) => {
  const fieldsObject = Array.isArray(fields) ? arrayToObject(fields) : fields

  return Object.keys(fieldsObject).reduce((prev, key) => {
    const path = fieldsObject[key]
    const field = {
      get(this: any) {
        return (this.$store as Store<any>).getters[getterType](path)
      },
      set(this: any, value: any) {
        (this.$store as Store<any>).commit(mutationType, { path, value })
      },
    }

    prev[key] = field

    return prev
  }, {} as any)
})

export const mapMultiRowFields = normalizeNamespace((
  namespace: string,
  paths: any,
  getterType: string,
  mutationType: string,
) => {
  const pathsObject = Array.isArray(paths) ? arrayToObject(paths) : paths

  return Object.keys(pathsObject).reduce((entries, key) => {
    const path = pathsObject[key]

    entries[key] = {
      get(this: any) {
        const store = this.$store as Store<any>
        const rows = store.getters[getterType](path)

        // If rows is undefined or not an array, return empty array to prevent error
        if (!rows || !Array.isArray(rows))
          return []

        return rows.map((item: any, index: number) => {
          const rowProxy: any = {}
          Object.keys(item).forEach((fieldKey) => {
            const fieldPath = `${path}[${index}].${fieldKey}`
            Object.defineProperty(rowProxy, fieldKey, {
              get() {
                return store.getters[getterType](fieldPath)
              },
              set(value) {
                store.commit(mutationType, { path: fieldPath, value })
              },
              enumerable: true,
            })
          })
          return rowProxy
        })
      },
    }

    return entries
  }, {} as any)
})

export function createHelpers(options: { getterType: string, mutationType: string }) {
  const { getterType, mutationType } = options
  return {
    [getterType]: getField,
    [mutationType]: updateField,
    mapFields: normalizeNamespace((namespace: string, fields: any) => mapFields(
      namespace,
      fields,
      getterType,
      mutationType,
    )),
    mapMultiRowFields: normalizeNamespace((namespace: string, paths: any) => mapMultiRowFields(
      namespace,
      paths,
      getterType,
      mutationType,
    )),
  }
}
