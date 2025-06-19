<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useProjectStore } from '../stores/project'
import { S3Service } from '../services/s3'
import type { Frame } from '../types'

const router = useRouter()
const projectStore = useProjectStore()

const frames = computed(() => projectStore.config?.frames || [])
const selectedFrames = ref<Set<number>>(new Set())
const showDeleteConfirm = ref(false)
const viewMode = ref<'grid' | 'list'>('grid')
const frameImageCache = ref<Map<number, string>>(new Map())
const loadingImages = ref<Set<number>>(new Set())

// ダウンロード機能のstate
const showDownloadDialog = ref(false)
const downloadStartFrame = ref(0)
const downloadEndFrame = ref(0)
const isDownloading = ref(false)

// フレーム数変更機能のstate
const showFrameCountDialog = ref(false)
const newFrameCount = ref(30)
const isUpdatingFrameCount = ref(false)

// プレビュー機能のstate
const showPreviewDialog = ref(false)
const previewFps = ref(12)
const isPlaying = ref(false)
const currentPreviewFrame = ref(0)
const previewImages = ref<string[]>([])
const isLoadingPreview = ref(false)

// API キーが設定されていない場合はセットアップページに戻る
onMounted(() => {
  if (!projectStore.hasBucketName || !projectStore.hasProjectId) {
    router.push('/setup')
  } else {
    // 撮影済みフレームの画像を読み込み
    loadTakenFrameImages()
  }
})

// フレームデータが変更された時に画像を再読み込み
watch(
  frames,
  () => {
    loadTakenFrameImages()
  },
  { deep: true },
)

const loadTakenFrameImages = async () => {
  if (!projectStore.bucketName || !projectStore.projectId) return

  const takenFrames = frames.value.filter((frame) => frame.taken && frame.filename)

  for (const frame of takenFrames) {
    if (!frameImageCache.value.has(frame.number) && !loadingImages.value.has(frame.number)) {
      loadFrameImage(frame.number)
    }
  }
}

const loadFrameImage = async (frameNumber: number) => {
  if (
    !projectStore.bucketName ||
    !projectStore.projectId ||
    frameImageCache.value.has(frameNumber)
  ) {
    return
  }

  loadingImages.value.add(frameNumber)

  try {
    const s3Service = new S3Service(projectStore.bucketName)
    const blob = await s3Service.downloadImage(projectStore.projectId, frameNumber)
    const url = URL.createObjectURL(blob)
    frameImageCache.value.set(frameNumber, url)
  } catch (err) {
    console.error('Failed to load frame image:', frameNumber, err)
  } finally {
    loadingImages.value.delete(frameNumber)
  }
}

const getFrameImageUrl = (frame: Frame): string | undefined => {
  if (!frame.taken) return undefined
  return frameImageCache.value.get(frame.number) || undefined
}

const isImageLoading = (frameNumber: number) => {
  return loadingImages.value.has(frameNumber)
}

const navigateToCamera = () => {
  router.push('/camera')
}

const navigateToFrame = (frameNumber: number) => {
  // フレームを選択してからカメラ画面に遷移
  projectStore.setCurrentFrame(frameNumber)
  router.push('/camera')
}

const navigateToSetup = () => {
  router.push('/setup')
}

const toggleFrameSelection = (frameNumber: number) => {
  console.log('toggleFrameSelection called with frameNumber:', frameNumber)
  console.log('Before toggle, selectedFrames has:', Array.from(selectedFrames.value))
  if (selectedFrames.value.has(frameNumber)) {
    selectedFrames.value.delete(frameNumber)
    console.log('Removed frame', frameNumber, 'from selection')
  } else {
    selectedFrames.value.add(frameNumber)
    console.log('Added frame', frameNumber, 'to selection')
  }
  console.log('After toggle, selectedFrames has:', Array.from(selectedFrames.value))
}

const selectAllFrames = () => {
  console.log('selectAllFrames called')
  selectedFrames.value = new Set(frames.value.map((f) => f.number))
  console.log('All frames selected:', Array.from(selectedFrames.value))
}

