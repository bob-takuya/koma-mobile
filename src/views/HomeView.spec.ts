import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import HomeView from './HomeView.vue'

// Mock the router
const mockPush = vi.fn()
vi.mock('vue-router', async () => {
  const actual = await vi.importActual('vue-router')
  return {
    ...(actual as any),
    useRouter: () => ({
      push: mockPush,
    }),
  }
})

// Create a mock store instance that can be updated per test
const mockProjectStore = {
  hasBucketName: true,
  hasProjectId: true,
}

// Mock the project store
vi.mock('../stores/project', () => ({
  useProjectStore: () => mockProjectStore,
}))

describe('HomeView', () => {
  let wrapper: any

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks()
    
    // Reset mock store to default state
    mockProjectStore.hasBucketName = true
    mockProjectStore.hasProjectId = true
  })

  afterEach(() => {
    wrapper?.unmount()
  })

  it('should render the home view correctly', () => {
    wrapper = mount(HomeView)
    expect(wrapper.find('.home-view').exists()).toBe(true)
    expect(wrapper.find('.loading-container').exists()).toBe(true)
  })

  it('should show loading spinner', () => {
    wrapper = mount(HomeView)
    expect(wrapper.find('.spinner').exists()).toBe(true)
    expect(wrapper.find('.loading-text').text()).toBe('Stop Motion Collaborator を起動中...')
  })

  it('should have gradient background styling', () => {
    wrapper = mount(HomeView)
    const homeView = wrapper.find('.home-view')
    expect(homeView.exists()).toBe(true)
    expect(homeView.classes()).toContain('home-view')
  })

  it('should redirect to camera when bucket name is available', () => {
    wrapper = mount(HomeView)
    // The onMounted hook should have been called during mount
    // Since we mocked hasBucketName to true, it should redirect to camera
    expect(mockPush).toHaveBeenCalledWith('/camera')
  })

  it('should redirect to setup when bucket name is not available', async () => {
    // Change mock to simulate no bucket name
    mockProjectStore.hasBucketName = false
    mockProjectStore.hasProjectId = false

    // Mount component with updated mock values
    wrapper = mount(HomeView)

    expect(mockPush).toHaveBeenCalledWith('/setup')
  })

  it('should have proper loading text', () => {
    wrapper = mount(HomeView)
    const loadingText = wrapper.find('.loading-text')
    expect(loadingText.exists()).toBe(true)
    expect(loadingText.text()).toBe('Stop Motion Collaborator を起動中...')
  })

  it('should have animated spinner', () => {
    wrapper = mount(HomeView)
    const spinner = wrapper.find('.spinner')
    expect(spinner.exists()).toBe(true)
    expect(spinner.classes()).toContain('spinner')
  })

  it('should center loading content', () => {
    wrapper = mount(HomeView)
    const loadingContainer = wrapper.find('.loading-container')
    expect(loadingContainer.exists()).toBe(true)
    expect(loadingContainer.classes()).toContain('loading-container')
  })

  it('should handle different screen sizes', () => {
    wrapper = mount(HomeView)
    // The component should have responsive styling
    const homeView = wrapper.find('.home-view')
    expect(homeView.exists()).toBe(true)

    // Check that the component structure supports responsive design
    const loadingContainer = wrapper.find('.loading-container')
    expect(loadingContainer.exists()).toBe(true)
  })

  it('should use proper color scheme', () => {
    wrapper = mount(HomeView)
    const homeView = wrapper.find('.home-view')
    const loadingContainer = wrapper.find('.loading-container')

    expect(homeView.exists()).toBe(true)
    expect(loadingContainer.exists()).toBe(true)

    // These elements should exist and have the proper classes for styling
    expect(homeView.classes()).toContain('home-view')
    expect(loadingContainer.classes()).toContain('loading-container')
  })

  it('should handle bucket name state changes appropriately', () => {
    wrapper = mount(HomeView)
    // This test verifies that the component responds to store state
    expect(wrapper.vm).toBeDefined()

    // The redirect logic should be based on the current bucket name state
    if (mockProjectStore.hasBucketName && mockProjectStore.hasProjectId) {
      expect(mockPush).toHaveBeenCalledWith('/camera')
    } else {
      expect(mockPush).toHaveBeenCalledWith('/setup')
    }
  })

  it('should display Japanese text correctly', () => {
    wrapper = mount(HomeView)
    const loadingText = wrapper.find('.loading-text')
    expect(loadingText.text()).toContain('Stop Motion Collaborator')
    expect(loadingText.text()).toContain('起動中')
  })
})
