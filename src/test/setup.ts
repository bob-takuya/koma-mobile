import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock getUserMedia for camera tests
Object.defineProperty(window, 'navigator', {
  value: {
    mediaDevices: {
      getUserMedia: vi.fn(),
    },
  },
  writable: true,
})

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
}
global.localStorage = localStorageMock as Storage

// Mock fetch for S3 API calls
global.fetch = vi.fn()

// Mock canvas methods for WebP conversion
HTMLCanvasElement.prototype.toBlob = vi.fn()
HTMLCanvasElement.prototype.getContext = vi.fn()
