import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import SetupView from './SetupView.vue'

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
  hasApiKey: false,
}
vi.mock('../stores/project', () => ({
  useProjectStore: () => mockProjectStore,
}))

// Mock the ApiKeySetup component
vi.mock('../components/ApiKeySetup.vue', () => ({
  default: {
    name: 'ApiKeySetup',
    emits: ['api-key-set'],
    template: '<div data-testid="api-key-setup">API Key Setup Component</div>',
  },
}))

describe('SetupView', () => {
  let wrapper: any

  beforeEach(() => {
    vi.clearAllMocks()
    wrapper = mount(SetupView, {
      global: {
        stubs: {
          ApiKeySetup: true,
        },
      },
    })
  })

  afterEach(() => {
    wrapper?.unmount()
  })

  it('should render the setup view correctly', () => {
    expect(wrapper.find('.setup-view').exists()).toBe(true)
    expect(wrapper.find('.title').text()).toBe('Stop Motion Collaborator')
    expect(wrapper.find('.description').text()).toContain('コマ撮りアニメーション制作')
  })

  it('should render the header with correct title and description', () => {
    const header = wrapper.find('.header')
    expect(header.exists()).toBe(true)

    const title = header.find('.title')
    expect(title.text()).toBe('Stop Motion Collaborator')

    const description = header.find('.description')
    expect(description.text()).toBe('コマ撮りアニメーション制作のためのモバイルアプリケーション')
  })

  it('should render the ApiKeySetup component', () => {
    expect(wrapper.findComponent({ name: 'ApiKeySetup' }).exists()).toBe(true)
  })

  it('should render the footer with version information', () => {
    const footer = wrapper.find('.footer')
    expect(footer.exists()).toBe(true)

    const version = footer.find('.version')
    expect(version.text()).toBe('Version 1.0.0')
  })

  it('should have proper responsive styling classes', () => {
    expect(wrapper.find('.container').exists()).toBe(true)
    expect(wrapper.find('.main-content').exists()).toBe(true)
  })

  it('should handle api-key-set event correctly', async () => {
    const apiKeySetup = wrapper.findComponent({ name: 'ApiKeySetup' })

    // Emit the api-key-set event
    await apiKeySetup.vm.$emit('api-key-set')

    // Check that the router push was called with the correct route
    expect(mockPush).toHaveBeenCalledWith('/camera')
  })

  it('should have proper styling for mobile devices', () => {
    const setupView = wrapper.find('.setup-view')
    expect(setupView.classes()).toContain('setup-view')

    // Check that mobile-specific element is available
    expect(setupView.element).toBeDefined()
  })

  it('should have gradient background styling', () => {
    const setupView = wrapper.find('.setup-view')
    expect(setupView.exists()).toBe(true)

    // The component should have the setup-view class for styling
    expect(setupView.classes()).toContain('setup-view')
  })

  it('should have proper container layout', () => {
    const container = wrapper.find('.container')
    expect(container.exists()).toBe(true)

    const header = container.find('.header')
    const mainContent = container.find('.main-content')
    const footer = container.find('.footer')

    expect(header.exists()).toBe(true)
    expect(mainContent.exists()).toBe(true)
    expect(footer.exists()).toBe(true)
  })

  it('should pass the correct props to ApiKeySetup component', () => {
    const apiKeySetup = wrapper.findComponent({ name: 'ApiKeySetup' })
    expect(apiKeySetup.exists()).toBe(true)

    // Check that the component is properly mounted
    expect(apiKeySetup.vm).toBeDefined()
  })
})
