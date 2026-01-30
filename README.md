# Vuex Modern

<p align="center">
  <img src="https://vuejs.org/images/logo.png" width="100" alt="Vue Logo">
</p>

<p align="center">
  Modern, lightweight, and 100% compatible <strong>Vuex 4</strong> implementation for Vue 3.
  <br>
  Powered by Vue 3 Composition API. Built-in <code>vuex-map-fields</code> support.
</p>

<p align="center">
  <a href="https://npmjs.com/package/vuex-modern"><img src="https://img.shields.io/npm/v/vuex-modern?style=flat-square" alt="npm version"></a>
  <a href="https://npmjs.com/package/vuex-modern"><img src="https://img.shields.io/npm/dt/vuex-modern?style=flat-square" alt="npm downloads"></a>
  <img src="https://img.shields.io/badge/coverage-100%25-success?style=flat-square" alt="coverage">
  <img src="https://img.shields.io/badge/typescript-supported-blue?style=flat-square" alt="typescript">
</p>

## ✨ Features

- ⚡ **Lightweight**: Core rewritten using Vue 3 `reactive` & `computed`. No hidden Vue instances.
- 🔄 **100% Compatible**: Drop-in replacement for Vuex 4. Keeps your existing code working.
- 🛠 **DevTools Support**: Fully integrated with Vue DevTools (Timeline & Inspector).
- 📦 **Built-in Form Mapping**: Native support for `getField` / `updateField` (like `vuex-map-fields`).
- 🛡 **TypeScript**: Written in TypeScript with strict type definitions.
- 🧩 **Modular**: Full support for nested modules, dynamic registration, and namespacing.

## 📦 Installation

```bash
# pnpm
pnpm add vuex-modern

# npm
npm install vuex-modern

# yarn
yarn add vuex-modern
```

## 🚀 Usage

### 1. Basic Setup (Same as Vuex 4)

```typescript
import { createApp } from 'vue'
import { createStore } from 'vuex-modern'

const store = createStore({
  state() {
    return {
      count: 0
    }
  },
  mutations: {
    increment(state) {
      state.count++
    }
  }
})

const app = createApp(App)
app.use(store)
app.mount('#app')
```

### 2. Composition API (useStore)

```vue
<script setup>
import { useStore } from 'vuex-modern'

const store = useStore()

function inc() {
  store.commit('increment')
}
</script>

<template>
  <button @click="inc">{{ store.state.count }}</button>
</template>
```

### 3. Built-in Two-Way Binding (`vuex-map-fields`)

No need to install extra libraries. `vuex-modern` includes `getField`, `updateField`, and `mapFields` out of the box.

**Store Setup:**

```typescript
import { createStore, getField, updateField } from 'vuex-modern'

const store = createStore({
  state: {
    user: {
      name: '',
      email: ''
    }
  },
  getters: {
    getField // register built-in getter
  },
  mutations: {
    updateField // register built-in mutation
  }
})
```

**Component Usage:**

```vue
<script>
import { mapFields } from 'vuex-modern'

export default {
  computed: {
    // Two-way binding helper
    ...mapFields(['user.name', 'user.email'])
  }
}
</script>

<template>
  <input v-model="name">
  <input v-model="email">
</template>
```

## 🔍 Migration from Vuex 4

### Option 1: Standard Migration

1.  Uninstall `vuex`.
2.  Install `vuex-modern`.
3.  Replace imports globally:
    ```diff
    - import { createStore } from 'vuex'
    + import { createStore } from 'vuex-modern'
    ```

### Option 2: Alias Install (Zero Code Changes)

If you want to keep using `import ... from 'vuex'` without changing your codebase, you can install `vuex-modern` as an alias for `vuex`.

**Using pnpm / npm / yarn:**

```bash
# pnpm
pnpm add vuex@npm:vuex-modern

# npm
npm install vuex@npm:vuex-modern

# yarn
yarn add vuex@npm:vuex-modern
```

This will update your `package.json` to look like this:

```json
"dependencies": {
  "vuex": "npm:vuex-modern@^0.1.2"
}
```

## 🧪 Testing

We use Vitest for testing. The project passes all core unit tests from the official Vuex 4 repository.

```bash
pnpm test
```

## 📄 License

MIT