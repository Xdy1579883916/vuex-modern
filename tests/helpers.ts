import { createApp } from 'vue'

export function mount(store: any, component: any) {
  const el = document.createElement('div')
  document.body.appendChild(el)

  ;(window as any).__DEV__ = false
  ;(window as any).__VUE_PROD_DEVTOOLS__ = false

  component.render = component.render || (() => {})

  const app = createApp(component)

  app.use(store)

  return app.mount(el)
}
