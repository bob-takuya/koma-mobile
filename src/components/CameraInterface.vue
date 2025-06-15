<template>
  <div class="camera-interface landscape-layout">
    <!-- Camera Preview / Frame Image -->
    <div class="preview-container">
      <video
        v-if="showCamera && !getCurrentFrameData?.taken"
        ref="videoElement"
        data-testid="camera-preview"
        class="camera-preview"
        autoplay
        muted
        playsinline
      />

      <img
        v-else-if="getCurrentFrameData?.taken && frameImageUrl"
        :src="frameImageUrl"
        data-testid="frame-image"
        class="frame-image"
        alt="Captured frame"
      />

      <!-- Onion Skin Overlay -->
      <div v-if="showOnionSkin && onionSkinImages.length > 0" class="onion-skin-overlay">
        <img
          v-for="onionImage in onionSkinImages"
          :key="onionImage.frame"
          :src="onionImage.url"
          :style="{ opacity: onionImage.opacity }"
          class="onion-skin-image"
          alt="Onion skin frame"
        />
      </div>
    </div>

    <!-- Bottom Control Panel -->
    <div data-testid="bottom-panel" class="bottom-panel fixed-bottom transparent">
      <div class="controls-container">
        <!-- Frame Slider -->
        <div class="frame-slider-container">
          <label class="slider-label">Frame:</label>
          <input
            v-model="currentFrameValue"
            data-testid="frame-slider"
            type="range"
            :min="0"
            :max="totalFrames - 1"
            step="1"
            class="frame-slider"
            @input="handleFrameChange"
          />
          <span data-testid="frame-info" class="frame-info">
            Frame {{ currentFrame + 1 }} of {{ totalFrames }}
          </span>
        </div>

        <!-- Onion Skin Controls -->
        <div class="onion-skin-controls">
          <label class="slider-label">Onion Skin:</label>
          <input
            v-model.number="onionSkinFrames"
            data-testid="onion-skin-slider"
            type="range"
            min="0"
            max="5"
            step="1"
            class="onion-skin-slider"
          />
          <span class="onion-skin-info">{{ onionSkinFrames }} frames</span>
        </div>

        <!-- Action Buttons -->
        <div class="action-buttons">
          <!-- Capture Button -->
          <button
            v-if="!getCurrentFrameData?.taken && showCamera"
            data-testid="capture-button"
            class="capture-button primary-button"
            :disabled="isCapturing"
            @click="captureFrame"
          >
            {{ isCapturing ? 'Capturing...' : 'Capture' }}
          </button>

          <!-- Overwrite Button -->
          <button
            v-if="getCurrentFrameData?.taken"
            data-testid="overwrite-button"
            class="overwrite-button secondary-button"
            @click="enableOverwrite"
          >
            Overwrite
          </button>

          <!-- Download Button -->
          <button
            v-if="getCurrentFrameData?.taken"
            data-testid="download-button"
            class="download-button secondary-button"
            @click="downloadFrame"
          >
            Download
          </button>

          <!-- Sync Button -->
          <button
            v-if="pendingUploads.length > 0"
            data-testid="sync-button"
            class="sync-button primary-button"
            :disabled="isSyncing"
            @click="syncFrames"
          >
            {{ isSyncing ? 'Syncing...' : `Sync (${pendingUploads.length})` }}
          </button>
        </div>
      </div>
    </div>

    <!-- Note Overlay -->
    <div
      v-if="getCurrentFrameData?.note"
      data-testid="note-overlay"
      class="note-overlay bottom-right"
    >
      {{ getCurrentFrameData.note }}
    </div>

    <!-- Error Message -->
    <div v-if="error" class="error-message">
      {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useProjectStore } from '@/stores/project'
import { CameraService } from '@/services/camera'
import { S3Service } from '@/services/s3'
import type { FrameToSync } from '@/services/s3'

const projectStore = useProjectStore()
const cameraService = new CameraService()

