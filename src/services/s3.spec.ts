import { describe, it, expect, beforeEach, vi } from 'vitest'
import { S3Service } from '@/services/s3'
import type { ProjectConfig } from '@/types'

describe('S3 Service', () => {
  let s3Service: S3Service
  const mockApiKey = 'test-api-key-123'
  const mockProjectId = 'test-project-001'

  beforeEach(() => {
    s3Service = new S3Service(mockApiKey)
    vi.clearAllMocks()
  })

  describe('Config Operations', () => {
    it('should upload config to S3', async () => {
      const mockConfig: ProjectConfig = {
        totalFrames: 24,
        fps: 12,
        aspectRatio: 16 / 9,
        frames: [{ frame: 0, taken: false, filename: null, note: 'Start' }],
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
      } as Response)

      await s3Service.uploadConfig(mockProjectId, mockConfig)

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining(`projects/${mockProjectId}/config.json`),
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockApiKey}`,
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify(mockConfig),
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

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockConfig),
      } as Response)

      const result = await s3Service.downloadConfig(mockProjectId)

      expect(result).toEqual(mockConfig)
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining(`projects/${mockProjectId}/config.json`),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockApiKey}`,
          }),
        }),
      )
    })

    it('should handle config download errors', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response)

      await expect(s3Service.downloadConfig(mockProjectId)).rejects.toThrow(
        'Failed to download config',
      )
    })
  })

  describe('Image Operations', () => {
    it('should upload image to S3', async () => {
      const mockBlob = new Blob(['fake-image-data'], { type: 'image/webp' })
      const frameNumber = 5

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
      } as Response)

      await s3Service.uploadImage(mockProjectId, frameNumber, mockBlob)

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining(`projects/${mockProjectId}/frame_0005.webp`),
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockApiKey}`,
            'Content-Type': 'image/webp',
          }),
          body: mockBlob,
        }),
      )
    })

    it('should download image from S3', async () => {
      const mockBlob = new Blob(['fake-image-data'], { type: 'image/webp' })
      const frameNumber = 3

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      } as Response)

      const result = await s3Service.downloadImage(mockProjectId, frameNumber)

      expect(result).toEqual(mockBlob)
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining(`projects/${mockProjectId}/frame_0003.webp`),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockApiKey}`,
          }),
        }),
      )
    })

    it('should handle image upload errors', async () => {
      const mockBlob = new Blob(['fake-image-data'], { type: 'image/webp' })

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 403,
      } as Response)

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

    it('should build correct S3 URLs', () => {
      const configUrl = s3Service.getConfigUrl(mockProjectId)
      const imageUrl = s3Service.getImageUrl(mockProjectId, 5)

      expect(configUrl).toContain(`projects/${mockProjectId}/config.json`)
      expect(imageUrl).toContain(`projects/${mockProjectId}/frame_0005.webp`)
    })
  })

  describe('Batch Operations', () => {
    it('should sync multiple frames', async () => {
      const framesToSync = [
        { frame: 1, blob: new Blob(['data1'], { type: 'image/webp' }) },
        { frame: 2, blob: new Blob(['data2'], { type: 'image/webp' }) },
      ]

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
      } as Response)

      const results = await s3Service.syncFrames(mockProjectId, framesToSync)

      expect(results).toHaveLength(2)
      expect(fetch).toHaveBeenCalledTimes(2)
      expect(results.every((r) => r.success)).toBe(true)
    })

    it('should handle partial sync failures', async () => {
      const framesToSync = [
        { frame: 1, blob: new Blob(['data1'], { type: 'image/webp' }) },
        { frame: 2, blob: new Blob(['data2'], { type: 'image/webp' }) },
      ]

      vi.mocked(fetch)
        .mockResolvedValueOnce({ ok: true, status: 200 } as Response)
        .mockResolvedValueOnce({ ok: false, status: 500 } as Response)

      const results = await s3Service.syncFrames(mockProjectId, framesToSync)

      expect(results).toHaveLength(2)
      expect(results[0].success).toBe(true)
      expect(results[1].success).toBe(false)
      expect(results[1].error).toBeDefined()
    })
  })
})
