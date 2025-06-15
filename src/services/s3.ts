import type { ProjectConfig } from '@/types'

export interface SyncResult {
  frame: number
  success: boolean
  error?: string
}

export interface FrameToSync {
  frame: number
  blob: Blob
}

export class S3Service {
  private apiKey: string
  private baseURL: string
  private configCache: Map<string, { data: ProjectConfig; timestamp: number }> = new Map()
  private imageCache: Map<string, { blob: Blob; timestamp: number }> = new Map()

  constructor(apiKey: string, baseURL?: string) {
    this.apiKey = apiKey
    this.baseURL = baseURL || import.meta.env.VITE_API_BASE_URL || '/api'
  }

  async uploadConfig(projectId: string, config: ProjectConfig): Promise<void> {
    const url = this.getConfigUrl(projectId)

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    })

    if (!response.ok) {
      throw new Error(`Failed to upload config: ${response.status}`)
    }
  }

  async downloadConfig(projectId: string): Promise<ProjectConfig> {
    const cacheKey = `config-${projectId}`
    const cached = this.configCache.get(cacheKey)
    const configCacheTTL = Number(import.meta.env.VITE_CONFIG_CACHE_TTL) * 1000 || 60000 // デフォルト60秒

    // キャッシュチェック
    if (cached && Date.now() - cached.timestamp < configCacheTTL) {
      return cached.data
    }

    const url = this.getConfigUrl(projectId)

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Cache-Control': 'max-age=60', // 1分間のキャッシュ
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to download config: ${response.status}`)
    }

    const data = await response.json()
    
    // キャッシュに保存
    this.configCache.set(cacheKey, {
      data,
      timestamp: Date.now()
    })

    return data
  }

  async uploadImage(projectId: string, frameNumber: number, blob: Blob): Promise<void> {
    const url = this.getImageUrl(projectId, frameNumber)

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'image/webp',
      },
      body: blob,
    })

    if (!response.ok) {
      throw new Error(`Failed to upload image: ${response.status}`)
    }
  }

  async downloadImage(projectId: string, frameNumber: number): Promise<Blob> {
    const cacheKey = `image-${projectId}-${frameNumber}`
    const cached = this.imageCache.get(cacheKey)
    const imageCacheTTL = Number(import.meta.env.VITE_IMAGE_CACHE_TTL) * 1000 || 3600000 // デフォルト1時間

    // キャッシュチェック
    if (cached && Date.now() - cached.timestamp < imageCacheTTL) {
      return cached.blob
    }

    const url = this.getImageUrl(projectId, frameNumber)

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Cache-Control': 'max-age=3600', // 1時間のキャッシュ
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status}`)
    }

    const blob = await response.blob()
    
    // キャッシュに保存
    this.imageCache.set(cacheKey, {
      blob,
      timestamp: Date.now()
    })

    return blob
  }

  async syncFrames(projectId: string, frames: FrameToSync[]): Promise<SyncResult[]> {
    const results: SyncResult[] = []

    for (const frameData of frames) {
      try {
        await this.uploadImage(projectId, frameData.frame, frameData.blob)
        results.push({
          frame: frameData.frame,
          success: true,
        })
      } catch (error) {
        results.push({
          frame: frameData.frame,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return results
  }

  getFrameFilename(frameNumber: number): string {
    return `frame_${frameNumber.toString().padStart(4, '0')}.webp`
  }

  getConfigUrl(projectId: string): string {
    return `${this.baseURL}/projects/${projectId}/config.json`
  }

  getImageUrl(projectId: string, frameNumber: number): string {
    const filename = this.getFrameFilename(frameNumber)
    return `${this.baseURL}/projects/${projectId}/${filename}`
  }

  updateApiKey(apiKey: string): void {
    this.apiKey = apiKey
  }

  clearCache(): void {
    this.configCache.clear()
    this.imageCache.clear()
  }

  clearConfigCache(projectId?: string): void {
    if (projectId) {
      this.configCache.delete(`config-${projectId}`)
    } else {
      this.configCache.clear()
    }
  }

  clearImageCache(projectId?: string, frameNumber?: number): void {
    if (projectId && frameNumber !== undefined) {
      this.imageCache.delete(`image-${projectId}-${frameNumber}`)
    } else if (projectId) {
      // 特定プロジェクトの画像キャッシュをクリア
      for (const key of this.imageCache.keys()) {
        if (key.startsWith(`image-${projectId}-`)) {
          this.imageCache.delete(key)
        }
      }
    } else {
      this.imageCache.clear()
    }
  }
}
