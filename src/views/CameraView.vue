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

        <h1 class="title">カメラ撮影</h1>

        <button
          class="nav-button gallery-button"
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
      </div>
    </header>

    <main class="main-content">
      <CameraInterface @error="handleError" />
    </main>

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
  display: flex;
  flex-direction: column;
}

.header {
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  position: relative;
  z-index: 10;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  max-width: 100%;
}

.nav-button {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 50%;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.nav-button:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.05);
}

.nav-button:active {
  transform: scale(0.95);
}

.title {
  color: white;
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
  text-align: center;
  flex: 1;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
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
  .header-content {
    padding: 0.75rem;
  }

  .nav-button {
    width: 44px;
    height: 44px;
  }

  .title {
    font-size: 1.1rem;
  }

  .error-dialog {
    padding: 1.5rem;
    margin: 1rem;
  }
}

/* 横向き対応 */
@media (orientation: landscape) and (max-height: 600px) {
  .header-content {
    padding: 0.5rem;
  }

  .nav-button {
    width: 40px;
    height: 40px;
  }

  .title {
    font-size: 1rem;
  }
}
</style>
