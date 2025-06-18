import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import BucketSetup from '@/components/BucketSetup.vue'
import { useProjectStore } from '@/stores/project'

describe('BucketSetup Component', () => {
  let wrapper: any
  let store: any

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useProjectStore()
    vi.clearAllMocks()
  })

  afterEach(() => {
    wrapper?.unmount()
  })

  describe('Component Rendering', () => {
    it('should render setup form', () => {
      wrapper = mount(BucketSetup)

      expect(wrapper.find('[data-testid="setup-form"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="bucket-name-input"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="project-id-input"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="setup-button"]').exists()).toBe(true)
    })

    it('should handle form submission', async () => {
      const setBucketNameSpy = vi.spyOn(store, 'setBucketName')
      const loadConfigSpy = vi.spyOn(store, 'loadConfig').mockResolvedValue(undefined)

      wrapper = mount(BucketSetup)

      const bucketInput = wrapper.find('[data-testid="bucket-name-input"]')
      const projectInput = wrapper.find('[data-testid="project-id-input"]')
      const setupForm = wrapper.find('[data-testid="setup-form"]')

      await bucketInput.setValue('test-bucket')
      await projectInput.setValue('test-project')
      await setupForm.trigger('submit')

      expect(setBucketNameSpy).toHaveBeenCalledWith('test-bucket')
      expect(loadConfigSpy).toHaveBeenCalledWith('test-project')
    })
  })

  describe('Error Handling', () => {
    it('should handle project not found error', async () => {
      const setBucketNameSpy = vi.spyOn(store, 'setBucketName')
      const loadConfigSpy = vi.spyOn(store, 'loadConfig').mockResolvedValue(undefined)
      const clearBucketNameSpy = vi.spyOn(store, 'clearBucketName')

      wrapper = mount(BucketSetup)

      const bucketInput = wrapper.find('[data-testid="bucket-name-input"]')
      const projectInput = wrapper.find('[data-testid="project-id-input"]')
      const setupForm = wrapper.find('[data-testid="setup-form"]')

      await bucketInput.setValue('test-bucket')
      await projectInput.setValue('non-existent-project')

      // プロジェクトストアにエラーを設定してからフォーム送信
      store.error = 'Project not found. Please check the project ID.'
      await setupForm.trigger('submit')

      expect(setBucketNameSpy).toHaveBeenCalledWith('test-bucket')
      expect(loadConfigSpy).toHaveBeenCalledWith('non-existent-project')
      expect(clearBucketNameSpy).toHaveBeenCalled()

      // エラーメッセージが表示されることを確認
      await wrapper.vm.$nextTick()
      const errorMessage = wrapper.find('[data-testid="error-message"]')
      expect(errorMessage.exists()).toBe(true)
      expect(errorMessage.text()).toContain('Project not found')
    })

    it('should handle bucket not found error', async () => {
      const setBucketNameSpy = vi.spyOn(store, 'setBucketName')
      const loadConfigSpy = vi.spyOn(store, 'loadConfig').mockResolvedValue(undefined)
      const clearBucketNameSpy = vi.spyOn(store, 'clearBucketName')

      wrapper = mount(BucketSetup)

      const bucketInput = wrapper.find('[data-testid="bucket-name-input"]')
      const projectInput = wrapper.find('[data-testid="project-id-input"]')
      const setupForm = wrapper.find('[data-testid="setup-form"]')

      await bucketInput.setValue('non-existent-bucket')
      await projectInput.setValue('test-project')

      // プロジェクトストアにエラーを設定してからフォーム送信
      store.error = 'S3 bucket not found. Please check the bucket name.'
      await setupForm.trigger('submit')

      expect(setBucketNameSpy).toHaveBeenCalledWith('non-existent-bucket')
      expect(loadConfigSpy).toHaveBeenCalledWith('test-project')
      expect(clearBucketNameSpy).toHaveBeenCalled()

      // エラーメッセージが表示されることを確認
      await wrapper.vm.$nextTick()
      const errorMessage = wrapper.find('[data-testid="error-message"]')
      expect(errorMessage.exists()).toBe(true)
      expect(errorMessage.text()).toContain('S3 bucket not found')
    })
  })
})
