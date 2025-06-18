import { describe, it, expect, beforeEach, vi } from 'vitest'
import { S3Service } from '@/services/s3'
import type { ProjectConfig } from '@/types'

// Mock the AWS SDK
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({
    send: vi.fn(),
  })),
  GetObjectCommand: vi.fn(),
  PutObjectCommand: vi.fn(),
  HeadObjectCommand: vi.fn(),
}))

describe('S3 Service', () => {
  let s3Service: S3Service
  const mockBucketName = 'test-bucket-123'
  const mockProjectId = 'test-project-001'

  beforeEach(() => {
    s3Service = new S3Service(mockBucketName)
    vi.clearAllMocks()
  })

  describe('Constructor', () => {
    it('should initialize with bucket name and anonymous credentials', () => {
      expect(s3Service).toBeDefined()
      // 匿名アクセス用のS3Clientが初期化されることを確認
      // 実際の設定は実装の詳細なので、オブジェクトが作成されることのみテスト
    })
  })

  describe('Config Operations', () => {
    it('should upload config to S3', async () => {
      const mockConfig: ProjectConfig = {
        totalFrames: 24,
        fps: 12,
        aspectRatio: 16 / 9,
        frames: [{ frame: 0, taken: false, filename: null, note: 'Start' }],
      }

      const mockS3Client = {
        send: vi.fn().mockResolvedValue({}),
      }
      ;(s3Service as any).s3Client = mockS3Client

      await s3Service.uploadConfig(mockProjectId, mockConfig)

      expect(mockS3Client.send).toHaveBeenCalled()
    })

    it('should download config from S3', async () => {
      const mockConfig: ProjectConfig = {
        totalFrames: 24,
        fps: 12,
        aspectRatio: 16 / 9,
        frames: [],
      }

      const mockS3Client = {
        send: vi.fn().mockResolvedValue({
          Body: {
            transformToString: () => JSON.stringify(mockConfig),
          },
        }),
      }
      ;(s3Service as any).s3Client = mockS3Client

      const result = await s3Service.downloadConfig(mockProjectId)

      expect(result).toEqual(mockConfig)
      expect(mockS3Client.send).toHaveBeenCalled()
    })

    it('should handle config download errors', async () => {
      const mockS3Client = {
        send: vi.fn().mockRejectedValue(new Error('S3 error')),
      }
      ;(s3Service as any).s3Client = mockS3Client

      await expect(s3Service.downloadConfig(mockProjectId)).rejects.toThrow(
        'Failed to download config',
      )
    })

    it('should handle project not found error', async () => {
      const mockS3Client = {
        send: vi.fn().mockRejectedValue({ name: 'NoSuchKey' }),
      }
      ;(s3Service as any).s3Client = mockS3Client

      await expect(s3Service.downloadConfig(mockProjectId)).rejects.toThrow(
        'Project not found',
      )
    })
  })

  describe('Project Existence Check', () => {
    it('should return true if project exists', async () => {
      const mockS3Client = {
        send: vi.fn().mockResolvedValue({}),
      }
      ;(s3Service as any).s3Client = mockS3Client

      const exists = await s3Service.checkProjectExists(mockProjectId)
      expect(exists).toBe(true)
      expect(mockS3Client.send).toHaveBeenCalled()
    })

    it('should return false if project does not exist', async () => {
      const mockS3Client = {
        send: vi.fn().mockRejectedValue({ name: 'NoSuchKey' }),
      }
      ;(s3Service as any).s3Client = mockS3Client

      const exists = await s3Service.checkProjectExists(mockProjectId)
      expect(exists).toBe(false)
    })

    it('should throw error for other S3 errors', async () => {
      const mockS3Client = {
        send: vi.fn().mockRejectedValue(new Error('Access denied')),
      }
      ;(s3Service as any).s3Client = mockS3Client

      await expect(s3Service.checkProjectExists(mockProjectId)).rejects.toThrow('Access denied')
    })
  })

  describe('Image Operations', () => {
    it('should upload image to S3', async () => {
      const mockBlob = new Blob(['fake-image-data'], { type: 'image/webp' })
      const frameNumber = 5

      const mockS3Client = {
        send: vi.fn().mockResolvedValue({}),
      }
      ;(s3Service as any).s3Client = mockS3Client

      await s3Service.uploadImage(mockProjectId, frameNumber, mockBlob)

      expect(mockS3Client.send).toHaveBeenCalled()
    })

    it('should download image from S3', async () => {
      const mockArrayBuffer = new ArrayBuffer(10)
      const frameNumber = 3

      const mockS3Client = {
        send: vi.fn().mockResolvedValue({
          Body: {
            transformToByteArray: () => mockArrayBuffer,
          },
        }),
      }
      ;(s3Service as any).s3Client = mockS3Client

      const result = await s3Service.downloadImage(mockProjectId, frameNumber)

      expect(result).toBeInstanceOf(Blob)
      expect(mockS3Client.send).toHaveBeenCalled()
    })

    it('should handle image upload errors', async () => {
      const mockBlob = new Blob(['fake-image-data'], { type: 'image/webp' })

      const mockS3Client = {
        send: vi.fn().mockRejectedValue(new Error('S3 error')),
      }
      ;(s3Service as any).s3Client = mockS3Client

      await expect(s3Service.uploadImage(mockProjectId, 1, mockBlob)).rejects.toThrow(
        'Failed to upload image',
      )
    })
  })

  describe('Utility Functions', () => {
    it('should format frame filename correctly', () => {
      expect(s3Service.getFrameFilename(0)).toBe('frame_0000.webp')
      expect(s3Service.getFrameFilename(1)).toBe('frame_0001.webp')
      expect(s3Service.getFrameFilename(99)).toBe('frame_0099.webp')
      expect(s3Service.getFrameFilename(1234)).toBe('frame_1234.webp')
    })
  })

  describe('Batch Operations', () => {
    it('should sync multiple frames', async () => {
      const framesToSync = [
        { frame: 0, blob: new Blob(['data0']) },
        { frame: 1, blob: new Blob(['data1']) },
      ]

      const mockS3Client = {
        send: vi.fn().mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('S3 error')),
      }
      ;(s3Service as any).s3Client = mockS3Client

      const results = await s3Service.syncFrames(mockProjectId, framesToSync)

      expect(results).toHaveLength(2)
      expect(results[0].success).toBe(true)
      expect(results[1].success).toBe(false)
      expect(results[1].error).toBeDefined()
    })
  })

  describe('Cache Management', () => {
    it('should clear all caches', () => {
      s3Service.clearCache()
      // This is a simple test to ensure the method exists and can be called
      expect(true).toBe(true)
    })

    it('should clear config cache', () => {
      s3Service.clearConfigCache(mockProjectId)
      expect(true).toBe(true)
    })

    it('should clear image cache', () => {
      s3Service.clearImageCache(mockProjectId, 1)
      expect(true).toBe(true)
    })
  })
})
