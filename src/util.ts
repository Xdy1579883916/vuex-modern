export function forEachValue<T>(obj: Record<string, T>, fn: (value: T, key: string) => void): void {
  Object.keys(obj).forEach(key => fn(obj[key], key))
}

export function isObject(obj: unknown): obj is Record<string, any> {
  return obj !== null && typeof obj === 'object'
}

export function isPromise(val: unknown): val is Promise<any> {
  return !!val && typeof (val as Promise<any>).then === 'function'
}

export function partial(fn: Function, arg: any): Function {
  return function (this: any, ...args: any[]) {
    return fn.call(this, arg, ...args)
  }
}

export function assert(condition: any, msg: string) {
  if (!condition)
    throw new Error(`[vuex] ${msg}`)
}
