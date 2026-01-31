import type { RawModule } from './module'
import { forEachValue } from '../lib/util'
import { Module } from './module'

export class ModuleCollection<R> {
  public root!: Module<any, R>

  constructor(rawRootModule: RawModule<R, R>) {
    this.register([], rawRootModule, false)
  }

  get(path: string[]): Module<any, R> | undefined {
    return path.reduce((module: Module<any, R> | undefined, key: string) => {
      return module && module.getChild(key)
    }, this.root)
  }

  getNamespace(path: string[]): string {
    let module = this.root
    return path.reduce((namespace, key) => {
      module = module.getChild(key)!
      return namespace + (module.namespaced ? `${key}/` : '')
    }, '')
  }

  update(rawRootModule: RawModule<R, R>): void {
    this.updateRecursively([], rawRootModule)
  }

  register(path: string[], rawModule: RawModule<any, R>, runtime = true): void {
    const newModule = new Module(rawModule, runtime)
    if (path.length === 0) {
      this.root = newModule
    } else {
      const parent = this.get(path.slice(0, -1))
      if (parent) {
        parent.addChild(path[path.length - 1], newModule)
      }
    }

    if (rawModule.modules) {
      forEachValue(rawModule.modules, (rawChildModule, key) => {
        this.register(path.concat(key), rawChildModule, runtime)
      })
    }
  }

  unregister(path: string[]): void {
    const parent = this.get(path.slice(0, -1))
    const key = path[path.length - 1]
    const child = parent && parent.getChild(key)

    if (!child) {
      if (__DEV__) {
        console.warn(
          `[vuex] trying to unregister module '${key}', which is `
          + `not registered`,
        )
      }
      return
    }

    if (!child.runtime) {
      return
    }

    parent!.removeChild(key)
  }

  isRegistered(path: string[]): boolean {
    const parent = this.get(path.slice(0, -1))
    const key = path[path.length - 1]
    return parent ? parent.hasChild(key) : false
  }

  private updateRecursively(path: string[], rawModule: RawModule<any, R>): void {
    const module = this.get(path)
    if (!module)
      return

    module.update(rawModule)

    if (rawModule.modules) {
      forEachValue(rawModule.modules, (rawChildModule, key) => {
        if (!module.hasChild(key)) {
          if (__DEV__) {
            console.warn(
              `[vuex] trying to add a new module '${key}' on hot reloading, `
              + 'manual reload is needed',
            )
          }
          return
        }
        this.updateRecursively(path.concat(key), rawChildModule)
      })
    }
  }
}
