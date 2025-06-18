<template>
  <div class="bucket-setup">
    <div class="setup-container">
      <form data-testid="setup-form" class="setup-form" @submit.prevent="handleSetup">
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useProjectStore } from '@/stores/project'

// Define emits
const emit = defineEmits<{
  'setup-complete': [projectId: string]
}>()

// Store
const projectStore = useProjectStore()

// Reactive state
const bucketName = ref('')
const projectId = ref('')
const isLoading = ref(false)
const error = ref('')
const showDebugInfo = ref(false)

// Computed properties
const isFormValid = computed(() => {
  return bucketName.value.length > 0 && projectId.value.length > 0
})

// Methods
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
</style>
