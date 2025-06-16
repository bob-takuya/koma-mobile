<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useProjectStore } from '../stores/project'

const router = useRouter()
const projectStore = useProjectStore()

const frames = computed(() => projectStore.frames)
const selectedFrames = ref<Set<string>>(new Set())
const showDeleteConfirm = ref(false)
const viewMode = ref<'grid' | 'list'>('grid')

// API キーが設定されていない場合はセットアップページに戻る
onMounted(() => {
  if (!projectStore.hasApiKey) {
    router.push('/setup')
  }
})

const navigateToCamera = () => {
  router.push('/camera')
}

const navigateToSetup = () => {
  router.push('/setup')
}

const toggleFrameSelection = (frameId: string) => {
  if (selectedFrames.value.has(frameId)) {
    selectedFrames.value.delete(frameId)
  } else {
    selectedFrames.value.add(frameId)
  }
}

const selectAllFrames = () => {
  selectedFrames.value = new Set(frames.value.map((f) => f.id))
}

const clearSelection = () => {
  selectedFrames.value.clear()
}

const deleteSelectedFrames = () => {
  if (selectedFrames.value.size === 0) return
  showDeleteConfirm.value = true
}

const confirmDelete = () => {
  selectedFrames.value.forEach((frameId) => {
    projectStore.deleteFrame(frameId)
  })
  selectedFrames.value.clear()
  showDeleteConfirm.value = false
}

const cancelDelete = () => {
  showDeleteConfirm.value = false
}

const toggleViewMode = () => {
  viewMode.value = viewMode.value === 'grid' ? 'list' : 'grid'
}

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
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
          :key="frame.id"
          class="frame-item"
          :class="{ selected: selectedFrames.has(frame.id) }"
          @click="toggleFrameSelection(frame.id)"
        >
          <div class="frame-image">
            <img :src="frame.localUrl || frame.url" :alt="`Frame ${frame.sequence}`" />
            <div class="frame-overlay">
              <div class="frame-sequence">{{ frame.sequence }}</div>
              <div class="frame-checkbox">
                <svg
                  v-if="selectedFrames.has(frame.id)"
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
            <div class="frame-time">{{ formatDate(frame.timestamp) }}</div>
          </div>
        </div>
      </div>

      <!-- リスト表示 -->
      <div v-else class="frames-list">
        <div
          v-for="frame in frames"
          :key="frame.id"
          class="frame-row"
          :class="{ selected: selectedFrames.has(frame.id) }"
          @click="toggleFrameSelection(frame.id)"
        >
          <div class="frame-checkbox-col">
            <div class="frame-checkbox">
              <svg
                v-if="selectedFrames.has(frame.id)"
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
            <img :src="frame.localUrl || frame.url" :alt="`Frame ${frame.sequence}`" />
          </div>
          <div class="frame-details">
            <div class="frame-sequence-large">フレーム #{{ frame.sequence }}</div>
            <div class="frame-meta">
              <span class="frame-time">{{ formatDate(frame.timestamp) }}</span>
              <span class="frame-size">{{ formatFileSize(frame.size || 0) }}</span>
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
          選択した {{ selectedFrames.size }} 個のフレームを削除しますか？<br />
          この操作は取り消せません。
        </p>
        <div class="delete-actions">
          <button class="cancel-button" @click="cancelDelete">キャンセル</button>
          <button class="confirm-button" @click="confirmDelete">削除</button>
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
}

.frame-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.frame-item.selected {
  border: 2px solid #007bff;
  transform: translateY(-2px);
}

.frame-image {
  position: relative;
  aspect-ratio: 4/3;
  overflow: hidden;
}

.frame-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
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
}

.frame-row:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.frame-row.selected {
  background: #e3f2fd;
  border: 1px solid #007bff;
}

.frame-checkbox-col {
  flex-shrink: 0;
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
  text-align: center;
}

.delete-title {
  color: #dc3545;
  font-size: 1.25rem;
  margin-bottom: 1rem;
}

.delete-message {
  color: #495057;
  margin-bottom: 2rem;
  line-height: 1.5;
}

.delete-actions {
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
}

.cancel-button {
  background: #f8f9fa;
  color: #495057;
  border: 1px solid #dee2e6;
}

.cancel-button:hover {
  background: #e9ecef;
}

.confirm-button {
  background: #dc3545;
  color: white;
  border: 1px solid #dc3545;
}

.confirm-button:hover {
  background: #c82333;
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
  }

  .frame-meta {
    flex-direction: column;
    gap: 0.25rem;
  }

  .delete-actions {
    flex-direction: column;
  }
}
</style>
