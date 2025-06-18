import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { S3Service } from '@/services/s3'
import type { ProjectConfig } from '@/types'

// 直接HTTPアクセス用のサービス
class S3DirectService {
  private bucketName: string
  private region: string
  private configCache: Map<string, { data: ProjectConfig; timestamp: number }> = new Map()

  constructor(bucketName: string, region: string = 'ap-northeast-1') {
    this.bucketName = bucketName
    this.region = region

    console.log('S3DirectService initialized for anonymous access:', {
      bucketName: this.bucketName,
      region: this.region,
      method: 'direct-http',
    })
  }

  private getS3Url(key: string): string {
    return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`
  }

  async downloadConfig(projectId: string): Promise<ProjectConfig> {
    const key = `projects/${projectId}/config.json`
    const url = this.getS3Url(key)
    console.log('Downloading config via direct HTTP:', { projectId, key, url })

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        mode: 'cors',
      })

      console.log('Direct HTTP response received:', {
        status: response.status,
        statusText: response.statusText,
      })

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Project not found')
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const text = await response.text()
      const data = JSON.parse(text)
      console.log('Config parsed successfully:', data)

      return data
    } catch (error: unknown) {
      console.error('S3 direct HTTP downloadConfig error:', error)
      throw error
    }
  }

  async checkProjectExists(projectId: string): Promise<boolean> {
    const key = `projects/${projectId}/config.json`
    const url = this.getS3Url(key)
    console.log('Checking project existence via direct HTTP:', { projectId, key, url })

    try {
      const response = await fetch(url, {
        method: 'HEAD',
        mode: 'cors',
      })

      console.log('Project exists check response:', {
        status: response.status,
        statusText: response.statusText,
      })

      return response.status === 200
    } catch (error: unknown) {
      console.error('S3 direct HTTP checkProjectExists error:', error)
      throw error
    }
  }
}

export const useProjectStore = defineStore('project', () => {
  // State
  const config = ref<ProjectConfig | null>(null)
  const currentFrame = ref(0)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const debugError = ref<string | null>(null) // デバッグ用の詳細エラー
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

    const frame = config.value.frames.find((f) => f.frame === frameNumber)
    if (frame) {
      frame.taken = true
      frame.filename = filename
    }
  }

  async function loadConfig(projectId: string) {
    if (!bucketName.value) {
      error.value = 'Bucket name required'
      debugError.value = null
      return
    }

    isLoading.value = true
    error.value = null
    debugError.value = null

    try {
      const s3Service = new S3DirectService(bucketName.value)

      // まずプロジェクトの存在をチェック
      const projectExists = await s3Service.checkProjectExists(projectId)
      if (!projectExists) {
        error.value = 'Project not found. Please check the project ID.'
        debugError.value = `Project check failed for: ${projectId} in bucket: ${bucketName.value}`
        return
      }

      // プロジェクトが存在する場合、configをダウンロード
      const data = await s3Service.downloadConfig(projectId)
      config.value = data
    } catch (err: unknown) {
      console.error('Failed to load config:', err)

      // デバッグ情報を保存
      const errorObj = err as Error & {
        code?: string
        $metadata?: unknown
        originalError?: unknown
      }

      const errorDetails = {
        message: errorObj.message || 'Unknown error',
        name: errorObj.name || 'Unknown',
        code: errorObj.code || 'None',
        stack: errorObj.stack || 'No stack trace',
        metadata: errorObj.$metadata || 'No metadata',
        originalError: errorObj.originalError || 'No original error',
      }

      debugError.value = `Error details: ${errorDetails.message}\nError name: ${errorDetails.name}\nError code: ${errorDetails.code}\nMetadata: ${JSON.stringify(errorDetails.metadata, null, 2)}\nStack: ${errorDetails.stack}`

      if (errorObj.message === 'Project not found') {
        error.value = 'Project not found. Please check the project ID.'
      } else if (errorObj.name === 'CORSError' || errorObj.code === 'CORS_OR_NETWORK') {
        error.value = 'Network request failed. Check your internet connection and S3 configuration.'
      } else if (errorObj.name === 'NoSuchBucket') {
        error.value = 'S3 bucket not found. Please check the bucket name.'
      } else if (errorObj.name === 'AccessDenied' || errorObj.code === 'AccessDenied') {
        error.value = 'Access denied. Please check your AWS credentials and bucket permissions.'
      } else if (
        errorObj.name === 'CredentialsError' ||
        errorObj.message?.includes('credentials')
      ) {
        error.value = 'AWS credentials not found or invalid. Please configure your AWS credentials.'
      } else if (errorObj.name === 'NetworkError' || errorObj.message?.includes('network')) {
        error.value = 'Network error. Please check your internet connection.'
      } else if (errorObj.message?.includes('CORS')) {
        error.value = 'CORS error. S3 bucket CORS configuration may be incorrect.'
      } else if (errorObj.message?.includes('fetch')) {
        error.value = 'Network request failed. Check your internet connection and S3 configuration.'
      } else {
        error.value = 'Failed to load project config. Please check your connection and try again.'
      }
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
    debugError,
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
