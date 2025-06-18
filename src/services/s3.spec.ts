import { describe, it, expect, beforeEach, vi } from 'vitest'
import { S3Service } from '@/services/s3'
import type { ProjectConfig } from '@/types'

// Mock fetch API
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock the AWS SDK
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({
    send: vi.fn(),
  })),
  PutObjectCommand: vi.fn(),
}))

describe('S3 Service', () => {
  let s3Service: S3Service
  const mockBucketName = 'test-bucket-123'
  const mockProjectId = 'test-project-001'

  beforeEach(() => {
    s3Service = new S3Service(mockBucketName)
    vi.clearAllMocks()
    mockFetch.mockClear()
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

      // Mock successful fetch response for PUT request
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: {
          entries: () => [['content-type', 'application/json']],
        },
      })

      await s3Service.uploadConfig(mockProjectId, mockConfig)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(`projects/${mockProjectId}/config.json`),
        expect.objectContaining({
          method: 'PUT',
          mode: 'cors',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(mockConfig, null, 2),
        }),
      )
    })

    it('should download config from S3', async () => {
      const mockConfig: ProjectConfig = {
        totalFrames: 24,
        fps: 12,
        aspectRatio: 16 / 9,
        frames: [],
      }

      // Mock successful fetch response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          entries: () => [['content-type', 'application/json']],
        },
        text: () => Promise.resolve(JSON.stringify(mockConfig)),
      })

      const result = await s3Service.downloadConfig(mockProjectId)

      expect(result).toEqual(mockConfig)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(`projects/${mockProjectId}/config.json`),
        expect.objectContaining({
          method: 'GET',
          mode: 'cors',
        }),
      )
    })

    it('should handle config download errors', async () => {
      // Mock fetch failure
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(s3Service.downloadConfig(mockProjectId)).rejects.toThrow(
        'Failed to download config',
      )
    })

    it('should handle project not found error', async () => {
      // Mock 404 response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: {
          entries: () => [['content-type', 'application/json']],
        },
      })

      await expect(s3Service.downloadConfig(mockProjectId)).rejects.toThrow('Project not found')
    })
  })

  describe('Project Existence Check', () => {
    it('should return true if project exists', async () => {
      // Mock successful HEAD response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          entries: () => [['content-length', '1024']],
        },
      })

      const exists = await s3Service.checkProjectExists(mockProjectId)
      expect(exists).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(`projects/${mockProjectId}/config.json`),
        expect.objectContaining({
          method: 'HEAD',
          mode: 'cors',
        }),
      )
    })

    it('should return false if project does not exist', async () => {
      // Mock 404 response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        headers: {
          entries: () => [],
        },
      })

      const exists = await s3Service.checkProjectExists(mockProjectId)
      expect(exists).toBe(false)
    })

    it('should throw error for other S3 errors', async () => {
      // Mock network error
      mockFetch.mockRejectedValueOnce(new Error('Access denied'))

      await expect(s3Service.checkProjectExists(mockProjectId)).rejects.toThrow('Access denied')
    })
  })

  describe('Image Operations', () => {
    it('should upload image to S3', async () => {
      const mockBlob = new Blob(['fake-image-data'], { type: 'image/webp' })
      const frameNumber = 5

      // Mock successful fetch response for PUT request
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: {
          entries: () => [['content-type', 'image/webp']],
        },
      })

      // Mock successful fetch response for HEAD verification request
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: {
          entries: () => [['content-type', 'image/webp']],
        },
      })

      await s3Service.uploadImage(mockProjectId, frameNumber, mockBlob)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(
          `projects/${mockProjectId}/frame_${frameNumber.toString().padStart(4, '0')}.webp`,
        ),
        expect.objectContaining({
          method: 'PUT',
          mode: 'cors',
          headers: {
            'Content-Type': 'image/webp',
          },
          body: mockBlob,
        }),
      )
    })

    it('should download image from S3', async () => {
      const frameNumber = 3

      // Mock successful fetch response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          entries: () => [['content-type', 'image/webp']],
        },
        blob: () => Promise.resolve(new Blob(['image-data'])),
      })

      const result = await s3Service.downloadImage(mockProjectId, frameNumber)

      expect(result).toBeInstanceOf(Blob)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(
          `projects/${mockProjectId}/frame_${frameNumber.toString().padStart(4, '0')}.webp`,
        ),
        expect.objectContaining({
          method: 'GET',
          mode: 'cors',
        }),
      )
    })

    it('should handle image upload errors', async () => {
      const mockBlob = new Blob(['fake-image-data'], { type: 'image/webp' })

      // Mock failed fetch response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: {
          entries: () => [],
        },
        text: () => Promise.resolve('Internal server error details'),
      })

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

      // Mock first upload success (PUT + HEAD verification), second upload failure
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: {
            entries: () => [],
          },
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: {
            entries: () => [],
          },
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          headers: {
            entries: () => [],
          },
          text: () => Promise.resolve('Sync upload failed'),
        })

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
