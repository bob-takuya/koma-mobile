import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { ProjectConfig } from '@/types'

export const useProjectStore = defineStore('project', () => {
  // State
  const config = ref<ProjectConfig | null>(null)
  const currentFrame = ref(0)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const apiKey = ref<string | null>(null)

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

  // Actions
  function setApiKey(key: string) {
    apiKey.value = key
    localStorage.setItem('stopmotion-api-key', key)
  }

  function loadApiKey() {
    const storedKey = localStorage.getItem('stopmotion-api-key')
    if (storedKey) {
      apiKey.value = storedKey
    }
  }

  function clearApiKey() {
    apiKey.value = null
    localStorage.removeItem('stopmotion-api-key')
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
    if (!apiKey.value) {
      error.value = 'API key required'
      return
    }

    isLoading.value = true
    error.value = null

    try {
      const response = await fetch(`/api/projects/${projectId}/config.json`, {
        headers: {
          Authorization: `Bearer ${apiKey.value}`,
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      config.value = data
    } catch (err) {
      console.error('Failed to load config:', err)
      error.value = 'Failed to load project config'
    } finally {
      isLoading.value = false
    }
  }

  async function saveConfig(projectId: string) {
    if (!apiKey.value || !config.value) {
      error.value = 'API key and config required'
      return
    }

    isLoading.value = true
    error.value = null

    try {
      const response = await fetch(`/api/projects/${projectId}/config.json`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${apiKey.value}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config.value),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
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
    apiKey,
    // Getters
    getCurrentFrameData,
    takenFramesCount,
    totalFrames,
    // Actions
    setApiKey,
    loadApiKey,
    clearApiKey,
    setCurrentFrame,
    markFrameTaken,
    loadConfig,
    saveConfig,
  }
})