const clearSelection = () => {
  console.log('clearSelection called')
  selectedFrames.value.clear()
  console.log('Selection cleared, selectedFrames.size:', selectedFrames.value.size)
}

const deleteSelectedFrames = () => {
  console.log('deleteSelectedFrames called, selectedFrames.size:', selectedFrames.value.size)
  if (selectedFrames.value.size === 0) return
  console.log('Setting showDeleteConfirm to true')
  showDeleteConfirm.value = true
  console.log('showDeleteConfirm.value:', showDeleteConfirm.value)
}

const confirmDelete = async () => {
  console.log('confirmDelete called, selectedFrames.size:', selectedFrames.value.size)
  if (selectedFrames.value.size === 0) return

  try {
    // フレームを削除（未撮影状態にリセット）
    const frameNumbers = Array.from(selectedFrames.value)

    // 削除前に撮影済みフレームを特定
    const takenFramesToDelete = frameNumbers.filter((frameNumber) => {
      const frame = frames.value.find((f) => f.number === frameNumber)
      return frame && frame.taken && frame.filename
    })

    // フレーム状態をリセット
    projectStore.deleteFrames(frameNumbers)

    // 削除されたフレームのキャッシュをクリア
    frameNumbers.forEach((frameNumber) => {
      const cachedUrl = frameImageCache.value.get(frameNumber)
      if (cachedUrl) {
        URL.revokeObjectURL(cachedUrl)
        frameImageCache.value.delete(frameNumber)
      }
    })

    // S3の設定を更新
    if (projectStore.bucketName && projectStore.projectId && projectStore.config) {
      console.log('Updating project config after frame deletion...')
      const s3Service = new S3Service(projectStore.bucketName)

      // 設定を更新
      await s3Service.uploadConfig(projectStore.projectId, projectStore.config)
      console.log('Project config updated successfully')

      // 撮影済みだったフレームの画像をS3から削除
      if (takenFramesToDelete.length > 0) {
        console.log('Deleting images from S3:', takenFramesToDelete)
        try {
          await s3Service.deleteImages(projectStore.projectId, takenFramesToDelete)
          console.log('Images deleted from S3 successfully')
        } catch (imageDeleteError) {
          console.warn('Failed to delete some images from S3:', imageDeleteError)
          // 画像削除エラーは警告として処理（設定更新は成功している）
        }
      }
    }

    console.log('Frames deleted successfully:', frameNumbers)
  } catch (err) {
    console.error('Failed to delete frames:', err)
    // エラーが発生しても UI は閉じる（ローカルの状態は既に更新済み）
  } finally {
    selectedFrames.value.clear()
    showDeleteConfirm.value = false
  }
}

const cancelDelete = () => {
  console.log('cancelDelete called')
  showDeleteConfirm.value = false
}

const toggleViewMode = () => {
  viewMode.value = viewMode.value === 'grid' ? 'list' : 'grid'
}

// ダウンロード機能
const openDownloadDialog = () => {
  downloadStartFrame.value = 0
  downloadEndFrame.value = Math.max(0, frames.value.length - 1)
  showDownloadDialog.value = true
}

const downloadFrames = async () => {
  if (isDownloading.value) return
  
  const startFrame = Math.max(0, downloadStartFrame.value)
  const endFrame = Math.min(downloadEndFrame.value, frames.value.length - 1)
  
  if (startFrame > endFrame) {
    alert('開始フレームは終了フレームより小さい値を指定してください。')
    return
  }

  isDownloading.value = true

  try {
    const s3Service = new S3Service(projectStore.bucketName!)
    const framesToDownload = []
    
    // 指定範囲のフレームを取得
    for (let i = startFrame; i <= endFrame; i++) {
      const frame = frames.value.find(f => f.number === i)
      if (frame?.taken && frame.filename) {
        try {
          const blob = await s3Service.downloadImage(projectStore.projectId!, i)
          framesToDownload.push({
            frameNumber: i,
            blob,
            filename: `frame_${i.toString().padStart(4, '0')}.webp`
          })
        } catch (err) {
          console.warn(`Failed to download frame ${i}:`, err)
        }
      }
    }

    if (framesToDownload.length === 0) {
      alert('ダウンロード可能なフレームがありません。')
      return
    }

    // ZIPファイルを作成してダウンロード
    await createAndDownloadZip(framesToDownload)
    
  } catch (err) {
    console.error('Download failed:', err)
    alert('ダウンロードに失敗しました。')
  } finally {
    isDownloading.value = false
    showDownloadDialog.value = false
  }
}

