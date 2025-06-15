import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ApiKeySetup from '@/components/ApiKeySetup.vue'
import { useProjectStore } from '@/stores/project'

describe('ApiKeySetup Component', () => {
  let wrapper: any
  let store: any

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useProjectStore()
    vi.clearAllMocks()
  })

  describe('Component Rendering', () => {
    it('should render setup form when no API key is set', () => {
      store.apiKey = null
      wrapper = mount(ApiKeySetup)

      expect(wrapper.find('[data-testid="setup-form"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="api-key-input"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="project-id-input"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="setup-button"]').exists()).toBe(true)
    })

    it('should render loading state', async () => {
      store.apiKey = null
      wrapper = mount(ApiKeySetup)

      // Use component's reactive state instead of setData
      wrapper.vm.isLoading = true
      await wrapper.vm.$nextTick()

      const setupButton = wrapper.find('[data-testid="setup-button"]')
      expect(setupButton.attributes('disabled')).toBeDefined()
      expect(setupButton.text()).toContain('Setting up...')
    })

    it('should show error message when setup fails', async () => {
      store.apiKey = null
      wrapper = mount(ApiKeySetup)

      // Use component's reactive state instead of setData
      wrapper.vm.error = 'Invalid API key'
      await wrapper.vm.$nextTick()

      const errorMessage = wrapper.find('[data-testid="error-message"]')
      expect(errorMessage.exists()).toBe(true)
      expect(errorMessage.text()).toContain('Invalid API key')
    })
  })

  describe('Form Validation', () => {
    beforeEach(() => {
      store.apiKey = null
      wrapper = mount(ApiKeySetup)
    })

    it('should validate API key format', async () => {
      const apiKeyInput = wrapper.find('[data-testid="api-key-input"]')
      await apiKeyInput.setValue('short')

      // Manually trigger validation to check if it works
      const result = wrapper.vm.validateForm()
      expect(result).toBe(false)
      expect(wrapper.vm.error).toContain('API key format appears invalid')
    })

    it('should validate project ID format', async () => {
      const apiKeyInput = wrapper.find('[data-testid="api-key-input"]')
      const projectIdInput = wrapper.find('[data-testid="project-id-input"]')

      await apiKeyInput.setValue('valid-api-key-123')
      await projectIdInput.setValue('')

      // Manually trigger validation to check if it works
      const result = wrapper.vm.validateForm()
      expect(result).toBe(false)
      expect(wrapper.vm.error).toContain('Project ID is required')
    })

    it('should enable setup button when form is valid', async () => {
      const apiKeyInput = wrapper.find('[data-testid="api-key-input"]')
      const projectIdInput = wrapper.find('[data-testid="project-id-input"]')

      await apiKeyInput.setValue('valid-api-key-123')
      await projectIdInput.setValue('test-project')

      const setupButton = wrapper.find('[data-testid="setup-button"]')
      expect(setupButton.attributes('disabled')).toBeUndefined()
    })
  })

  describe('API Key Management', () => {
    it('should call store setApiKey when form is submitted', async () => {
      store.apiKey = null
      const setApiKeySpy = vi.spyOn(store, 'setApiKey')
      wrapper = mount(ApiKeySetup)

      const apiKeyInput = wrapper.find('[data-testid="api-key-input"]')
      const projectIdInput = wrapper.find('[data-testid="project-id-input"]')

      await apiKeyInput.setValue('test-api-key')
      await projectIdInput.setValue('test-project')

      const setupForm = wrapper.find('[data-testid="setup-form"]')
      await setupForm.trigger('submit.prevent')

      expect(setApiKeySpy).toHaveBeenCalledWith('test-api-key')
    })

    it('should load project config after API key is set', async () => {
      store.apiKey = null
      store.loadConfig = vi.fn().mockResolvedValue(undefined)
      wrapper = mount(ApiKeySetup)

      const apiKeyInput = wrapper.find('[data-testid="api-key-input"]')
      const projectIdInput = wrapper.find('[data-testid="project-id-input"]')

      await apiKeyInput.setValue('test-api-key')
      await projectIdInput.setValue('test-project')

      const setupForm = wrapper.find('[data-testid="setup-form"]')
      await setupForm.trigger('submit.prevent')

      // Wait for async operations
      await wrapper.vm.$nextTick()

      expect(store.loadConfig).toHaveBeenCalledWith('test-project')
    })

    it('should emit setup-complete event on success', async () => {
      store.apiKey = null
      store.loadConfig = vi.fn().mockResolvedValue(undefined)
      wrapper = mount(ApiKeySetup)

      const apiKeyInput = wrapper.find('[data-testid="api-key-input"]')
      const projectIdInput = wrapper.find('[data-testid="project-id-input"]')

      await apiKeyInput.setValue('test-api-key')
      await projectIdInput.setValue('test-project')

      const setupForm = wrapper.find('[data-testid="setup-form"]')
      await setupForm.trigger('submit.prevent')

      // Wait for async operations
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('setup-complete')).toBeTruthy()
      expect(wrapper.emitted('setup-complete')[0]).toEqual(['test-project'])
    })
  })

  describe('Instructions and Help', () => {
    it('should display setup instructions', () => {
      store.apiKey = null
      wrapper = mount(ApiKeySetup)

      const instructions = wrapper.find('[data-testid="setup-instructions"]')
      expect(instructions.exists()).toBe(true)
      expect(instructions.text()).toContain('API key')
      expect(instructions.text()).toContain('Project ID')
    })

    it('should show help text for API key format', () => {
      store.apiKey = null
      wrapper = mount(ApiKeySetup)

      const helpText = wrapper.find('[data-testid="api-key-help"]')
      expect(helpText.exists()).toBe(true)
      expect(helpText.text()).toContain('AWS access key')
    })

    it('should show help text for project ID', () => {
      store.apiKey = null
      wrapper = mount(ApiKeySetup)

      const helpText = wrapper.find('[data-testid="project-id-help"]')
      expect(helpText.exists()).toBe(true)
      expect(helpText.text()).toContain('Unique identifier')
    })
  })

  describe('Existing Setup', () => {
    it('should show current setup when API key exists', () => {
      store.apiKey = 'existing-key'
      wrapper = mount(ApiKeySetup)

      const currentSetup = wrapper.find('[data-testid="current-setup"]')
      expect(currentSetup.exists()).toBe(true)
      expect(currentSetup.text()).toContain('exis****-key')
    })

    it('should allow changing API key', async () => {
      store.apiKey = 'existing-key'
      wrapper = mount(ApiKeySetup)

      const changeButton = wrapper.find('[data-testid="change-api-key"]')
      await changeButton.trigger('click')

      expect(wrapper.find('[data-testid="setup-form"]').exists()).toBe(true)
    })

    it('should allow clearing API key', async () => {
      store.apiKey = 'existing-key'
      const clearApiKeySpy = vi.spyOn(store, 'clearApiKey')
      wrapper = mount(ApiKeySetup)

      const clearButton = wrapper.find('[data-testid="clear-api-key"]')
      await clearButton.trigger('click')

      expect(clearApiKeySpy).toHaveBeenCalled()
    })
  })
})
