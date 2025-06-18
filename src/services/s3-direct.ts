import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
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
  private s3Client: S3Client
  private configCache: Map<string, { data: ProjectConfig; timestamp: number }> = new Map()
  private imageCache: Map<string, { blob: Blob; timestamp: number }> = new Map()

  constructor(bucketName: string, region: string = 'ap-northeast-1') {
    this.bucketName = bucketName
    this.s3Client = new S3Client({
      region,
      // 認証はブラウザ側で設定されたAWS認証情報を使用
      // 実際の本番環境では適切な認証設定が必要
    })
  }

  async uploadConfig(projectId: string, config: ProjectConfig): Promise<void> {
    const key = `projects/${projectId}/config.json`

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: JSON.stringify(config),
        ContentType: 'application/json',
      })

      await this.s3Client.send(command)
    } catch (error) {
      throw new Error(`Failed to upload config: ${error}`)
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

    const key = `projects/${projectId}/config.json`

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      })

      const response = await this.s3Client.send(command)
      const body = await response.Body?.transformToString()

      if (!body) {
        throw new Error('Config file not found')
      }

      const data = JSON.parse(body) as ProjectConfig

      // キャッシュに保存
      this.configCache.set(cacheKey, {
        data,
        timestamp: Date.now(),
      })

      return data
    } catch (error) {
      throw new Error(`Failed to download config: ${error}`)
    }
  }

  async uploadImage(projectId: string, frameNumber: number, blob: Blob): Promise<void> {
    const key = this.getImageKey(projectId, frameNumber)

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: blob,
        ContentType: 'image/webp',
      })

      await this.s3Client.send(command)
    } catch (error) {
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

    const key = this.getImageKey(projectId, frameNumber)

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      })

      const response = await this.s3Client.send(command)
      const byteArray = await response.Body?.transformToByteArray()

      if (!byteArray) {
        throw new Error('Image not found')
      }

      const blob = new Blob([byteArray], { type: 'image/webp' })

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

  private getImageKey(projectId: string, frameNumber: number): string {
    const filename = this.getFrameFilename(frameNumber)
    return `projects/${projectId}/${filename}`
  }

  updateBucketName(bucketName: string): void {
    this.bucketName = bucketName
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