const createAndDownloadZip = async (frames: Array<{frameNumber: number, blob: Blob, filename: string}>) => {
  // JSZipをインポート（動的インポート）
  const JSZip = (await import('jszip')).default
  const zip = new JSZip()

  // フレームをZIPに追加
  frames.forEach(frame => {
    zip.file(frame.filename, frame.blob)
  })

  // ZIPファイルを生成
  const zipBlob = await zip.generateAsync({ type: 'blob' })
  
  // ダウンロード
  const url = URL.createObjectURL(zipBlob)
  const a = document.createElement('a')
  a.href = url
  a.download = `frames_${downloadStartFrame.value}-${downloadEndFrame.value}_${new Date().toISOString().slice(0, 10)}.zip`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// フレーム数変更機能
const openFrameCountDialog = () => {
  newFrameCount.value = frames.value.length
  showFrameCountDialog.value = true
}

const updateProjectFrameCount = async () => {
  if (isUpdatingFrameCount.value || newFrameCount.value <= 0 || newFrameCount.value > 1000) return

  isUpdatingFrameCount.value = true

  try {
    // フレーム数を更新
    projectStore.updateFrameCount(newFrameCount.value)

    // S3の設定を更新
    if (projectStore.bucketName && projectStore.projectId && projectStore.config) {
      const s3Service = new S3Service(projectStore.bucketName)
      await s3Service.uploadConfig(projectStore.projectId, projectStore.config)
    }

    showFrameCountDialog.value = false
  } catch (err) {
    console.error('Failed to update frame count:', err)
    alert('フレーム数の更新に失敗しました。')
  } finally {
    isUpdatingFrameCount.value = false
  }
}

const cancelDownload = () => {
  showDownloadDialog.value = false
}

const cancelFrameCountUpdate = () => {
  showFrameCountDialog.value = false
}

// プレビュー機能
const openPreviewDialog = async () => {
  previewFps.value = projectStore.config?.fps || 12
  showPreviewDialog.value = true
  await loadPreviewImages()
}

const loadPreviewImages = async () => {
  if (!projectStore.bucketName || !projectStore.projectId) return
  
  isLoadingPreview.value = true
  previewImages.value = []
  
  try {
    const s3Service = new S3Service(projectStore.bucketName)
    const takenFrames = frames.value.filter(frame => frame.taken && frame.filename).sort((a, b) => a.number - b.number)
    
    for (const frame of takenFrames) {
      try {
        // キャッシュから取得するか、新しく読み込み
        let imageUrl = frameImageCache.value.get(frame.number)
        if (!imageUrl) {
          const blob = await s3Service.downloadImage(projectStore.projectId, frame.number)
          imageUrl = URL.createObjectURL(blob)
          frameImageCache.value.set(frame.number, imageUrl)
        }
        previewImages.value.push(imageUrl)
      } catch (err) {
        console.warn(`Failed to load preview image for frame ${frame.number}:`, err)
      }
    }
  } catch (err) {
    console.error('Failed to load preview images:', err)
  } finally {
    isLoadingPreview.value = false
  }
}

const startPreview = () => {
  if (previewImages.value.length === 0) return
  
  isPlaying.value = true
  currentPreviewFrame.value = 0
  
  const interval = 1000 / previewFps.value
  const playInterval = setInterval(() => {
    if (!isPlaying.value) {
      clearInterval(playInterval)
      return
    }
    
    currentPreviewFrame.value = (currentPreviewFrame.value + 1) % previewImages.value.length
  }, interval)
}

const stopPreview = () => {
  isPlaying.value = false
  currentPreviewFrame.value = 0
}

const closePreviewDialog = () => {
  stopPreview()
  showPreviewDialog.value = false
  previewImages.value = []
}

// クリーンアップ処理
const cleanup = () => {
  frameImageCache.value.forEach((url) => {
    URL.revokeObjectURL(url)
  })
  frameImageCache.value.clear()
}

onUnmounted(() => {
  cleanup()
})
</script>

<template>
  <div class="gallery-view">
    <header class="header">
      <div class="header-content">
        <button class="nav-button settings-button" @click="navigateToSetup" aria-label="設定に戻る">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1" />
          </svg>
        </button>

        <h1 class="title">ギャラリー ({{ frames.length }})</h1>

        <button
          class="nav-button camera-button"
          @click="navigateToCamera"
          aria-label="カメラに戻る"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
            />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </button>
      </div>

      <!-- ツールバー -->
      <div class="toolbar" v-if="frames.length > 0">
        <div class="toolbar-left">
          <button
            class="tool-button"
            @click="toggleViewMode"
            :aria-label="viewMode === 'grid' ? 'リスト表示に切り替え' : 'グリッド表示に切り替え'"
          >
            <svg
              v-if="viewMode === 'grid'"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
            <svg
              v-else
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
          </button>

          <span class="frame-count">{{ selectedFrames.size }}/{{ frames.length }} 選択中</span>
        </div>

        <div class="toolbar-right">
          <button class="tool-button" @click="openDownloadDialog">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7,10 12,15 17,10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            ダウンロード
          </button>
          <button class="tool-button" @click="openFrameCountDialog">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            フレーム数変更
          </button>
          <button class="tool-button" @click="openPreviewDialog">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="5,3 19,12 5,21"/>
            </svg>
            プレビュー
          </button>
          <button v-if="selectedFrames.size === 0" class="tool-button" @click="selectAllFrames">
            全選択
          </button>
          <button v-if="selectedFrames.size > 0" class="tool-button" @click="clearSelection">
            選択解除
          </button>
          <button
            v-if="selectedFrames.size > 0"
            class="tool-button delete-button"
            @click="deleteSelectedFrames"
          >
            削除 ({{ selectedFrames.size }})
          </button>
        </div>
      </div>
    </header>

    <main class="main-content">
      <!-- フレームが無い場合 -->
      <div v-if="frames.length === 0" class="empty-state">
        <div class="empty-icon">
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21,15 16,10 5,21" />
          </svg>
        </div>
        <h2 class="empty-title">フレームがありません</h2>
        <p class="empty-description">
          カメラで写真を撮影してアニメーションフレームを作成しましょう
        </p>
        <button class="primary-button" @click="navigateToCamera">撮影を開始</button>
      </div>

      <!-- グリッド表示 -->
      <div v-else-if="viewMode === 'grid'" class="frames-grid">
        <div
          v-for="frame in frames"
          :key="frame.number"
          class="frame-item"
          :class="{ selected: selectedFrames.has(frame.number) }"
        >
          <div class="frame-image" @click="navigateToFrame(frame.number)">
            <div v-if="!frame.taken" class="frame-placeholder">
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1"
              >
                <path
                  d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
                />
                <circle cx="12" cy="13" r="4" />
              </svg>
              <span>未撮影</span>
            </div>
            <div v-else-if="isImageLoading(frame.number)" class="frame-loading">
              <div class="loading-spinner"></div>
              <span>読み込み中...</span>
            </div>
            <img
              v-else-if="getFrameImageUrl(frame)"
              :src="getFrameImageUrl(frame)"
              :alt="`Frame ${frame.number}`"
              class="frame-img"
            />
            <div v-else class="frame-error">
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              <span>読み込みエラー</span>
            </div>
            <div class="frame-overlay">
              <div class="frame-sequence">{{ frame.number + 1 }}</div>
              <div class="frame-checkbox" @click.stop="toggleFrameSelection(frame.number)">
                <svg
                  v-if="selectedFrames.has(frame.number)"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="white"
                >
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
              </div>
            </div>
          </div>
          <div class="frame-info">
            <div class="frame-time">フレーム {{ frame.number + 1 }}</div>
            <div class="frame-status" :class="{ taken: frame.taken }">
              {{ frame.taken ? '撮影済み' : '未撮影' }}
            </div>
          </div>
        </div>
      </div>

      <!-- リスト表示 -->
      <div v-else class="frames-list">
        <div
          v-for="frame in frames"
          :key="frame.number"
          class="frame-row"
          :class="{ selected: selectedFrames.has(frame.number) }"
          @click="navigateToFrame(frame.number)"
        >
          <div class="frame-checkbox-col" @click.stop="toggleFrameSelection(frame.number)">
            <div class="frame-checkbox">
              <svg
                v-if="selectedFrames.has(frame.number)"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
            </div>
          </div>
          <div class="frame-thumbnail">
            <div v-if="!frame.taken" class="thumbnail-placeholder">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1"
              >
                <path
                  d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
                />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </div>
            <div v-else-if="isImageLoading(frame.number)" class="thumbnail-loading">
              <div class="loading-spinner-small"></div>
            </div>
            <img
              v-else-if="getFrameImageUrl(frame)"
              :src="getFrameImageUrl(frame)"
              :alt="`Frame ${frame.number}`"
              class="thumbnail-img"
            />
            <div v-else class="thumbnail-error">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
          </div>
          <div class="frame-details">
            <div class="frame-sequence-large">フレーム #{{ frame.number + 1 }}</div>
            <div class="frame-meta">
              <span class="frame-time" :class="{ taken: frame.taken }">
                {{ frame.taken ? '撮影済み' : '未撮影' }}
              </span>
              <span v-if="frame.notes" class="frame-note">{{ frame.notes }}</span>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- 削除確認ダイアログ -->
    <div v-if="showDeleteConfirm" class="delete-overlay" @click="cancelDelete">
      <div class="delete-dialog" @click.stop>
        <h3 class="delete-title">フレームを削除</h3>
        <p class="delete-message">
          選択した {{ selectedFrames.size }} 個のフレームを未撮影状態に戻します。<br />
          撮影済みの画像データはS3から削除され、この操作は取り消せません。<br />
          フレームのメモは保持されます。
        </p>
        <div class="delete-actions">
          <button class="cancel-button" @click="cancelDelete">キャンセル</button>
          <button class="confirm-button" @click="confirmDelete">削除</button>
        </div>
      </div>
    </div>

    <!-- ダウンロードダイアログ -->
    <div v-if="showDownloadDialog" class="modal-overlay" @click="cancelDownload">
      <div class="modal-dialog" @click.stop>
        <h3 class="modal-title">フレームをダウンロード</h3>
        <p class="modal-description">
          ダウンロードするフレームの範囲を指定してください。撮影済みのフレームのみがダウンロードされます。
        </p>
        <div class="form-group">
          <label for="start-frame">開始フレーム:</label>
          <input
            id="start-frame"
            v-model.number="downloadStartFrame"
            type="number"
            :min="0"
            :max="frames.length - 1"
            class="form-input"
          />
        </div>
        <div class="form-group">
          <label for="end-frame">終了フレーム:</label>
          <input
            id="end-frame"
            v-model.number="downloadEndFrame"
            type="number"
            :min="downloadStartFrame"
            :max="frames.length - 1"
            class="form-input"
          />
        </div>
        <div class="modal-actions">
          <button class="cancel-button" @click="cancelDownload" :disabled="isDownloading">
            キャンセル
          </button>
          <button class="confirm-button" @click="downloadFrames" :disabled="isDownloading">
            {{ isDownloading ? 'ダウンロード中...' : 'ダウンロード' }}
          </button>
        </div>
      </div>
    </div>

    <!-- フレーム数変更ダイアログ -->
    <div v-if="showFrameCountDialog" class="modal-overlay" @click="cancelFrameCountUpdate">
      <div class="modal-dialog" @click.stop>
        <h3 class="modal-title">フレーム数を変更</h3>
        <p class="modal-description">
          プロジェクトの総フレーム数を変更します。<br />
          フレーム数を減らす場合、最後のフレームから削除されます。
        </p>
        <div class="form-group">
          <label for="frame-count">新しいフレーム数:</label>
          <input
            id="frame-count"
            v-model.number="newFrameCount"
            type="number"
            min="1"
            max="1000"
            class="form-input"
          />
        </div>
        <div class="current-info">
          現在のフレーム数: {{ frames.length }}
        </div>
        <div class="modal-actions">
          <button class="cancel-button" @click="cancelFrameCountUpdate" :disabled="isUpdatingFrameCount">
            キャンセル
          </button>
          <button class="confirm-button" @click="updateProjectFrameCount" :disabled="isUpdatingFrameCount">
            {{ isUpdatingFrameCount ? '更新中...' : '更新' }}
          </button>
        </div>
      </div>
    </div>

    <!-- プレビューダイアログ -->
    <div v-if="showPreviewDialog" class="preview-overlay" @click="closePreviewDialog">
      <div class="preview-dialog" @click.stop>
        <div class="preview-header">
          <h3 class="preview-title">アニメーションプレビュー</h3>
          <button class="preview-close" @click="closePreviewDialog" aria-label="プレビューを閉じる">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div v-if="isLoadingPreview" class="preview-loading">
          <div class="loading-spinner"></div>
          <p>プレビュー画像を読み込み中...</p>
        </div>

        <div v-else-if="previewImages.length === 0" class="preview-empty">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21,15 16,10 5,21"/>
          </svg>
          <p>プレビュー可能なフレームがありません</p>
        </div>

        <div v-else class="preview-content">
          <div class="preview-player">
            <div class="preview-image-container">
              <img
                v-if="previewImages[currentPreviewFrame]"
                :src="previewImages[currentPreviewFrame]"
                alt="Preview frame"
                class="preview-image"
              />
              <div class="preview-frame-counter">
                {{ currentPreviewFrame + 1 }} / {{ previewImages.length }}
              </div>
            </div>
            
            <div class="preview-controls">
              <div class="preview-fps-control">
                <label for="preview-fps">FPS:</label>
                <input
                  id="preview-fps"
                  v-model.number="previewFps"
                  type="range"
                  min="1"
                  max="30"
                  class="fps-slider"
                  :disabled="isPlaying"
                />
                <span class="fps-value">{{ previewFps }}</span>
              </div>
              
              <div class="preview-buttons">
                <button
                  v-if="!isPlaying"
                  @click="startPreview"
                  class="preview-button play-button"
                  :disabled="previewImages.length === 0"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="5,3 19,12 5,21"/>
                  </svg>
                  再生
                </button>
                <button
                  v-else
                  @click="stopPreview"
                  class="preview-button stop-button"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="6" y="4" width="4" height="16"/>
                    <rect x="14" y="4" width="4" height="16"/>
                  </svg>
                  停止
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gallery-view {
  min-height: 100vh;
  background: #f8f9fa;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.header {
  background: white;
  border-bottom: 1px solid #e9ecef;
  position: sticky;
  top: 0;
  z-index: 10;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
}

.nav-button {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 50%;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #495057;
  cursor: pointer;
  transition: all 0.2s ease;
}

.nav-button:hover {
  background: #e9ecef;
  transform: scale(1.05);
}

.title {
  color: #212529;
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
  text-align: center;
  flex: 1;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: #f8f9fa;
  border-top: 1px solid #e9ecef;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.tool-button {
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.tool-button:hover {
  background: #e9ecef;
}

.delete-button {
  background: #dc3545;
  color: white;
  border-color: #dc3545;
}

.delete-button:hover {
  background: #c82333;
}

.frame-count {
  font-size: 0.875rem;
  color: #6c757d;
}

.main-content {
  flex: 1;
  padding: 1rem;
}

.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: #6c757d;
}

.empty-icon {
  margin-bottom: 1.5rem;
  opacity: 0.5;
}

.empty-title {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
  color: #495057;
}

.empty-description {
  margin-bottom: 2rem;
  line-height: 1.5;
}

.primary-button {
  background: #007bff;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.primary-button:hover {
  background: #0056b3;
}

.frames-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 1rem;
}

