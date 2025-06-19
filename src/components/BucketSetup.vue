<template>
  <div class="bucket-setup">
    <div class="setup-container">
      <!-- 既存のプロジェクト読み込み -->
      <form data-testid="setup-form" class="setup-form" @submit.prevent="handleSetup">
        <h2 class="section-title">既存プロジェクトを開く</h2>

        <input
          id="bucket-name"
          v-model="bucketName"
          data-testid="bucket-name-input"
          type="text"
          placeholder="S3 Bucket Name"
          :disabled="isLoading"
          required
        />

        <input
          id="project-id"
          v-model="projectId"
          data-testid="project-id-input"
          type="text"
          placeholder="Project ID"
          :disabled="isLoading"
          required
        />

        <button
          data-testid="setup-button"
          type="submit"
          class="setup-button"
          :disabled="!isFormValid || isLoading"
        >
          {{ isLoading ? '...' : 'START' }}
        </button>

        <div v-if="error" data-testid="error-message" class="error-message">
          {{ error }}
        </div>

        <div v-if="showDebugInfo && projectStore.debugError" class="debug-info">
          <details>
            <summary>Debug Information (Click to expand)</summary>
            <pre>{{ projectStore.debugError }}</pre>
          </details>
        </div>

        <div v-if="error" class="debug-toggle">
          <label>
            <input type="checkbox" v-model="showDebugInfo" />
            Show debug information
          </label>
        </div>
      </form>

      <!-- OR セパレーター -->
      <div class="separator">
        <div class="separator-line"></div>
        <span class="separator-text">OR</span>
        <div class="separator-line"></div>
      </div>

      <!-- 新規プロジェクト作成 -->
      <form data-testid="create-form" class="create-form" @submit.prevent="handleCreateProject">
        <h2 class="section-title">新規プロジェクトを作成</h2>

        <input
          id="create-bucket-name"
          v-model="createBucketName"
          data-testid="create-bucket-name-input"
          type="text"
          placeholder="S3 Bucket Name"
          :disabled="isCreating"
          required
        />

        <button
          data-testid="validate-bucket-button"
          type="button"
          class="validate-button"
          :disabled="!createBucketName.trim() || isValidating"
          @click="validateBucket"
        >
          {{ isValidating ? 'バケット確認中...' : 'バケットを確認' }}
        </button>

        <div v-if="bucketValidated" class="bucket-validated">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <polyline points="20,6 9,17 4,12"></polyline>
          </svg>
          バケットが確認されました
        </div>

        <div v-if="bucketValidated" class="project-details">
          <input
            id="create-project-id"
            v-model="createProjectId"
            data-testid="create-project-id-input"
            type="text"
            placeholder="プロジェクト ID (例: my-animation-2024)"
            :disabled="isCreating"
            required
          />

          <input
            id="frame-count"
            v-model.number="frameCount"
            data-testid="frame-count-input"
            type="number"
            placeholder="フレーム数"
            min="1"
            max="1000"
            :disabled="isCreating"
            required
          />

          <button
            data-testid="create-project-button"
            type="submit"
            class="create-button"
            :disabled="!isCreateFormValid || isCreating"
          >
            {{ isCreating ? 'プロジェクト作成中...' : 'プロジェクトを作成' }}
          </button>
        </div>

        <div v-if="createError" data-testid="create-error-message" class="error-message">
          {{ createError }}
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useProjectStore } from '@/stores/project'
import { S3Service } from '@/services/s3'
import type { ProjectConfig } from '@/types'

// Define emits
const emit = defineEmits<{
  'setup-complete': [projectId: string]
}>()

// Store
const projectStore = useProjectStore()

// Reactive state for existing project
const bucketName = ref('')
const projectId = ref('')
const isLoading = ref(false)
const error = ref('')
const showDebugInfo = ref(false)

// Reactive state for new project creation
const createBucketName = ref('')
const createProjectId = ref('')
const frameCount = ref(30)
const isCreating = ref(false)
const isValidating = ref(false)
const bucketValidated = ref(false)
const createError = ref('')

// Computed properties
const isFormValid = computed(() => {
  return bucketName.value.length > 0 && projectId.value.length > 0
})

const isCreateFormValid = computed(() => {
  return (
    bucketValidated.value &&
    createProjectId.value.length > 0 &&
    frameCount.value > 0 &&
    frameCount.value <= 1000
  )
})

// Methods for existing project
const handleSetup = async () => {
  if (!isFormValid.value) return

  isLoading.value = true
  error.value = ''

  try {
    projectStore.setBucketName(bucketName.value.trim())
    projectStore.setProjectId(projectId.value.trim())
    await projectStore.loadConfig(projectId.value.trim())

    // プロジェクトストアのエラーをチェック
    if (projectStore.error) {
      error.value = projectStore.error
      projectStore.clearBucketName()
      projectStore.clearProjectId()
      return
    }

    // 成功した場合
    emit('setup-complete', projectId.value.trim())
  } catch (err) {
    console.error('Setup error:', err)
    error.value = 'Failed to connect to S3. Please check your bucket name and project ID.'
    projectStore.clearBucketName()
  } finally {
    isLoading.value = false
  }
}

