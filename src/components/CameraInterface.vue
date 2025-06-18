<template>
  <div class="camera-interface landscape-layout">
    <!-- Camera Preview / Frame Image -->
    <div class="preview-container" ref="previewContainerRef">
      <div
        class="media-wrapper"
        :style="{
          width: `${optimalSize.width}px`,
          height: `${optimalSize.height}px`,
        }"
      >
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

        <!-- Central View Button (when frame is taken but not cached) -->
        <div v-if="shouldShowViewButton" class="central-view-button">
          <button
            data-testid="central-view-button"
            class="view-frame-button"
            @click="loadAndDisplayFrame"
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span>表示</span>
          </button>
        </div>
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
      v-if="getCurrentFrameData?.notes"
      data-testid="note-overlay"
      class="note-overlay bottom-right"
    >
      {{ getCurrentFrameData.notes }}
    </div>

    <!-- Error Message -->
    <div v-if="error" class="error-message">
      <div class="error-content">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
        {{ error }}
      </div>
      <button class="error-dismiss" @click="error = null">×</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useProjectStore } from '@/stores/project'
import { useAspectRatio } from '@/composables/useAspectRatio'
import { CameraService } from '@/services/camera'
import { S3Service } from '@/services/s3'
import type { FrameToSync } from '@/services/s3'

const projectStore = useProjectStore()
const cameraService = new CameraService()
const { containerRef: previewContainerRef, optimalSize, updateSize } = useAspectRatio()

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
  const cached = frameImageCache.value.get(frameData.number)
  if (cached) return cached

  loadFrameImage(frameData.number)
  return null
})

// キャッシュに存在するかチェック
const isFrameCached = computed(() => {
  const frameData = getCurrentFrameData.value
  if (!frameData?.taken) return false
  return frameImageCache.value.has(frameData.number)
})

