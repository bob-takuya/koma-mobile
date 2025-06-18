import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

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
    },
    {
      path: '/gallery',
      name: 'gallery',
      component: () => import('../views/GalleryView.vue'),
    },
    {
      path: '/test',
      name: 'test',
      component: () => import('../views/TestView.vue'),
    },
    // 未知のルートは全てホームにリダイレクト
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

export default router
