import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useProjectStore } from '@/stores/project'
import { S3Service } from '@/services/s3'
import type { ProjectConfig, Frame } from '@/types'

// Mock the S3 service
vi.mock('@/services/s3', () => ({
  S3Service: vi.fn().mockImplementation(() => ({
    downloadConfig: vi.fn(),
    uploadConfig: vi.fn(),
    downloadImage: vi.fn(),
    uploadImage: vi.fn(),
    checkProjectExists: vi.fn(),
  })),
}))

describe('Project Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const store = useProjectStore()

      expect(store.config).toBeNull()
      expect(store.currentFrame).toBe(0)
      expect(store.isLoading).toBe(false)
      expect(store.error).toBeNull()
      expect(store.debugError).toBeNull()
      expect(store.bucketName).toBeNull()
    })
  })

  describe('Bucket Name Management', () => {
    it('should set bucket name and save to localStorage', () => {
      const store = useProjectStore()
      const bucketName = 'test-bucket-name-123'

      store.setBucketName(bucketName)

      expect(store.bucketName).toBe(bucketName)
      expect(localStorage.setItem).toHaveBeenCalledWith('stopmotion-bucket-name', bucketName)
    })

    it('should load bucket name from localStorage on init', () => {
      const bucketName = 'stored-bucket-name-456'
      vi.mocked(localStorage.getItem).mockReturnValue(bucketName)

      const store = useProjectStore()
      store.loadBucketName()

      expect(store.bucketName).toBe(bucketName)
    })

    it('should clear bucket name', () => {
      const store = useProjectStore()
      store.setBucketName('test-bucket')

      store.clearBucketName()

      expect(store.bucketName).toBeNull()
      expect(localStorage.removeItem).toHaveBeenCalledWith('stopmotion-bucket-name')
    })
  })

  describe('Config Management', () => {
    it('should load project config from S3', async () => {
      const mockConfig: ProjectConfig = {
        totalFrames: 24,
        fps: 12,
        aspectRatio: 16 / 9,
        frames: [
          { frame: 0, taken: false, filename: null, note: 'Start' },
          { frame: 1, taken: true, filename: 'frame_001.webp', note: null },
        ],
      }

      const mockS3Service = {
        checkProjectExists: vi.fn().mockResolvedValue(true),
        downloadConfig: vi.fn().mockResolvedValue(mockConfig),
        uploadConfig: vi.fn(),
        downloadImage: vi.fn(),
        uploadImage: vi.fn(),
      }

      vi.mocked(S3Service).mockImplementation(() => mockS3Service as any)

      const store = useProjectStore()
      store.setBucketName('test-bucket')

      await store.loadConfig('test-project')

      expect(mockS3Service.checkProjectExists).toHaveBeenCalledWith('test-project')
      expect(mockS3Service.downloadConfig).toHaveBeenCalledWith('test-project')
      expect(store.config).toEqual(mockConfig)
      expect(store.isLoading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('should handle project not found error', async () => {
      const mockS3Service = {
        checkProjectExists: vi.fn().mockResolvedValue(false),
        downloadConfig: vi.fn(),
        uploadConfig: vi.fn(),
        downloadImage: vi.fn(),
        uploadImage: vi.fn(),
      }

      vi.mocked(S3Service).mockImplementation(() => mockS3Service as any)

      const store = useProjectStore()
      store.setBucketName('test-bucket')

      await store.loadConfig('non-existent-project')

      expect(mockS3Service.checkProjectExists).toHaveBeenCalledWith('non-existent-project')
      expect(mockS3Service.downloadConfig).not.toHaveBeenCalled()
      expect(store.config).toBeNull()
      expect(store.error).toBe('Project not found. Please check the project ID.')
      expect(store.debugError).toContain('Project check failed for: non-existent-project')
      expect(store.isLoading).toBe(false)
    })

    it('should handle config loading errors', async () => {
      const mockS3Service = {
        checkProjectExists: vi.fn().mockResolvedValue(true),
        downloadConfig: vi.fn().mockRejectedValue(new Error('Network error')),
        uploadConfig: vi.fn(),
        downloadImage: vi.fn(),
        uploadImage: vi.fn(),
      }

      vi.mocked(S3Service).mockImplementation(() => mockS3Service as any)

      const store = useProjectStore()
      store.setBucketName('test-bucket')

      await store.loadConfig('test-project')

      expect(store.config).toBeNull()
      expect(store.error).toBe('Failed to load project config. Please check your connection and try again.')
      expect(store.debugError).toContain('Error details: Network error')
      expect(store.isLoading).toBe(false)
    })

    it('should handle bucket not found error', async () => {
      const mockS3Service = {
        checkProjectExists: vi.fn().mockRejectedValue({ name: 'NoSuchBucket' }),
        downloadConfig: vi.fn(),
        uploadConfig: vi.fn(),
        downloadImage: vi.fn(),
        uploadImage: vi.fn(),
      }

      vi.mocked(S3Service).mockImplementation(() => mockS3Service as any)

      const store = useProjectStore()
      store.setBucketName('non-existent-bucket')

      await store.loadConfig('test-project')

      expect(store.config).toBeNull()
      expect(store.error).toBe('S3 bucket not found. Please check the bucket name.')
      expect(store.debugError).toContain('Error name: NoSuchBucket')
      expect(store.isLoading).toBe(false)
    })

    it('should save config to S3', async () => {
      const mockConfig: ProjectConfig = {
        totalFrames: 24,
        fps: 12,
        aspectRatio: 16 / 9,
        frames: [],
      }

      const mockS3Service = {
        checkProjectExists: vi.fn(),
        downloadConfig: vi.fn(),
        uploadConfig: vi.fn().mockResolvedValue(undefined),
        downloadImage: vi.fn(),
        uploadImage: vi.fn(),
      }

      vi.mocked(S3Service).mockImplementation(() => mockS3Service as any)

      const store = useProjectStore()
      store.setBucketName('test-bucket')
      store.config = mockConfig

      await store.saveConfig('test-project')

      expect(mockS3Service.uploadConfig).toHaveBeenCalledWith('test-project', mockConfig)
      expect(store.error).toBeNull()
      expect(store.isLoading).toBe(false)
    })
  })

  describe('Frame Navigation', () => {
    it('should set current frame within bounds', () => {
      const store = useProjectStore()
      store.config = {
        totalFrames: 10,
        fps: 12,
        aspectRatio: 16 / 9,
        frames: new Array(10).fill(null).map((_, i) => ({
          frame: i,
          taken: false,
          filename: null,
          note: null,
        })),
      }

      store.setCurrentFrame(5)
      expect(store.currentFrame).toBe(5)

      store.setCurrentFrame(-1)
      expect(store.currentFrame).toBe(0)

      store.setCurrentFrame(15)
      expect(store.currentFrame).toBe(9)
    })

    it('should get current frame data', () => {
      const store = useProjectStore()
      const frameData: Frame = { frame: 2, taken: true, filename: 'frame_002.webp', note: 'Test' }

      store.config = {
        totalFrames: 5,
        fps: 12,
        aspectRatio: 16 / 9,
        frames: [
          { frame: 0, taken: false, filename: null, note: null },
          { frame: 1, taken: false, filename: null, note: null },
          frameData,
          { frame: 3, taken: false, filename: null, note: null },
          { frame: 4, taken: false, filename: null, note: null },
        ],
      }
      store.currentFrame = 2

      expect(store.getCurrentFrameData).toEqual(frameData)
    })
  })

  describe('Frame Operations', () => {
    it('should mark frame as taken', () => {
      const store = useProjectStore()
      store.config = {
        totalFrames: 3,
        fps: 12,
        aspectRatio: 16 / 9,
        frames: [
          { frame: 0, taken: false, filename: null, note: null },
          { frame: 1, taken: false, filename: null, note: null },
          { frame: 2, taken: false, filename: null, note: null },
        ],
      }

      store.markFrameTaken(1, 'frame_001.webp')

      expect(store.config.frames[1].taken).toBe(true)
      expect(store.config.frames[1].filename).toBe('frame_001.webp')
    })

    it('should get taken frames count', () => {
      const store = useProjectStore()
      store.config = {
        totalFrames: 5,
        fps: 12,
        aspectRatio: 16 / 9,
        frames: [
          { frame: 0, taken: true, filename: 'frame_000.webp', note: null },
          { frame: 1, taken: false, filename: null, note: null },
          { frame: 2, taken: true, filename: 'frame_002.webp', note: null },
          { frame: 3, taken: false, filename: null, note: null },
          { frame: 4, taken: true, filename: 'frame_004.webp', note: null },
        ],
      }

      expect(store.takenFramesCount).toBe(3)
    })
  })
})