// 表示ボタンを表示するかチェック
const shouldShowViewButton = computed(() => {
  const frameData = getCurrentFrameData.value
  return frameData?.taken && !isFrameCached.value && !showCamera.value
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
  console.log('initializeCamera called, video element available:', !!videoElement.value)

  if (!videoElement.value) {
    console.warn('Video element not available yet, waiting...')
    await nextTick()
    if (!videoElement.value) {
      throw new Error('Video element is not available')
    }
  }

  try {
    // 既存のストリームがあれば停止
    if (videoElement.value.srcObject) {
      const tracks = (videoElement.value.srcObject as MediaStream).getTracks()
      tracks.forEach((track) => track.stop())
      videoElement.value.srcObject = null
    }

    console.log('Starting camera...')
    const stream = await cameraService.startCamera()

    if (videoElement.value) {
      videoElement.value.srcObject = stream

      // videoの再生を確実にする
      try {
        await videoElement.value.play()
        console.log('Video started playing successfully')
      } catch (playError) {
        console.warn('Video play failed, but stream is set:', playError)
        // play()が失敗してもストリームは設定されているので続行
      }

      showCamera.value = true
      console.log('Camera initialized successfully')
    } else {
      throw new Error('Video element became unavailable during initialization')
    }
  } catch (err) {
    console.error('Failed to initialize camera:', err)
    error.value = 'カメラへのアクセスに失敗しました。カメラの許可を確認してください。'
    throw err
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

const enableOverwrite = async () => {
  console.log('enableOverwrite called:', {
    currentFrame: currentFrame.value,
    frameData: getCurrentFrameData.value,
    showCamera: showCamera.value,
    cameraActive: cameraService.isActive,
  })

  try {
    // カメラを停止してリセット
    cameraService.stopCamera()

    // 状態をリセット
    showCamera.value = true
    error.value = null

    // キャッシュされた画像URLを削除
    const cachedUrl = frameImageCache.value.get(currentFrame.value)
    if (cachedUrl) {
      URL.revokeObjectURL(cachedUrl)
      frameImageCache.value.delete(currentFrame.value)
    }

    // pending uploadsからも削除
    const pendingIndex = pendingUploads.value.findIndex((p) => p.frame === currentFrame.value)
    if (pendingIndex >= 0) {
      pendingUploads.value.splice(pendingIndex, 1)
    }

    // フレームの状態をリセット（taken状態を解除）
    if (projectStore.config) {
      const frame = projectStore.config.frames.find((f) => f.number === currentFrame.value)
      if (frame) {
        frame.taken = false
        frame.filename = null
      }
    }

    // DOMが更新されるまで待機
    await nextTick()

    // 少し待ってからカメラを初期化（他の処理が完了するまで）
    await new Promise((resolve) => setTimeout(resolve, 300))

    console.log('Initializing camera for overwrite...')
    if (videoElement.value) {
      await initializeCamera()
      console.log('Camera initialized successfully for overwrite')
    } else {
      throw new Error('Video element not available for overwrite')
    }
  } catch (err) {
    console.error('Failed to enable overwrite:', err)
    error.value = 'カメラの初期化に失敗しました。ページを再読み込みしてください。'
  }
}





const loadAndDisplayFrame = async () => {
  const frameData = getCurrentFrameData.value
  console.log('loadAndDisplayFrame called:', {
    frameData,
    isAlreadyCached: isFrameCached.value,
    bucketName: projectStore.bucketName,
  })

  if (!frameData?.taken || !frameData.filename) {
    console.warn('Frame not taken or filename missing:', frameData)
    error.value = 'フレームが利用できません。'
    return
  }

  // 既にキャッシュされている場合は何もしない
  if (isFrameCached.value) {
    console.log('Frame already cached, no action needed')
    return
  }

  try {
    // pending uploadsから取得を試行
    const pending = pendingUploads.value.find((p) => p.frame === frameData.number)
    if (pending) {
      console.log('Using blob from pending uploads')
      const url = URL.createObjectURL(pending.blob)
      frameImageCache.value.set(frameData.number, url)
      console.log('Frame loaded from pending uploads successfully')
      return
    }

    // S3から読み込み
    console.log('Loading from S3...')
    if (!projectStore.bucketName) {
      throw new Error('Bucket name not configured')
    }

    if (!projectStore.projectId) {
      throw new Error('Project ID not configured')
    }

    const s3Service = new S3Service(projectStore.bucketName)
    const blob = await s3Service.downloadImage(projectStore.projectId, frameData.number)
    console.log('Loaded from S3:', { blobSize: blob.size, blobType: blob.type })

    // キャッシュに保存
    const url = URL.createObjectURL(blob)
    frameImageCache.value.set(frameData.number, url)

    console.log('Frame loaded and cached successfully')
  } catch (err) {
    console.error('Failed to load frame:', err)

    // より詳細なエラーメッセージを提供
    if (err instanceof Error) {
      if (err.message.includes('NetworkError') || err.message.includes('fetch')) {
        error.value = 'ネットワークエラーが発生しました。インターネット接続を確認してください。'
      } else if (err.message.includes('403') || err.message.includes('Forbidden')) {
        error.value = 'アクセスが拒否されました。権限設定を確認してください。'
      } else if (err.message.includes('404') || err.message.includes('Not Found')) {
        error.value = 'フレームがサーバーで見つかりません。'
      } else {
        error.value = `読み込みに失敗しました: ${err.message}`
      }
    } else {
      error.value = 'フレームの読み込みに失敗しました。'
    }
  }
}

const syncFrames = async () => {
  console.log('syncFrames called:', {
    pendingUploadsCount: pendingUploads.value.length,
    bucketName: projectStore.bucketName,
    hasBucketName: !!projectStore.bucketName,
  })

  if (pendingUploads.value.length === 0) {
    error.value = 'No frames to sync.'
    return
  }

  if (!projectStore.bucketName) {
    error.value = 'Bucket name not configured. Please check setup.'
    return
  }

  isSyncing.value = true
  error.value = null

  try {
    console.log('Creating S3Service with bucket:', projectStore.bucketName)
    const s3Service = new S3Service(projectStore.bucketName)

    if (!projectStore.projectId) {
      throw new Error('Project ID not configured')
    }

    console.log(
      'Syncing frames:',
      pendingUploads.value.map((p) => ({ frame: p.frame, blobSize: p.blob.size })),
    )
    const results = await s3Service.syncFrames(projectStore.projectId, pendingUploads.value)

    console.log('Sync results:', results)

    // Remove successfully uploaded frames from pending
    const successfulFrames = results.filter((r) => r.success).map((r) => r.frame)
    pendingUploads.value = pendingUploads.value.filter((p) => !successfulFrames.includes(p.frame))

    // Update config on S3
    if (projectStore.config) {
      console.log('Updating config on S3...')
      await s3Service.uploadConfig(projectStore.projectId, projectStore.config)
      console.log('Config updated successfully')
    }

    const failedCount = results.length - successfulFrames.length
    if (failedCount > 0) {
      const failedFrames = results.filter((r) => !r.success)
      console.error('Failed frames:', failedFrames)
      error.value = `${failedCount} frames failed to sync: ${failedFrames.map((f) => `Frame ${f.frame}: ${f.error}`).join(', ')}`
    } else {
      console.log('All frames synced successfully!')
    }
  } catch (err) {
    console.error('Failed to sync frames:', err)

    // より詳細なエラーメッセージを提供
    if (err instanceof Error) {
      if (err.message.includes('NetworkError') || err.message.includes('fetch')) {
        error.value = 'Network connection error. Please check your internet connection.'
      } else if (err.message.includes('403') || err.message.includes('Forbidden')) {
        error.value = 'Access denied. Please check bucket permissions.'
      } else if (err.message.includes('404') || err.message.includes('Not Found')) {
        error.value = 'Bucket or project not found. Please check your setup.'
      } else {
        error.value = `Sync failed: ${err.message}`
      }
    } else {
      error.value = 'Failed to sync frames. Please check your connection.'
    }
  } finally {
    isSyncing.value = false
  }
}

const loadFrameImage = async (frameNumber: number) => {
  if (!projectStore.bucketName || !projectStore.projectId || frameImageCache.value.has(frameNumber))
    return

  try {
    const s3Service = new S3Service(projectStore.bucketName)
    const blob = await s3Service.downloadImage(projectStore.projectId, frameNumber)
    const url = URL.createObjectURL(blob)
    frameImageCache.value.set(frameNumber, url)
  } catch (err) {
    console.error('Failed to load frame image:', err)
  }
}

// Watchers
let isFrameChanging = false

watch(currentFrame, async (newFrame, oldFrame) => {
  if (newFrame !== oldFrame && !isFrameChanging) {
    isFrameChanging = true
    console.log('Frame changed from', oldFrame, 'to', newFrame)

    try {
      const frameData = projectStore.config?.frames[newFrame]

      if (frameData?.taken) {
        console.log('Frame is taken, showing image')
        showCamera.value = false
        // カメラを停止してリソースを解放
        cameraService.stopCamera()
      } else {
        console.log('Frame is not taken, showing camera')
        showCamera.value = true

        // 少し待ってからカメラ初期化を試行
        await nextTick()
        await new Promise((resolve) => setTimeout(resolve, 200))

        if (videoElement.value && !cameraService.isActive) {
          try {
            console.log('Initializing camera for new frame...')
            await initializeCamera()
          } catch (err) {
            console.error('Failed to reinitialize camera on frame change:', err)
            error.value = 'カメラの初期化に失敗しました。ページを再読み込みしてください。'
          }
        }
      }
    } finally {
      isFrameChanging = false
    }
  }
})

// プロジェクト設定が変更された時にアスペクト比を更新
watch(
  () => projectStore.config,
  () => {
    nextTick(() => {
      updateSize()
    })
  },
  { deep: true },
)

// Lifecycle
onMounted(async () => {
  console.log('CameraInterface mounted')

  const frameData = getCurrentFrameData.value
  console.log('Current frame data on mount:', frameData)

  // DOMが完全に準備されるまで待機
  await nextTick()

  if (!frameData?.taken) {
    console.log('Frame not taken, initializing camera')
    try {
      // 少し待ってからカメラを初期化
      await new Promise((resolve) => setTimeout(resolve, 100))
      await initializeCamera()
    } catch (err) {
      console.error('Failed to initialize camera on mount:', err)
      error.value = 'カメラの初期化に失敗しました。ページを再読み込みしてください。'
    }
  } else {
    console.log('Frame already taken, not initializing camera')
    showCamera.value = false
  }

  // 初期サイズ計算
  nextTick(() => {
    updateSize()
  })
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

.preview-container {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
}

.media-wrapper {
  position: relative;
  background: #000;
  width: 100%;
  height: 100%;
  max-width: 100vw;
  max-height: 100vh;
}

.camera-preview,
.frame-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
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

.central-view-button {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 50;
}

.view-frame-button {
  background: rgba(0, 122, 255, 0.9);
  color: white;
  border: none;
  border-radius: 16px;
  padding: 20px 32px;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0, 122, 255, 0.3);
  min-width: 120px;
}

.view-frame-button:hover {
  background: rgba(0, 122, 255, 1);
  transform: scale(1.05);
  box-shadow: 0 12px 48px rgba(0, 122, 255, 0.4);
}

.view-frame-button:active {
  transform: scale(0.95);
}

.view-frame-button svg {
  opacity: 0.9;
}

.view-frame-button span {
  font-size: 16px;
  letter-spacing: 0.5px;
}

.bottom-panel {
  position: fixed;
  bottom: 2rem;
  left: 1rem;
  right: 1rem;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 1rem;
  z-index: 100;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.transparent {
  opacity: 0.95;
  transition: opacity 0.3s ease;
}

.bottom-panel:hover {
  opacity: 1;
  background: rgba(0, 0, 0, 0.8);
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
  appearance: none;
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
  border-radius: 8px;
  font-size: 14px;
  z-index: 200;
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: 90vw;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.error-content {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  flex: 1;
}

.error-dismiss {
  background: none;
  border: none;
  color: white;
  font-size: 20px;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 0 8px 8px 0;
  transition: background-color 0.2s ease;
}

.error-dismiss:hover {
  background: rgba(255, 255, 255, 0.2);
}

@media (max-height: 600px) {
  .bottom-panel {
    bottom: 1rem;
    left: 0.5rem;
    right: 0.5rem;
    padding: 0.75rem;
    border-radius: 16px;
  }

  .controls-container {
    gap: 12px;
  }

  .primary-button,
  .secondary-button {
    padding: 8px 16px;
    font-size: 14px;
  }

  .view-frame-button {
    padding: 16px 24px;
    font-size: 16px;
    min-width: 100px;
  }

  .view-frame-button svg {
    width: 24px;
    height: 24px;
  }

  .view-frame-button span {
    font-size: 14px;
  }
}

/* モバイル対応とレスポンシブデザイン */
@media (max-width: 768px) {
  .bottom-panel {
    bottom: max(1rem, env(safe-area-inset-bottom));
    left: max(0.75rem, env(safe-area-inset-left));
    right: max(0.75rem, env(safe-area-inset-right));
    padding: 0.75rem;
  }

  .frame-slider-container,
  .onion-skin-controls {
    gap: 8px;
  }

  .slider-label {
    font-size: 12px;
    min-width: 60px;
  }

  .frame-info,
  .onion-skin-info {
    font-size: 11px;
    min-width: 60px;
  }

  .action-buttons {
    gap: 8px;
  }

  .capture-button,
  .overwrite-button,
  .sync-button {
    padding: 8px 12px;
    font-size: 14px;
  }

  .view-frame-button {
    padding: 16px 24px;
    font-size: 16px;
    min-width: 100px;
  }

  .view-frame-button svg {
    width: 24px;
    height: 24px;
  }

  .view-frame-button span {
    font-size: 14px;
  }
}

/* 横向き対応 */
@media (orientation: landscape) {
  .camera-interface {
    flex-direction: row;
  }

  .preview-container {
    flex: 1;
  }

  .media-wrapper {
    max-height: 100vh;
  }

  .bottom-panel {
    bottom: 1rem;
    left: 1rem;
    right: 1rem;
    padding: 0.75rem 1rem;
    border-radius: 16px;
  }

  .controls-container {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
  }

  .frame-slider-container,
  .onion-skin-controls {
    flex: 1;
    min-width: 200px;
  }

  .action-buttons {
    flex-shrink: 0;
  }
}

/* 縦向きモバイルでの最適化 */
@media (orientation: portrait) and (max-width: 768px) {
  .media-wrapper {
    max-width: 100%;
    max-height: calc(100vh - 200px);
  }

  .bottom-panel {
    padding: 16px;
  }

  .controls-container {
    flex-direction: column;
    gap: 12px;
  }

  .frame-slider-container,
  .onion-skin-controls {
    width: 100%;
  }

  .action-buttons {
    width: 100%;
    justify-content: center;
  }
}
</style>
