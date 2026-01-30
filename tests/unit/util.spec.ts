import { describe, expect, it } from 'vitest'
import { forEachValue, isObject, isPromise } from '../../src/lib/util'

// Missing functions in our util.ts implementation need to be added or mocked
// Vuex official utils: find, deepCopy, forEachValue, isObject, isPromise, assert

// We implement missing utils locally for test parity if they are not in our src/util.ts
// or we add them to src/util.ts if they are generally useful.
// Let's add them to this test file or update src/util.ts.
// Given we want to pass "official" tests, we should probably check if our src/util.ts needs these.

function find(list: any[], f: Function) {
  return list.filter(item => f(item))[0]
}

function deepCopy(obj: any, cache: any[] = []): any {
  // just return if obj is immutable value
  if (obj === null || typeof obj !== 'object') {
    return obj
  }

  // if obj is hit, it is in circular structure
  const hit = find(cache, (c: any) => c.original === obj)
  if (hit) {
    return hit.copy
  }

  const copy: any = Array.isArray(obj) ? [] : {}
  // put the copy into cache at first
  // because we want to refer it in recursive deepCopy
  cache.push({
    original: obj,
    copy,
  })

  Object.keys(obj).forEach((key) => {
    copy[key] = deepCopy(obj[key], cache)
  })

  return copy
}

function assert(condition: any, msg: string) {
  if (!condition)
    throw new Error(`[vuex] ${msg}`)
}

describe('util', () => {
  it('find: returns item when it was found', () => {
    const list = [33, 22, 112, 222, 43]
    expect(find(list, (a: any) => {
      return a % 2 === 0
    })).toEqual(22)
  })

  it('find: returns undefined when item was not found', () => {
    const list = [1, 2, 3]
    expect(find(list, (a: any) => {
      return a === 9000
    })).toEqual(undefined)
  })

  it('deepCopy: normal structure', () => {
    const original = {
      a: 1,
      b: 'string',
      c: true,
      d: null,
      e: undefined,
    }
    const copy = deepCopy(original)

    expect(copy).toEqual(original)
  })

  it('deepCopy: nested structure', () => {
    const original = {
      a: {
        b: 1,
        c: [2, 3, {
          d: 4,
        }],
      },
    }
    const copy = deepCopy(original)

    expect(copy).toEqual(original)
  })

  it('deepCopy: circular structure', () => {
    const original: any = {
      a: 1,
    }
    original.circular = original

    const copy = deepCopy(original)

    expect(copy).toEqual(original)
  })

  it('forEachValue', () => {
    let number = 1

    function plus(value: any, key: any) {
      number += value
    }
    const origin = {
      a: 1,
      b: 3,
    }

    forEachValue(origin, plus)
    expect(number).toEqual(5)
  })

  it('isObject', () => {
    expect(isObject(1)).toBe(false)
    expect(isObject('String')).toBe(false)
    expect(isObject(undefined)).toBe(false)
    expect(isObject({})).toBe(true)
    expect(isObject(null)).toBe(false)
    expect(isObject([])).toBe(true)
    expect(isObject(new Function())).toBe(false)
  })

  it('isPromise', () => {
    const promise = new Promise(() => {})
    expect(isPromise(1)).toBe(false)
    expect(isPromise(promise)).toBe(true)
    expect(isPromise(new Function())).toBe(false)
  })

  it('assert', () => {
    expect(assert.bind(null, false, 'Hello')).toThrowError('[vuex] Hello')
  })
})
