<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useProjectStore } from '../stores/project'

const router = useRouter()
const projectStore = useProjectStore()

// アプリケーション起動時に適切なページにリダイレクト
onMounted(() => {
  if (projectStore.hasBucketName) {
    // バケット名が設定済みの場合はカメラページへ
    router.push('/camera')
  } else {
    // バケット名が未設定の場合はセットアップページへ
    router.push('/setup')
  }
})
</script>

<template>
  <div class="home-view">
    <div class="loading-container">
      <div class="spinner"></div>
      <p class="loading-text">Stop Motion Collaborator を起動中...</p>
    </div>
  </div>
</template>

<style scoped>
.home-view {
  min-height: 100vh;
  background: #000000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.loading-container {
  text-align: center;
  color: white;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top: 4px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1.5rem auto;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.loading-text {
  font-size: 1.125rem;
  margin: 0;
  opacity: 0.9;
}

/* モバイル対応 */
@media (max-width: 768px) {
  .loading-text {
    font-size: 1rem;
  }

  .spinner {
    width: 40px;
    height: 40px;
  }
}
</style>
