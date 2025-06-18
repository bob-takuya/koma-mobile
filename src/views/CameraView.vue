<script setup lang="ts">
import CameraInterface from '../components/CameraInterface.vue'
import { useRouter } from 'vue-router'
import { useProjectStore } from '../stores/project'
import { ref, onMounted } from 'vue'

const router = useRouter()
const projectStore = useProjectStore()
const showError = ref(false)
const errorMessage = ref('')

// API キーが設定されていない場合はセットアップページに戻る
onMounted(() => {
  if (!projectStore.hasBucketName || !projectStore.hasProjectId) {
    router.push('/setup')
  }
})

const handleError = (error: string) => {
  errorMessage.value = error
  showError.value = true
}

const dismissError = () => {
  showError.value = false
  errorMessage.value = ''
}

const navigateToGallery = () => {
  router.push('/gallery')
}

const navigateToSetup = () => {
  router.push('/setup')
}
</script>

<template>
  <div class="camera-view">
    <!-- 全画面カメラインターフェース -->
    <CameraInterface @error="handleError" />

    <!-- 浮遊する設定ボタン（左上） -->
    <button
      class="floating-nav-button settings-button"
      @click="navigateToSetup"
      aria-label="設定に戻る"
    >
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

    <!-- 浮遊するギャラリーボタン（右上） -->
    <button
      class="floating-nav-button gallery-button"
      @click="navigateToGallery"
      aria-label="ギャラリーを開く"
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21,15 16,10 5,21" />
      </svg>
    </button>

    <!-- エラーオーバーレイ -->
    <div v-if="showError" class="error-overlay" @click="dismissError">
      <div class="error-dialog" @click.stop>
        <h3 class="error-title">エラーが発生しました</h3>
        <p class="error-message">{{ errorMessage }}</p>
        <button class="error-button" @click="dismissError">OK</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.camera-view {
  min-height: 100vh;
  background: #000;
  position: relative;
  overflow: hidden;
}

/* 浮遊するナビゲーションボタン */
.floating-nav-button {
  position: absolute;
  top: 1rem;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(10px);
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  z-index: 100;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.floating-nav-button:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.4);
  transform: scale(1.1);
  box-shadow: 0 6px 30px rgba(0, 0, 0, 0.4);
}

.floating-nav-button:active {
  transform: scale(0.95);
}

/* 設定ボタンの位置（左上） */
.settings-button {
  left: 1rem;
}

/* ギャラリーボタンの位置（右上） */
.gallery-button {
  right: 1rem;
}

.error-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.error-dialog {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  max-width: 400px;
  width: 100%;
  text-align: center;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
}

.error-title {
  color: #dc3545;
  font-size: 1.25rem;
  margin-bottom: 1rem;
}

.error-message {
  color: #666;
  margin-bottom: 1.5rem;
  line-height: 1.5;
}

.error-button {
  background: #007bff;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.7rem 2rem;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.error-button:hover {
  background: #0056b3;
}

/* モバイル対応 */
@media (max-width: 768px) {
  .floating-nav-button {
    width: 52px;
    height: 52px;
    top: 0.75rem;
  }

  .settings-button {
    left: 0.75rem;
  }

  .gallery-button {
    right: 0.75rem;
  }

  .error-dialog {
    padding: 1.5rem;
    margin: 1rem;
  }
}

/* セーフエリア対応（iPhone等のノッチ対応） */
@media (max-width: 768px) {
  .floating-nav-button {
    top: max(0.75rem, env(safe-area-inset-top));
  }

  .settings-button {
    left: max(0.75rem, env(safe-area-inset-left));
  }

  .gallery-button {
    right: max(0.75rem, env(safe-area-inset-right));
  }
}

/* 横向き対応 */
@media (orientation: landscape) and (max-height: 600px) {
  .floating-nav-button {
    width: 48px;
    height: 48px;
    top: 0.5rem;
  }

  .settings-button {
    left: 0.5rem;
  }

  .gallery-button {
    right: 0.5rem;
  }
}
</style>
