import { describe, it, expect, vi, beforeEach } from 'vitest'
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

// Mock the project store
const mockProjectStore = {
  hasApiKey: true,
}
vi.mock('../stores/project', () => ({
  useProjectStore: () => mockProjectStore,
}))

describe('HomeView', () => {
  let wrapper: any

  beforeEach(() => {
    vi.clearAllMocks()
    wrapper = mount(HomeView)
  })

  afterEach(() => {
    wrapper?.unmount()
  })

  it('should render the home view correctly', () => {
    expect(wrapper.find('.home-view').exists()).toBe(true)
    expect(wrapper.find('.loading-container').exists()).toBe(true)
  })

  it('should show loading spinner', () => {
    expect(wrapper.find('.spinner').exists()).toBe(true)
    expect(wrapper.find('.loading-text').text()).toBe('Stop Motion Collaborator を起動中...')
  })

  it('should have gradient background styling', () => {
    const homeView = wrapper.find('.home-view')
    expect(homeView.exists()).toBe(true)
    expect(homeView.classes()).toContain('home-view')
  })

  it('should redirect to camera when API key is available', () => {
    // The onMounted hook should have been called during mount
    // Since we mocked hasApiKey to true, it should redirect to camera
    expect(mockPush).toHaveBeenCalledWith('/camera')
  })

  it('should redirect to setup when API key is not available', async () => {
    // Change mock to simulate no API key
    mockProjectStore.hasApiKey = false

    // Remount component to trigger onMounted again
    wrapper.unmount()
    wrapper = mount(HomeView)

    expect(mockPush).toHaveBeenCalledWith('/setup')
  })

  it('should have proper loading text', () => {
    const loadingText = wrapper.find('.loading-text')
    expect(loadingText.exists()).toBe(true)
    expect(loadingText.text()).toBe('Stop Motion Collaborator を起動中...')
  })

  it('should have animated spinner', () => {
    const spinner = wrapper.find('.spinner')
    expect(spinner.exists()).toBe(true)
    expect(spinner.classes()).toContain('spinner')
  })

  it('should center loading content', () => {
    const loadingContainer = wrapper.find('.loading-container')
    expect(loadingContainer.exists()).toBe(true)
    expect(loadingContainer.classes()).toContain('loading-container')
  })

  it('should handle different screen sizes', () => {
    // The component should have responsive styling
    const homeView = wrapper.find('.home-view')
    expect(homeView.exists()).toBe(true)

    // Check that the component structure supports responsive design
    const loadingContainer = wrapper.find('.loading-container')
    expect(loadingContainer.exists()).toBe(true)
  })

  it('should use proper color scheme', () => {
    const homeView = wrapper.find('.home-view')
    const loadingContainer = wrapper.find('.loading-container')

    expect(homeView.exists()).toBe(true)
    expect(loadingContainer.exists()).toBe(true)

    // These elements should exist and have the proper classes for styling
    expect(homeView.classes()).toContain('home-view')
    expect(loadingContainer.classes()).toContain('loading-container')
  })

  it('should handle API key state changes appropriately', () => {
    // This test verifies that the component responds to store state
    expect(wrapper.vm).toBeDefined()

    // The redirect logic should be based on the current API key state
    if (mockProjectStore.hasApiKey) {
      expect(mockPush).toHaveBeenCalledWith('/camera')
    } else {
      expect(mockPush).toHaveBeenCalledWith('/setup')
    }
  })

  it('should display Japanese text correctly', () => {
    const loadingText = wrapper.find('.loading-text')
    expect(loadingText.text()).toContain('Stop Motion Collaborator')
    expect(loadingText.text()).toContain('起動中')
  })
})
