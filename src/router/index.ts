import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import { useProjectStore } from '../stores/project'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/setup',
      name: 'setup',
      component: () => import('../views/SetupView.vue'),
    },
    {
      path: '/camera',
      name: 'camera',
      component: () => import('../views/CameraView.vue'),
      beforeEnter: (to, from, next) => {
        const projectStore = useProjectStore()
        if (!projectStore.hasApiKey) {
          next('/setup')
        } else {
          next()
        }
      },
    },
    {
      path: '/gallery',
      name: 'gallery',
      component: () => import('../views/GalleryView.vue'),
      beforeEnter: (to, from, next) => {
        const projectStore = useProjectStore()
        if (!projectStore.hasApiKey) {
          next('/setup')
        } else {
          next()
        }
      },
    },
    // 未知のルートは全てホームにリダイレクト
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

export default router
