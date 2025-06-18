import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
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
  private s3Client: S3Client
  private bucket: string

  constructor() {
    const region = import.meta.env.VITE_S3_REGION
    this.bucket = import.meta.env.VITE_S3_BUCKET

    // パブリックバケットなので認証不要
    // 協働作業のためにパブリック読み書き権限を設定済み
    this.s3Client = new S3Client({
      region,
      // パブリックアクセス用、credentials不要
    })
  }

  /**
   * 写真をS3にアップロード
   */
  async uploadImage(projectId: string, frameNumber: number, blob: Blob): Promise<void> {
    const key = `projects/${projectId}/frames/frame-${String(frameNumber).padStart(4, '0')}.jpg`

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: new Uint8Array(await blob.arrayBuffer()),
      ContentType: 'image/jpeg',
    })

    await this.s3Client.send(command)
  }

  /**
   * 設定ファイルをS3にアップロード
   */
  async uploadConfig(projectId: string, config: ProjectConfig): Promise<void> {
    const key = `projects/${projectId}/config.json`

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: JSON.stringify(config, null, 2),
      ContentType: 'application/json',
    })

    await this.s3Client.send(command)
  }

  /**
   * 設定ファイルをS3からダウンロード
   */
  async downloadConfig(projectId: string): Promise<ProjectConfig> {
    const key = `projects/${projectId}/config.json`

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    })

    const response = await this.s3Client.send(command)
    const body = await response.Body?.transformToString()

    if (!body) {
      throw new Error('Config file not found')
    }

    return JSON.parse(body) as ProjectConfig
  }

  /**
   * 写真をS3からダウンロード
   */
  async downloadImage(projectId: string, frameNumber: number): Promise<Blob> {
    const key = `projects/${projectId}/frames/frame-${String(frameNumber).padStart(4, '0')}.jpg`

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    })

    const response = await this.s3Client.send(command)
    const body = await response.Body?.transformToByteArray()

    if (!body) {
      throw new Error('Image not found')
    }

    return new Blob([body], { type: 'image/jpeg' })
  }

  /**
   * 複数フレームを一括同期
   */
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
}
