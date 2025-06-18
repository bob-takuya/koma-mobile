import { S3Client } from '@aws-sdk/client-s3'
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
  private bucketName: string
  private region: string
  private s3Client: S3Client
  private configCache: Map<string, { data: ProjectConfig; timestamp: number }> = new Map()
  private imageCache: Map<string, { blob: Blob; timestamp: number }> = new Map()

  constructor(bucketName: string, region: string = 'ap-northeast-1') {
    this.bucketName = bucketName
    this.region = region

    // パブリックアクセス用のS3Client設定
    this.s3Client = new S3Client({
      region,
      // 完全匿名アクセス：認証情報を指定しない
      // パブリックアクセス用の設定
      forcePathStyle: false,
      useAccelerateEndpoint: false,
      maxAttempts: 3,
      requestHandler: {
        requestTimeout: 30000,
      },
      // 追加の匿名アクセス設定
      tls: true,
      apiVersion: '2006-03-01',
      // CORS設定
      useGlobalEndpoint: false,
      disableHostPrefix: false,
    })

    // デバッグ用：認証情報の確認
    console.log('S3Client initialized for anonymous access:', {
      bucketName: this.bucketName,
      region,
      anonymousAccess: true,
      credentialsType: 'anonymous',
      userAgent: navigator.userAgent,
      location: window.location.href,
    })
  }

  async uploadConfig(projectId: string, config: ProjectConfig): Promise<void> {
    const key = `projects/${projectId}/config.json`
    const url = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`

    console.log('Uploading config via direct HTTP PUT:', { projectId, key, url })

    try {
      const configJson = JSON.stringify(config, null, 2)
      const response = await fetch(url, {
        method: 'PUT',
        body: configJson,
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors',
      })

      console.log('Config upload response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      console.log('Config uploaded successfully via direct HTTP PUT')
    } catch (error) {
      console.error('Failed to upload config via direct HTTP PUT:', error)
      throw new Error(`Failed to upload config: ${error}`)
    }
  }

  async downloadConfig(projectId: string): Promise<ProjectConfig> {
    const cacheKey = `config-${projectId}`
    const cached = this.configCache.get(cacheKey)
    const configCacheTTL = Number(import.meta.env.VITE_CONFIG_CACHE_TTL) * 1000 || 60000 // デフォルト60秒

    // キャッシュチェック
    if (cached && Date.now() - cached.timestamp < configCacheTTL) {
      console.log('Using cached config for project:', projectId)
      return cached.data
    }

    const key = `projects/${projectId}/config.json`
    const url = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`
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
        headers: response.headers ? Object.fromEntries(response.headers.entries()) : {},
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

      // キャッシュに保存
      this.configCache.set(cacheKey, {
        data,
        timestamp: Date.now(),
      })

      return data
    } catch (error: unknown) {
      console.error('S3 direct HTTP downloadConfig error:', error)

      // プロジェクトが存在しない場合のエラーを特別に処理
      if (error instanceof Error && error.message === 'Project not found') {
        throw error
      }

      // その他のエラー
      const errorMessage = error instanceof Error ? error.message : String(error)
      const enhancedError = new Error(`Failed to download config: ${errorMessage}`) as Error & {
        name: string
        code: string
        originalError: unknown
      }
      enhancedError.name = error instanceof Error ? error.name : 'HTTPError'
      enhancedError.code =
        'code' in (error as object) ? (error as { code: string }).code : 'UNKNOWN'
      enhancedError.originalError = error
      throw enhancedError
    }
  }

  async checkProjectExists(projectId: string): Promise<boolean> {
    const key = `projects/${projectId}/config.json`
    const url = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`
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

      // ネットワークエラーの場合
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        const enhancedError = new Error(
          'Network error - check your internet connection and S3 bucket CORS configuration',
        ) as Error & {
          name: string
          code: string
          originalError: unknown
        }
        enhancedError.name = 'NetworkError'
        enhancedError.code = 'NETWORK'
        enhancedError.originalError = error
        throw enhancedError
      }

      // その他のエラー
      const errorMessage = error instanceof Error ? error.message : String(error)
      const enhancedError = new Error(
        `Failed to check project existence: ${errorMessage}`,
      ) as Error & {
        name: string
        code: string
        originalError: unknown
      }
      enhancedError.name = error instanceof Error ? error.name : 'HTTPError'
      enhancedError.code =
        'code' in (error as object) ? (error as { code: string }).code : 'UNKNOWN'
      enhancedError.originalError = error
      throw enhancedError
    }
  }

  async uploadImage(projectId: string, frameNumber: number, blob: Blob): Promise<void> {
    const key = `projects/${projectId}/${this.getFrameFilename(frameNumber)}`
    const url = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`

    console.log('uploadImage starting:', { 
      projectId, 
      frameNumber, 
      key, 
      url, 
      blobSize: blob.size,
      blobType: blob.type,
      timestamp: new Date().toISOString()
    })

    try {
      const response = await fetch(url, {
        method: 'PUT',
        body: blob,
        headers: {
          'Content-Type': 'image/webp',
        },
        mode: 'cors',
      })

      console.log('Upload response details:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries()),
        url: response.url,
        type: response.type,
        redirected: response.redirected,
        timestamp: new Date().toISOString()
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unable to read error response')
        console.error('Upload failed with response body:', errorText)
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`)
      }

      // Verify upload by attempting a HEAD request
      console.log('Verifying upload with HEAD request...')
      const verifyResponse = await fetch(url, {
        method: 'HEAD',
        mode: 'cors',
      })

      console.log('Verification response:', {
        status: verifyResponse.status,
        ok: verifyResponse.ok,
        timestamp: new Date().toISOString()
      })

      if (verifyResponse.ok) {
        console.log('✅ Image upload verified successfully via HEAD request')
      } else {
        console.warn('⚠️ Upload verification failed - file may not be accessible')
      }

      console.log('Image uploaded successfully via direct HTTP PUT')
    } catch (error) {
      console.error('Failed to upload image via direct HTTP PUT:', {
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      })
      throw new Error(`Failed to upload image: ${error}`)
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

    const key = `projects/${projectId}/${this.getFrameFilename(frameNumber)}`
    const url = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`

    try {
      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const blob = await response.blob()

      // キャッシュに保存
      this.imageCache.set(cacheKey, {
        blob,
        timestamp: Date.now(),
      })

      return blob
    } catch (error) {
      throw new Error(`Failed to download image: ${error}`)
    }
  }

  async syncFrames(projectId: string, frames: FrameToSync[]): Promise<SyncResult[]> {
    console.log(`🔄 Starting sync for ${frames.length} frames:`, {
      projectId,
      frames: frames.map(f => ({ frame: f.frame, blobSize: f.blob.size, blobType: f.blob.type })),
      timestamp: new Date().toISOString()
    })

    const results: SyncResult[] = []

    for (const frameData of frames) {
      console.log(`📤 Syncing frame ${frameData.frame}...`)
      try {
        await this.uploadImage(projectId, frameData.frame, frameData.blob)
        const result = {
          frame: frameData.frame,
          success: true,
        }
        results.push(result)
        console.log(`✅ Frame ${frameData.frame} synced successfully`)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        const result = {
          frame: frameData.frame,
          success: false,
          error: errorMessage,
        }
        results.push(result)
        console.error(`❌ Frame ${frameData.frame} sync failed:`, errorMessage)
      }
    }

    console.log('🏁 Sync completed:', {
      totalFrames: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
      timestamp: new Date().toISOString()
    })

    return results
  }

  getFrameFilename(frameNumber: number): string {
    return `frame_${frameNumber.toString().padStart(4, '0')}.webp`
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
