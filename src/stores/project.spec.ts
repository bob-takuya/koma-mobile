import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useProjectStore } from '@/stores/project'
import type { ProjectConfig, Frame } from '@/types'

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
      expect(store.apiKey).toBeNull()
    })
  })

  describe('API Key Management', () => {
    it('should set API key and save to localStorage', () => {
      const store = useProjectStore()
      const apiKey = 'test-api-key-123'

      store.setApiKey(apiKey)

      expect(store.apiKey).toBe(apiKey)
      expect(localStorage.setItem).toHaveBeenCalledWith('stopmotion-api-key', apiKey)
    })

    it('should load API key from localStorage on init', () => {
      const apiKey = 'stored-api-key-456'
      vi.mocked(localStorage.getItem).mockReturnValue(apiKey)

      const store = useProjectStore()
      store.loadApiKey()

      expect(store.apiKey).toBe(apiKey)
    })

    it('should clear API key', () => {
      const store = useProjectStore()
      store.setApiKey('test-key')

      store.clearApiKey()

      expect(store.apiKey).toBeNull()
      expect(localStorage.removeItem).toHaveBeenCalledWith('stopmotion-api-key')
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

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockConfig),
      } as Response)

      const store = useProjectStore()
      store.setApiKey('test-key')

      await store.loadConfig('test-project')

      expect(store.config).toEqual(mockConfig)
      expect(store.isLoading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('should handle config loading errors', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

      const store = useProjectStore()
      store.setApiKey('test-key')

      await store.loadConfig('test-project')

      expect(store.config).toBeNull()
      expect(store.error).toBe('Failed to load project config')
      expect(store.isLoading).toBe(false)
    })

    it('should save config to S3', async () => {
      const mockConfig: ProjectConfig = {
        totalFrames: 24,
        fps: 12,
        aspectRatio: 16 / 9,
        frames: [],
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
      } as Response)

      const store = useProjectStore()
      store.setApiKey('test-key')
      store.config = mockConfig

      await store.saveConfig('test-project')

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('config.json'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(mockConfig),
        }),
      )
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