// Reactive state
const videoElement = ref<HTMLVideoElement>()
const showCamera = ref(true) // Start with camera showing by default
const isCapturing = ref(false)
const isSyncing = ref(false)
const error = ref<string | null>(null)
const onionSkinFrames = ref(2)
const showOnionSkin = ref(true)
const pendingUploads = ref<FrameToSync[]>([])
const frameImageCache = ref<Map<number, string>>(new Map())

// Computed properties
const currentFrame = computed(() => projectStore.currentFrame)
const totalFrames = computed(() => projectStore.totalFrames)
const getCurrentFrameData = computed(() => projectStore.getCurrentFrameData)

const currentFrameValue = computed({
  get: () => currentFrame.value,
  set: (value: number) => projectStore.setCurrentFrame(value),
})

const frameImageUrl = computed(() => {
  const frameData = getCurrentFrameData.value
  if (!frameData?.taken || !frameData.filename) return null

  // Return cached URL or trigger loading
  const cached = frameImageCache.value.get(frameData.frame)
  if (cached) return cached

  loadFrameImage(frameData.frame)
  return null
})

const onionSkinImages = computed(() => {
  if (!showOnionSkin.value || !projectStore.config) return []

  const images = []
  const currentIdx = currentFrame.value

  // Get previous frames for onion skinning
  for (let i = 1; i <= onionSkinFrames.value; i++) {
    const frameIdx = currentIdx - i
    if (frameIdx >= 0) {
      const frame = projectStore.config.frames[frameIdx]
      if (frame?.taken && frame.filename) {
        const cachedUrl = frameImageCache.value.get(frameIdx)
        if (cachedUrl) {
          images.push({
            frame: frameIdx,
            url: cachedUrl,
            opacity: 0.3 * (1 - (i - 1) / onionSkinFrames.value),
          })
        }
      }
    }
  }

  return images
})

// Methods
const handleFrameChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  projectStore.setCurrentFrame(parseInt(target.value))
}

const initializeCamera = async () => {
  try {
    const stream = await cameraService.startCamera()
    if (videoElement.value) {
      videoElement.value.srcObject = stream
      showCamera.value = true
    }
  } catch (err) {
    console.error('Failed to initialize camera:', err)
    error.value = 'Failed to access camera. Please check permissions.'
  }
}

const captureFrame = async () => {
  if (!videoElement.value || isCapturing.value) return

  isCapturing.value = true
  error.value = null

  try {
    const blob = await cameraService.capturePhoto(videoElement.value)

    // Add to pending uploads
    pendingUploads.value.push({
      frame: currentFrame.value,
      blob,
    })

    // Create local URL for immediate display
    const url = URL.createObjectURL(blob)
    frameImageCache.value.set(currentFrame.value, url)

    // Mark frame as taken locally (will be synced later)
    const filename = `frame_${currentFrame.value.toString().padStart(4, '0')}.webp`
    projectStore.markFrameTaken(currentFrame.value, filename)

    showCamera.value = false
  } catch (err) {
    console.error('Failed to capture frame:', err)
    error.value = 'Failed to capture frame. Please try again.'
  } finally {
    isCapturing.value = false
  }
}

const enableOverwrite = () => {
  showCamera.value = true
  nextTick(() => {
    initializeCamera()
  })
}

