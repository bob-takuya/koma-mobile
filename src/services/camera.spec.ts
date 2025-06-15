import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CameraService } from '@/services/camera'

describe('Camera Service', () => {
  let cameraService: CameraService
  let mockStream: MediaStream
  let mockVideoTrack: MediaStreamTrack

  beforeEach(() => {
    mockVideoTrack = {
      stop: vi.fn(),
      kind: 'video',
      id: 'video-track-1',
      enabled: true,
      readyState: 'live',
    } as any

    mockStream = {
      getVideoTracks: vi.fn().mockReturnValue([mockVideoTrack]),
      getTracks: vi.fn().mockReturnValue([mockVideoTrack]),
    } as any

    vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValue(mockStream)

    cameraService = new CameraService()
  })

  describe('Camera Initialization', () => {
    it('should start camera with correct constraints', async () => {
      await cameraService.startCamera()

      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      })
      expect(cameraService.isActive).toBe(true)
    })

    it('should handle camera start errors', async () => {
      const error = new Error('Camera not available')
      vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(error)

      await expect(cameraService.startCamera()).rejects.toThrow('Camera not available')
      expect(cameraService.isActive).toBe(false)
    })

    it('should stop camera', async () => {
      await cameraService.startCamera()
      cameraService.stopCamera()

      expect(mockVideoTrack.stop).toHaveBeenCalled()
      expect(cameraService.isActive).toBe(false)
    })
  })

  describe('Photo Capture', () => {
    it('should capture photo and convert to WebP', async () => {
      const mockCanvas = document.createElement('canvas')
      const mockContext = {
        drawImage: vi.fn(),
      } as any

      mockCanvas.getContext = vi.fn().mockReturnValue(mockContext)
      vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas)

      const mockBlob = new Blob(['fake-webp-data'], { type: 'image/webp' })
      mockCanvas.toBlob = vi.fn().mockImplementation((callback) => {
        callback(mockBlob)
      })

      await cameraService.startCamera()
      const videoElement = document.createElement('video')
      // Mock video element properties
      Object.defineProperty(videoElement, 'videoWidth', { value: 1920, writable: false })
      Object.defineProperty(videoElement, 'videoHeight', { value: 1080, writable: false })

      const result = await cameraService.capturePhoto(videoElement)

      expect(result).toBeInstanceOf(Blob)
      expect(result?.type).toBe('image/webp')
      expect(mockContext.drawImage).toHaveBeenCalledWith(videoElement, 0, 0, 1920, 1080)
    })

    it('should handle capture errors', async () => {
      const videoElement = document.createElement('video')

      await expect(cameraService.capturePhoto(videoElement)).rejects.toThrow()
    })
  })

  describe('Camera Permissions', () => {
    it('should check camera permissions', async () => {
      // Mock permissions API
      Object.defineProperty(navigator, 'permissions', {
        value: {
          query: vi.fn().mockResolvedValue({ state: 'granted' }),
        },
      })

      const hasPermission = await cameraService.checkPermissions()
      expect(hasPermission).toBe(true)
    })

    it('should handle permission denied', async () => {
      // Skip this test if permissions property is already defined
      if ('permissions' in navigator) {
        // Mock the query method instead
        const mockQuery = vi.fn().mockResolvedValue({ state: 'denied' })
        vi.mocked(navigator.permissions.query).mockImplementation(mockQuery)
      } else {
        Object.defineProperty(navigator, 'permissions', {
          value: {
            query: vi.fn().mockResolvedValue({ state: 'denied' }),
          },
          configurable: true,
        })
      }

      const hasPermission = await cameraService.checkPermissions()
      expect(hasPermission).toBe(false)
    })
  })
})
