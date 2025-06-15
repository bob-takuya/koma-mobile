import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useProjectStore } from './stores/project'
import { initTweeq, installTweeq } from './composables/useTweeq'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// Initialize Tweeq
initTweeq('com.stopmotion.collaborator', {
  colorMode: 'light',
  accentColor: '#667eea',
  grayColor: '#9494B8',
  backgroundColor: '#fcfcfc',
})

// Install Tweeq components
installTweeq(app)

// Initialize the project store and load any saved API key
const projectStore = useProjectStore()
projectStore.loadApiKey()

app.mount('#app')

// Service Worker 登録 (PWA対応)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration)
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError)
      })
  })
}
