<script setup lang="ts">
import ApiKeySetup from '../components/ApiKeySetup.vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const handleApiKeySet = () => {
  router.push('/camera')
}
</script>

<template>
  <div class="setup-view">
    <div class="container">
      <header class="header">
        <h1 class="title">Stop Motion Collaborator</h1>
        <p class="description">コマ撮りアニメーション制作のためのモバイルアプリケーション</p>
      </header>

      <main class="main-content">
        <ApiKeySetup @api-key-set="handleApiKeySet" />
      </main>

      <footer class="footer">
        <p class="version">Version 1.0.0</p>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.setup-view {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.container {
  width: 100%;
  max-width: 500px;
  background: white;
  border-radius: 20px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 2rem;
  text-align: center;
}

.title {
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
}

.description {
  font-size: 1rem;
  opacity: 0.9;
  margin: 0;
}

.main-content {
  padding: 2rem;
}

.footer {
  background: #f8f9fa;
  padding: 1rem;
  text-align: center;
  border-top: 1px solid #e9ecef;
}

.version {
  font-size: 0.875rem;
  color: #6c757d;
  margin: 0;
}

/* モバイル対応 */
@media (max-width: 768px) {
  .setup-view {
    padding: 0.5rem;
  }

  .title {
    font-size: 1.5rem;
  }

  .main-content {
    padding: 1.5rem;
  }
}
</style>
