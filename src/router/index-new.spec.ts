import { describe, it, expect, vi } from 'vitest'

// Mock the project store before importing the router
vi.mock('../stores/project', () => ({
  useProjectStore: vi.fn(() => ({
    hasApiKey: true,
  })),
}))

// Import router after mocking
import router from './index'

describe('Router Configuration', () => {
  it('should have correct routes configured', () => {
    const routes = router.getRoutes()
    const routePaths = routes.map((route: any) => route.path)

    expect(routePaths).toContain('/')
    expect(routePaths).toContain('/setup')
    expect(routePaths).toContain('/camera')
    expect(routePaths).toContain('/gallery')
  })

  it('should have correct route names', () => {
    const routes = router.getRoutes()
    const routeNames = routes.map((route: any) => route.name).filter(Boolean)

    expect(routeNames).toContain('home')
    expect(routeNames).toContain('setup')
    expect(routeNames).toContain('camera')
    expect(routeNames).toContain('gallery')
  })

  it('should navigate to setup route', async () => {
    await router.push('/setup')
    expect(router.currentRoute.value.path).toBe('/setup')
    expect(router.currentRoute.value.name).toBe('setup')
  })

  it('should navigate to camera route', async () => {
    await router.push('/camera')
    expect(router.currentRoute.value.path).toBe('/camera')
    expect(router.currentRoute.value.name).toBe('camera')
  })

  it('should navigate to gallery route', async () => {
    await router.push('/gallery')
    expect(router.currentRoute.value.path).toBe('/gallery')
    expect(router.currentRoute.value.name).toBe('gallery')
  })

  it('should handle unknown routes with fallback redirect', async () => {
    await router.push('/unknown-route')
    expect(router.currentRoute.value.path).toBe('/')
  })

  it('should have lazy-loaded components for optimal performance', () => {
    const routes = router.getRoutes()
    const lazyRoutes = routes.filter((route: any) => typeof route.component === 'function')

    // Setup, Camera, and Gallery should be lazy-loaded
    expect(lazyRoutes.length).toBeGreaterThanOrEqual(3)
  })

  it('should handle root path correctly', async () => {
    await router.push('/')
    expect(router.currentRoute.value.path).toBe('/')
    expect(router.currentRoute.value.name).toBe('home')
  })

  it('should have route guards for protected routes', () => {
    const routes = router.getRoutes()
    const cameraRoute = routes.find((route: any) => route.path === '/camera')
    const galleryRoute = routes.find((route: any) => route.path === '/gallery')

    expect(cameraRoute?.beforeEnter).toBeDefined()
    expect(galleryRoute?.beforeEnter).toBeDefined()
  })

  it('should maintain browser history correctly', async () => {
    await router.push('/')
    await router.push('/setup')
    await router.push('/camera')

    expect(router.currentRoute.value.path).toBe('/camera')
  })
})