.frame-item {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.frame-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.frame-item:hover::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 123, 255, 0.1);
  pointer-events: none;
}

.frame-item.selected {
  border: 2px solid #007bff;
  transform: translateY(-2px);
}

.frame-image {
  position: relative;
  aspect-ratio: 4/3;
  overflow: hidden;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.frame-image:hover {
  opacity: 0.8;
}

.frame-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.frame-placeholder,
.frame-loading,
.frame-error {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #f8f9fa;
  color: #6c757d;
  font-size: 0.75rem;
  gap: 0.5rem;
}

.frame-loading {
  background: #e9ecef;
}

.frame-error {
  background: #f8d7da;
  color: #721c24;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid #e9ecef;
  border-top: 2px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid #e9ecef;
  border-top: 2px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.frame-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0.5) 0%,
    transparent 30%,
    transparent 70%,
    rgba(0, 0, 0, 0.5) 100%
  );
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 0.5rem;
}

.frame-sequence {
  background: rgba(0, 0, 0, 0.7);
  color: white;
  font-size: 0.75rem;
  font-weight: bold;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.frame-checkbox {
  width: 24px;
  height: 24px;
  background: rgba(0, 0, 0, 0.5);
  border: 2px solid white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.frame-checkbox:hover {
  background: rgba(0, 123, 255, 0.8);
  transform: scale(1.1);
}

.frame-item.selected .frame-checkbox {
  background: #007bff;
  border-color: #007bff;
}

.frame-info {
  padding: 0.75rem;
}

.frame-time {
  font-size: 0.75rem;
  color: #6c757d;
  margin-bottom: 0.25rem;
}

.frame-status {
  font-size: 0.625rem;
  padding: 0.125rem 0.5rem;
  border-radius: 12px;
  background: #dc3545;
  color: white;
  display: inline-block;
}

.frame-status.taken {
  background: #28a745;
}

.frames-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.frame-row {
  background: white;
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.frame-row:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
  background: #f8f9fa;
}

.frame-row.selected {
  background: #e3f2fd;
  border: 1px solid #007bff;
}

.frame-checkbox-col {
  flex-shrink: 0;
  padding: 0.25rem;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.frame-checkbox-col:hover {
  background: rgba(0, 123, 255, 0.1);
}

.frame-row .frame-checkbox {
  width: 24px;
  height: 24px;
  border: 2px solid #dee2e6;
  border-radius: 4px;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #007bff;
}

.frame-thumbnail {
  flex-shrink: 0;
  width: 80px;
  height: 60px;
  border-radius: 6px;
  overflow: hidden;
  background: #f8f9fa;
  display: flex;
  align-items: center;
  justify-content: center;
}

.thumbnail-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumbnail-placeholder,
.thumbnail-loading,
.thumbnail-error {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #6c757d;
  font-size: 0.625rem;
}

.thumbnail-loading {
  background: #e9ecef;
}

.thumbnail-error {
  background: #f8d7da;
  color: #721c24;
}

.frame-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.frame-details {
  flex: 1;
}

.frame-sequence-large {
  font-weight: 600;
  color: #212529;
  margin-bottom: 0.25rem;
}

.frame-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.875rem;
  color: #6c757d;
}

.frame-meta .frame-time {
  font-size: 0.75rem;
  padding: 0.125rem 0.5rem;
  border-radius: 12px;
  background: #dc3545;
  color: white;
}

.frame-meta .frame-time.taken {
  background: #28a745;
}

.frame-note {
  font-size: 0.75rem;
  color: #6c757d;
  font-style: italic;
}

/* 削除確認ダイアログ */
.delete-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.delete-dialog {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  max-width: 400px;
  width: 100%;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.delete-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #212529;
  margin-bottom: 1rem;
  text-align: center;
}

.delete-message {
  color: #495057;
  margin-bottom: 2rem;
  line-height: 1.5;
  text-align: center;
}

.delete-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

/* モーダルダイアログ */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-dialog {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  max-width: 450px;
  width: 100%;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  max-height: 90vh;
  overflow-y: auto;
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #212529;
  margin-bottom: 1rem;
  text-align: center;
}

.modal-description {
  color: #495057;
  margin-bottom: 2rem;
  line-height: 1.5;
  text-align: center;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #495057;
  font-weight: 500;
}

.form-input {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #dee2e6;
  border-radius: 6px;
  font-size: 1rem;
  transition: border-color 0.2s ease;
}

.form-input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

.current-info {
  background: #f8f9fa;
  padding: 0.75rem;
  border-radius: 6px;
  color: #495057;
  font-size: 0.875rem;
  margin-bottom: 1.5rem;
  text-align: center;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.cancel-button,
.confirm-button {
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  min-width: 100px;
}

.cancel-button {
  background: #f8f9fa;
  color: #495057;
  border: 1px solid #dee2e6;
}

.cancel-button:hover:not(:disabled) {
  background: #e9ecef;
}

.cancel-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.confirm-button {
  background: #007bff;
  color: white;
}

.confirm-button:hover:not(:disabled) {
  background: #0056b3;
}

.confirm-button:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

/* 削除確認ダイアログの確認ボタンのみ赤色 */
.delete-dialog .confirm-button {
  background: #dc3545;
}

.delete-dialog .confirm-button:hover:not(:disabled) {
  background: #c82333;
}

/* プレビューダイアログスタイル */
.preview-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1001;
  padding: 20px;
}

.preview-dialog {
  background: white;
  border-radius: 16px;
  max-width: 90vw;
  max-height: 90vh;
  width: 800px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
  overflow: hidden;
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #e1e5e9;
  background: #f8f9fa;
}

.preview-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #333;
}

.preview-close {
  background: none;
  border: none;
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;
  color: #666;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-close:hover {
  background: #e9ecef;
  color: #333;
}

.preview-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 24px;
  color: #666;
}

