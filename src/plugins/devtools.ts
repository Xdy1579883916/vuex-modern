import type { Store } from '../lib/store'
import { setupDevtoolsPlugin } from '@vue/devtools-api'
import { forEachValue } from '../lib/util'

const LAW_RAW_LABEL = 'Raw'
const INSPECTOR_ID = 'vuex'
const TIMELINE_LAYER_ID = 'vuex:mutations'

export function useDevtools(app: any, store: Store<any>) {
  setupDevtoolsPlugin(
    {
      id: 'org.vuejs.vuex',
      app,
      label: 'Vuex',
      homepage: 'https://next.vuex.vuejs.org/',
      logo: 'https://vuejs.org/images/logo.png',
      packageName: 'vuex-modern',
      componentStateTypes: [LAW_RAW_LABEL],
    },
    (api) => {
      api.addTimelineLayer({
        id: TIMELINE_LAYER_ID,
        label: 'Vuex Mutations',
        color: 0x8759D5, // purple-ish
      })

      api.addInspector({
        id: INSPECTOR_ID,
        label: 'Vuex',
        icon: 'storage',
        treeFilterPlaceholder: 'Filter stores...',
      })

      api.on.getInspectorTree((payload) => {
        if (payload.inspectorId === INSPECTOR_ID) {
          const rootNodes: any[] = []

          function formatModule(module: any, path: string, label: string) {
            const node: any = {
              id: path,
              label,
              children: [],
              tags: path === 'root'
                ? [{
                    label: 'root',
                    textColor: 0xFFFFFF,
                    backgroundColor: 0x8759D5,
                  }]
                : module.namespaced
                  ? [{
                      label: 'namespaced',
                      textColor: 0xFFFFFF,
                      backgroundColor: 0x006600,
                    }]
                  : [],
            }

            if (module._children) {
              forEachValue(module._children, (childModule, key) => {
                node.children.push(formatModule(childModule, path === 'root' ? key : `${path}/${key}`, key))
              })
            }
            return node
          }

          if (store._modules.root) {
            rootNodes.push(formatModule(store._modules.root, 'root', 'Root'))
          }

          payload.rootNodes = rootNodes
        }
      })

      api.on.getInspectorState((payload) => {
        if (payload.inspectorId === INSPECTOR_ID) {
          const nodeId = payload.nodeId

          // Helper to resolve module state by path
          // nodeId is like 'root', 'cart', 'cart/items'
          // Store state structure is object tree.
          // Root state is store.state.

          let moduleState = store.state

          if (nodeId !== 'root') {
            // For modules, we need to traverse the state tree
            // But wait, store.state is the root state object.
            // If I have module 'cart', state is store.state.cart
            const path = nodeId.split('/')
            for (const key of path) {
              if (moduleState && moduleState[key]) {
                moduleState = moduleState[key]
              } else {
                // Fallback or error?
                // If module has no state, moduleState might be undefined if we traverse.
                // But in Vuex 4, module state is always nested in root state.
              }
            }

            // Getters for module?
            // Vuex getters are global in `store.getters`.
            // Namespaced getters are 'cart/total'.
            // We can filter global getters by prefix.

            // We need to know if the module is namespaced to filter getters correctly?
            // Or we just show all getters that START with this path?
            // If module 'a' is not namespaced, its getters are global.
            // We can check `store._modules.get(path.split('/'))` to check namespaced.
            // But getting module by path requires raw path array.
            // nodeId 'a/b' might correspond to module ['a', 'b'].

            const rawPath = nodeId.split('/')

            // Filter getters
            // If module is namespaced, we filter by namespace prefix.
            // If not, we might not be able to distinguish easily without checking raw definition.
            // For simplification, let's just show relevant getters if namespaced.

            const namespace = store._modules.getNamespace(rawPath)
            if (namespace) {
              const filteredGetters: any = {}
              Object.keys(store.getters).forEach((key) => {
                if (key.startsWith(namespace)) {
                  filteredGetters[key] = store.getters[key]
                }
              })
              // We can use this filtered list.
              // But usually we want to show them with short names?
              // Vuex Devtools usually shows full keys.
            }
          }

          payload.state = {
            state: [
              {
                key: nodeId === 'root' ? 'root' : nodeId,
                value: moduleState,
                editable: true,
              },
            ],
            getters: Object.keys(store.getters).filter((key) => {
              if (nodeId === 'root')
                return true // Show all in root? Or maybe none?
              // If we are in a module, show only related getters
              const rawPath = nodeId.split('/')
              const namespace = store._modules.getNamespace(rawPath)
              if (namespace)
                return key.startsWith(namespace)
              return false
            }).map(key => ({
              key,
              value: store.getters[key],
              editable: false,
              objectType: 'computed',
            })),
          }
        }
      })

      api.on.editInspectorState((payload) => {
        if (payload.inspectorId === INSPECTOR_ID) {
          const path = payload.path
          // payload.path is relative to the `state` object we sent.
          // We sent `key: nodeId`.
          // So path[0] is `nodeId`.

          if (path.length > 1) {
            const statePath = path.slice(1)
            const nodeId = payload.nodeId

            store._withCommit(() => {
              const value = payload.state.value
              const lastKey = statePath[statePath.length - 1]
              const targetPath = statePath.slice(0, -1)

              // Resolve the start object (the module state)
              let target = store.state
              if (nodeId !== 'root') {
                const modulePath = nodeId.split('/')
                for (const key of modulePath) {
                  target = target[key]
                }
              }

              // Now traverse within the module state
              for (const key of targetPath) {
                target = target[key]
              }
              target[lastKey] = value
            })
          }
        }
      })

      store.subscribe((mutation: any, state: any) => {
        api.addTimelineEvent({
          layerId: TIMELINE_LAYER_ID,
          event: {
            time: Date.now(),
            title: mutation.type,
            subtitle: mutation.type,
            data: {
              mutation,
              state,
            },
            groupId: mutation.type,
          },
        })

        // Notify inspector to update
        api.sendInspectorState(INSPECTOR_ID)
        api.sendInspectorTree(INSPECTOR_ID)
      }, { prepend: true })

      store.subscribeAction({
        before: (action: any, state: any) => {
          api.addTimelineEvent({
            layerId: TIMELINE_LAYER_ID,
            event: {

              time: Date.now(),
              title: action.type,
              subtitle: 'start',
              data: { action, state },
              groupId: action.type,
            },
          })
        },
        after: (action: any, state: any) => {
          api.addTimelineEvent({
            layerId: TIMELINE_LAYER_ID,
            event: {
              time: Date.now(),
              title: action.type,
              subtitle: 'end',
              data: { action, state },
              groupId: action.type,
            },
          })
        },
      }, { prepend: true })
    },
  )
}
