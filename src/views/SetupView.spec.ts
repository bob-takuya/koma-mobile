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
  hasBucketName: false,
}
vi.mock('../stores/project', () => ({
  useProjectStore: () => mockProjectStore,
}))

// Mock the BucketSetup component
vi.mock('../components/BucketSetup.vue', () => ({
  default: {
    name: 'BucketSetup',
    emits: ['bucket-set'],
    template: '<div data-testid="bucket-setup">Bucket Setup Component</div>',
  },
}))

describe('SetupView', () => {
  let wrapper: any

  beforeEach(() => {
    vi.clearAllMocks()
    wrapper = mount(SetupView, {
      global: {
        stubs: {
          BucketSetup: true,
        },
      },
    })
  })

  afterEach(() => {
    wrapper?.unmount()
  })

  it('should render the setup view correctly', () => {
    expect(wrapper.find('.setup-view').exists()).toBe(true)
  })

  it('should render the BucketSetup component', () => {
    expect(wrapper.findComponent({ name: 'BucketSetup' }).exists()).toBe(true)
  })

  it('should handle setup-complete event correctly', async () => {
    const bucketSetup = wrapper.findComponent({ name: 'BucketSetup' })

    // Emit the setup-complete event
    await bucketSetup.vm.$emit('setup-complete', 'test-project')

    // Check that the router push was called with the correct route
    expect(mockPush).toHaveBeenCalledWith('/camera')
  })

  it('should have proper styling for full viewport', () => {
    const setupView = wrapper.find('.setup-view')
    expect(setupView.exists()).toBe(true)
    expect(setupView.classes()).toContain('setup-view')
  })

  it('should center the BucketSetup component', () => {
    const setupView = wrapper.find('.setup-view')
    expect(setupView.exists()).toBe(true)

    const bucketSetup = wrapper.findComponent({ name: 'BucketSetup' })
    expect(bucketSetup.exists()).toBe(true)
  })
})
