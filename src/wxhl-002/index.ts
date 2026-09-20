import App from './App.vue'
import './global.css'

$(() => {
  const el = document.createElement('div')
  el.id = 'wxhl002-root'
  document.body.appendChild(el)
  const app = createApp(App)
  app.mount(el)
  $(window).on('pagehide', () => {
    app.unmount()
    el.remove()
  })
})
