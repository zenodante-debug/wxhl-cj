import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import App from './App.vue'
import './index.scss'

const routes = [
  { path: '/', component: () => import('./views/TitleScreen.vue') },
  { path: '/new-game', component: () => import('./views/NewGame.vue') },
  { path: '/main', component: () => import('./views/MainGame.vue') },
]

const router = createRouter({
  history: createMemoryHistory(),
  routes,
})

$(() => {
  const app = createApp(App).use(createPinia()).use(router)
  app.mount('#app')
})