// Methods for new project creation
const validateBucket = async () => {
  if (!createBucketName.value.trim()) return

  isValidating.value = true
  createError.value = ''
  bucketValidated.value = false

  try {
    // バケットアクセステスト：テスト用のHEADリクエストを実行
    const testKey = 'test-access'
    const url = `https://${createBucketName.value.trim()}.s3.ap-northeast-1.amazonaws.com/${testKey}`

    const response = await fetch(url, {
      method: 'HEAD',
      mode: 'cors',
    })

    // 404はバケットがアクセス可能だが、ファイルが存在しないことを意味する（これはOK）
    // 403 Forbiddenや他のエラーはアクセス権限の問題を意味する
    if (response.status === 404 || response.status === 200) {
      bucketValidated.value = true
    } else if (response.status === 403) {
      throw new Error('アクセスが拒否されました')
    } else {
      throw new Error(`バケットへのアクセスに失敗: HTTP ${response.status}`)
    }
  } catch (err) {
    console.error('Bucket validation error:', err)
    if (err instanceof TypeError && err.message === 'Failed to fetch') {
      createError.value =
        'ネットワークエラーまたはCORS設定に問題があります。バケット名とCORS設定を確認してください。'
    } else {
      createError.value =
        err instanceof Error
          ? err.message
          : 'バケットにアクセスできません。バケット名を確認してください。'
    }
  } finally {
    isValidating.value = false
  }
}

const handleCreateProject = async () => {
  if (!isCreateFormValid.value) return

  isCreating.value = true
  createError.value = ''

  try {
    const s3Service = new S3Service(createBucketName.value.trim())

    // プロジェクト設定を作成
    const config: ProjectConfig = {
      totalFrames: frameCount.value,
      fps: 12,
      aspectRatio: 16 / 9,
      frames: Array.from({ length: frameCount.value }, (_, index) => ({
        number: index,
        taken: false,
        filename: null,
        notes: '',
      })),
    }

    // S3にconfig.jsonをアップロード
    await s3Service.uploadConfig(createProjectId.value.trim(), config)

    // プロジェクトストアに設定
    projectStore.setBucketName(createBucketName.value.trim())
    projectStore.setProjectId(createProjectId.value.trim())

    // 設定を直接ストアに設定
    projectStore.config = config

    // 成功した場合
    emit('setup-complete', createProjectId.value.trim())
  } catch (err) {
    console.error('Project creation error:', err)
    createError.value = 'プロジェクトの作成に失敗しました。S3の設定を確認してください。'
  } finally {
    isCreating.value = false
  }
}

// Load existing bucket name on mount
projectStore.loadBucketName()
</script>

<style scoped>
.bucket-setup {
  min-height: 100vh;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.setup-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
  max-width: 400px;
}

.setup-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.setup-form input {
  padding: 16px 20px;
  border: 2px solid #fff;
  border-radius: 8px;
  font-size: 16px;
  background: #fff;
  color: #000;
  transition: all 0.2s;
}

.setup-form input:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.3);
}

.setup-form input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.setup-form input::placeholder {
  color: #666;
}

.setup-button {
  padding: 16px 20px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.setup-button:hover:not(:disabled) {
  background: #0056b3;
  transform: translateY(-1px);
}

.setup-button:disabled {
  background: #666;
  cursor: not-allowed;
  transform: none;
}

.error-message {
  color: #ff4444;
  background: rgba(255, 68, 68, 0.1);
  padding: 12px 16px;
  border-radius: 6px;
  font-size: 14px;
  text-align: center;
}

.debug-info {
  margin-top: 12px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 12px;
}

.debug-info details {
  cursor: pointer;
}

.debug-info summary {
  color: #ccc;
  font-size: 12px;
  margin-bottom: 8px;
}

.debug-info pre {
  background: rgba(0, 0, 0, 0.3);
  padding: 8px;
  border-radius: 4px;
  font-size: 11px;
  color: #fff;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
}

.debug-toggle {
  margin-top: 8px;
  text-align: center;
}

.debug-toggle label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #ccc;
  font-size: 12px;
  cursor: pointer;
}

.debug-toggle input[type='checkbox'] {
  width: auto;
  margin: 0;
  padding: 0;
}

/* 新規プロジェクト作成のスタイル */
.section-title {
  color: #fff;
  text-align: center;
  margin: 0 0 15px 0;
  font-size: 1.2rem;
  font-weight: 600;
}

.create-form {
  display: flex;
  flex-direction: column;
  gap: 15px;
  padding: 25px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.create-form input {
  padding: 16px 20px;
  border: 2px solid #fff;
  border-radius: 8px;
  font-size: 16px;
  background: #fff;
  color: #000;
  transition: all 0.2s;
}

.create-form input:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.3);
}

.validate-button,
.create-button {
  padding: 16px 24px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.validate-button:hover:not(:disabled),
.create-button:hover:not(:disabled) {
  background: #0056b3;
  transform: translateY(-1px);
}

.validate-button:disabled,
.create-button:disabled {
  background: #6c757d;
  cursor: not-allowed;
  transform: none;
}

.separator {
  display: flex;
  align-items: center;
  gap: 15px;
  margin: 20px 0;
}

.separator-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.3), transparent);
}

.separator-text {
  color: rgba(255, 255, 255, 0.7);
  font-weight: 600;
  font-size: 14px;
  padding: 0 10px;
}

.bucket-validated {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #28a745;
  font-size: 14px;
  font-weight: 600;
  padding: 12px;
  background: rgba(40, 167, 69, 0.1);
  border: 1px solid rgba(40, 167, 69, 0.3);
  border-radius: 6px;
}

.project-details {
  display: flex;
  flex-direction: column;
  gap: 15px;
  padding-top: 15px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

/* 既存のスタイルを更新 */
.setup-container {
  display: flex;
  flex-direction: column;
  gap: 30px;
  width: 100%;
  max-width: 450px;
}

.setup-form {
  display: flex;
  flex-direction: column;
  gap: 15px;
  padding: 25px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

/* モバイル対応 */
@media (max-width: 768px) {
  .setup-container {
    max-width: 100%;
    gap: 25px;
  }

  .setup-form,
  .create-form {
    padding: 20px;
  }

  .section-title {
    font-size: 1.1rem;
  }
}
</style>
