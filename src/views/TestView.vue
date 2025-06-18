<template>
  <div class="test-page">
    <h1>コマ撮りテスト</h1>

    <div class="test-section">
      <h2>カメラテスト</h2>
      <button @click="startCamera" :disabled="cameraActive">カメラ開始</button>
      <button @click="stopCamera" :disabled="!cameraActive">カメラ停止</button>
      <button @click="takePhoto" :disabled="!cameraActive">写真撮影</button>

      <div class="camera-container">
        <video ref="videoRef" autoplay playsinline></video>
      </div>
    </div>

    <div class="test-section" v-if="capturedPhotos.length > 0">
      <h2>撮影した写真 ({{ capturedPhotos.length }}枚)</h2>
      <div class="photos-grid">
        <div v-for="(photo, index) in capturedPhotos" :key="index" class="photo-item">
          <img :src="photo.url" :alt="`Frame ${index + 1}`" />
          <span>Frame {{ index + 1 }}</span>
        </div>
      </div>

      <button @click="uploadPhotos" :disabled="uploading" class="upload-btn">
        {{ uploading ? 'アップロード中...' : 'S3にアップロード' }}
      </button>
    </div>

    <div class="test-section" v-if="uploadResults.length > 0">
      <h2>アップロード結果</h2>
      <div class="results">
        <div
          v-for="result in uploadResults"
          :key="result.frame"
          :class="['result-item', result.success ? 'success' : 'error']"
        >
          Frame {{ result.frame }}: {{ result.success ? '成功' : `失敗 - ${result.error}` }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { CameraService } from '@/services/camera'
import { S3Service } from '@/services/s3'

const videoRef = ref<HTMLVideoElement>()
const cameraActive = ref(false)
const capturedPhotos = ref<{ blob: Blob; url: string }[]>([])
const uploading = ref(false)
const uploadResults = ref<Array<{ frame: number; success: boolean; error?: string }>>([])

const cameraService = new CameraService()
const s3Service = new S3Service('test-bucket-name')

const projectId = 'test-project-' + Date.now()

async function startCamera() {
  try {
    const stream = await cameraService.startCamera()
    if (videoRef.value) {
      videoRef.value.srcObject = stream
      cameraActive.value = true
    }
  } catch (error) {
    console.error('Camera start failed:', error)
    alert('カメラの開始に失敗しました')
  }
}

function stopCamera() {
  cameraService.stopCamera()
  if (videoRef.value) {
    videoRef.value.srcObject = null
  }
  cameraActive.value = false
}

async function takePhoto() {
  if (!videoRef.value) return

  try {
    const blob = await cameraService.capturePhoto(videoRef.value)
    const url = URL.createObjectURL(blob)

    capturedPhotos.value.push({ blob, url })
  } catch (error) {
    console.error('Photo capture failed:', error)
    alert('写真の撮影に失敗しました')
  }
}

async function uploadPhotos() {
  if (capturedPhotos.value.length === 0) return

  uploading.value = true
  uploadResults.value = []

  try {
    // 写真をフレーム形式に変換
    const frames = capturedPhotos.value.map((photo, index) => ({
      frame: index + 1,
      blob: photo.blob,
    }))

    // S3に一括アップロード
    const results = await s3Service.syncFrames(projectId, frames)
    uploadResults.value = results

    console.log('Project ID:', projectId)
    console.log('Upload results:', results)
  } catch (error) {
    console.error('Upload failed:', error)
    alert('アップロードに失敗しました')
  } finally {
    uploading.value = false
  }
}

onUnmounted(() => {
  stopCamera()
  // メモリリークを防ぐためURLを解放
  capturedPhotos.value.forEach((photo) => {
    URL.revokeObjectURL(photo.url)
  })
})
</script>

<style scoped>
.test-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.test-section {
  margin-bottom: 30px;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.camera-container {
  margin-top: 15px;
}

video {
  width: 100%;
  max-width: 400px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.photos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 10px;
  margin: 15px 0;
}

.photo-item {
  text-align: center;
}

.photo-item img {
  width: 100%;
  height: 80px;
  object-fit: cover;
  border-radius: 4px;
}

.upload-btn {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

.upload-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.results {
  margin-top: 15px;
}

.result-item {
  padding: 8px 12px;
  margin-bottom: 5px;
  border-radius: 4px;
}

.result-item.success {
  background-color: #d4edda;
  color: #155724;
}

.result-item.error {
  background-color: #f8d7da;
  color: #721c24;
}

button {
  margin-right: 10px;
  margin-bottom: 10px;
  padding: 8px 16px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: #f8f9fa;
  cursor: pointer;
}

button:disabled {
  background-color: #e9ecef;
  cursor: not-allowed;
}

h1,
h2 {
  color: #333;
}
</style>