.preview-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 24px;
  color: #999;
}

.preview-empty svg {
  margin-bottom: 16px;
  opacity: 0.5;
}

.preview-content {
  padding: 24px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.preview-player {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.preview-image-container {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8f9fa;
  border-radius: 12px;
  min-height: 300px;
  margin-bottom: 20px;
  overflow: hidden;
}

.preview-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.preview-frame-counter {
  position: absolute;
  top: 12px;
  right: 12px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
}

.preview-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 12px;
}

.preview-fps-control {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.preview-fps-control label {
  font-weight: 500;
  color: #333;
  white-space: nowrap;
}

.fps-slider {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: #e1e5e9;
  outline: none;
  -webkit-appearance: none;
}

.fps-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #007aff;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.fps-slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #007aff;
  cursor: pointer;
  border: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.fps-value {
  font-weight: 600;
  color: #007aff;
  min-width: 30px;
  text-align: center;
}

.preview-buttons {
  display: flex;
  gap: 8px;
}

.preview-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
}

.play-button {
  background: #007aff;
  color: white;
}

.play-button:hover:not(:disabled) {
  background: #0056b3;
  transform: translateY(-1px);
}

.stop-button {
  background: #ff3b30;
  color: white;
}

.stop-button:hover {
  background: #d70015;
  transform: translateY(-1px);
}

.preview-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

/* モバイル対応 */
@media (max-width: 768px) {
  .frames-grid {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 0.75rem;
  }

  .toolbar {
    flex-direction: column;
    gap: 0.75rem;
    align-items: stretch;
  }

  .toolbar-left,
  .toolbar-right {
    justify-content: center;
    flex-wrap: wrap;
  }

  .frame-meta {
    flex-direction: column;
    gap: 0.25rem;
  }

  .modal-actions,
  .delete-actions {
    flex-direction: column;
  }

  .modal-dialog,
  .delete-dialog {
    margin: 1rem;
    padding: 1.5rem;
  }

  .tool-button {
    font-size: 0.8rem;
    padding: 0.4rem 0.6rem;
  }

  .tool-button svg {
    width: 16px;
    height: 16px;
  }

  /* プレビューダイアログのモバイル対応 */
  .preview-dialog {
    width: 95vw;
    max-height: 85vh;
  }
  
  .preview-controls {
    flex-direction: column;
    gap: 16px;
  }
  
  .preview-fps-control {
    width: 100%;
  }
  
  .preview-buttons {
    justify-content: center;
    width: 100%;
  }
  
  .preview-button {
    flex: 1;
    justify-content: center;
  }
}
</style>
