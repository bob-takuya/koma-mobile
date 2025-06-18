import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { S3Service } from '@/services/s3'
import type { ProjectConfig } from '@/types'

export const useProjectStore = defineStore('project', () => {
  // State
  const config = ref<ProjectConfig | null>(null)
  const currentFrame = ref(0)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const bucketName = ref<string | null>(null)

  // Getters
  const getCurrentFrameData = computed(() => {
    if (
      !config.value ||
      currentFrame.value < 0 ||
      currentFrame.value >= config.value.frames.length
    ) {
      return null
    }
    return config.value.frames[currentFrame.value]
  })

  const takenFramesCount = computed(() => {
    if (!config.value) return 0
    return config.value.frames.filter((frame) => frame.taken).length
  })

  const totalFrames = computed(() => {
    return config.value?.totalFrames || 0
  })

  const hasBucketName = computed(() => {
    return !!bucketName.value
  })

  // Actions
  function setBucketName(name: string) {
    bucketName.value = name
    localStorage.setItem('stopmotion-bucket-name', name)
  }

  function loadBucketName() {
    const storedName = localStorage.getItem('stopmotion-bucket-name')
    if (storedName) {
      bucketName.value = storedName
    }
  }

  function clearBucketName() {
    bucketName.value = null
    localStorage.removeItem('stopmotion-bucket-name')
  }

  function setCurrentFrame(frameNumber: number) {
    if (!config.value) return

    const maxFrame = config.value.totalFrames - 1
    currentFrame.value = Math.max(0, Math.min(frameNumber, maxFrame))
  }

  function markFrameTaken(frameNumber: number, filename: string) {
    if (!config.value) return

    const frame = config.value.frames.find((f) => f.number === frameNumber)
    if (frame) {
      frame.taken = true
      frame.filename = filename
    }
  }

  async function loadConfig(projectId: string) {
    if (!bucketName.value) {
      error.value = 'Bucket name required'
      return
    }

    isLoading.value = true
    error.value = null

    try {
      const s3Service = new S3Service(bucketName.value)
      const data = await s3Service.downloadConfig(projectId)
      config.value = data
    } catch (err) {
      console.error('Failed to load config:', err)
      error.value = 'Failed to load project config'
    } finally {
      isLoading.value = false
    }
  }

  async function saveConfig(projectId: string) {
    if (!bucketName.value || !config.value) {
      error.value = 'Bucket name and config required'
      return
    }

    isLoading.value = true
    error.value = null

    try {
      const s3Service = new S3Service(bucketName.value)
      await s3Service.uploadConfig(projectId, config.value)
    } catch (err) {
      console.error('Failed to save config:', err)
      error.value = 'Failed to save project config'
    } finally {
      isLoading.value = false
    }
  }

  return {
    // State
    config,
    currentFrame,
    isLoading,
    error,
    bucketName,
    // Getters
    getCurrentFrameData,
    takenFramesCount,
    totalFrames,
    hasBucketName,
    // Actions
    setBucketName,
    loadBucketName,
    clearBucketName,
    setCurrentFrame,
    markFrameTaken,
    loadConfig,
    saveConfig,
  }
})