const downloadFrame = async () => {
  const frameData = getCurrentFrameData.value
  if (!frameData?.taken || !frameData.filename) return

  try {
    let blob: Blob

    // Try to get from pending uploads first
    const pending = pendingUploads.value.find((p) => p.frame === frameData.frame)
    if (pending) {
      blob = pending.blob
    } else {
      // Download from S3
      const s3Service = new S3Service(projectStore.apiKey!)
      blob = await s3Service.downloadImage('current-project', frameData.frame)
    }

    // Create download link
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = frameData.filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (err) {
    console.error('Failed to download frame:', err)
    error.value = 'Failed to download frame.'
  }
}

const syncFrames = async () => {
  if (pendingUploads.value.length === 0 || !projectStore.apiKey) return

  isSyncing.value = true
  error.value = null

  try {
    const s3Service = new S3Service(projectStore.apiKey)
    const results = await s3Service.syncFrames('current-project', pendingUploads.value)

    // Remove successfully uploaded frames from pending
    const successfulFrames = results.filter((r) => r.success).map((r) => r.frame)
    pendingUploads.value = pendingUploads.value.filter((p) => !successfulFrames.includes(p.frame))

    // Update config on S3
    if (projectStore.config) {
      await s3Service.uploadConfig('current-project', projectStore.config)
    }

    const failedCount = results.length - successfulFrames.length
    if (failedCount > 0) {
      error.value = `${failedCount} frames failed to sync. Please try again.`
    }
  } catch (err) {
    console.error('Failed to sync frames:', err)
    error.value = 'Failed to sync frames. Please check your connection.'
  } finally {
    isSyncing.value = false
  }
}

const loadFrameImage = async (frameNumber: number) => {
  if (!projectStore.apiKey || frameImageCache.value.has(frameNumber)) return

  try {
    const s3Service = new S3Service(projectStore.apiKey)
    const blob = await s3Service.downloadImage('current-project', frameNumber)
    const url = URL.createObjectURL(blob)
    frameImageCache.value.set(frameNumber, url)
  } catch (err) {
    console.error('Failed to load frame image:', err)
  }
}

// Watchers
watch(currentFrame, (newFrame, oldFrame) => {
  if (newFrame !== oldFrame) {
    const frameData = projectStore.config?.frames[newFrame]
    if (frameData?.taken) {
      showCamera.value = false
    } else {
      showCamera.value = true
      nextTick(() => {
        if (cameraService.isActive) {
          initializeCamera()
        }
      })
    }
  }
})

// Lifecycle
onMounted(() => {
  const frameData = getCurrentFrameData.value
  if (!frameData?.taken) {
    initializeCamera()
  }
})

onUnmounted(() => {
  cameraService.stopCamera()
  // Clean up blob URLs
  frameImageCache.value.forEach((url) => URL.revokeObjectURL(url))
})
</script>

<style scoped>
.camera-interface {
  width: 100vw;
  height: 100vh;
  position: relative;
  background: #000;
  overflow: hidden;
}

.landscape-layout {
  orientation: landscape;
}

.preview-container {
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.camera-preview,
.frame-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.onion-skin-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.onion-skin-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.bottom-panel {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(10px);
  padding: 16px;
  z-index: 100;
}

.transparent {
  opacity: 0.9;
}

.controls-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 100%;
}

.frame-slider-container,
.onion-skin-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  color: white;
}

.slider-label {
  font-size: 14px;
  min-width: 80px;
}

.frame-slider,
.onion-skin-slider {
  flex: 1;
  height: 6px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
  outline: none;
  -webkit-appearance: none;
}

.frame-slider::-webkit-slider-thumb,
.onion-skin-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 20px;
  height: 20px;
  background: #007aff;
  border-radius: 50%;
  cursor: pointer;
}

.frame-info,
.onion-skin-info {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  min-width: 80px;
  text-align: right;
}

.action-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.primary-button,
.secondary-button {
  padding: 12px 24px;
  border-radius: 8px;
  border: none;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.primary-button {
  background: #007aff;
  color: white;
}

.primary-button:hover:not(:disabled) {
  background: #0056cc;
}

.primary-button:disabled {
  background: rgba(0, 122, 255, 0.5);
  cursor: not-allowed;
}

.secondary-button {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.secondary-button:hover {
  background: rgba(255, 255, 255, 0.3);
}

.capture-button {
  background: #ff3b30;
}

.capture-button:hover:not(:disabled) {
  background: #d12b20;
}

.note-overlay {
  position: fixed;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 14px;
  max-width: 200px;
  word-wrap: break-word;
  z-index: 90;
}

.bottom-right {
  bottom: 120px;
  right: 16px;
}

.error-message {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: #ff3b30;
  color: white;
  padding: 12px 20px;
  border-radius: 8px;
  font-size: 14px;
  z-index: 200;
}

@media (max-height: 600px) {
  .bottom-panel {
    padding: 12px;
  }

  .controls-container {
    gap: 12px;
  }

  .primary-button,
  .secondary-button {
    padding: 8px 16px;
    font-size: 14px;
  }
}
</style>
