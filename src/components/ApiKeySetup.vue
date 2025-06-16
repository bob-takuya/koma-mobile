<template>
  <div class="api-key-setup">
    <!-- Current Setup Display -->
    <div v-if="projectStore.apiKey && !showForm" data-testid="current-setup" class="current-setup">
      <h2>Current Setup</h2>
      <div class="setup-info">
        <div class="info-item">
          <label>API Key:</label>
          <span class="masked-key">{{ maskedApiKey }}</span>
        </div>
      </div>

      <div class="action-buttons">
        <button data-testid="change-api-key" class="secondary-button" @click="showForm = true">
          Change API Key
        </button>
        <button data-testid="clear-api-key" class="danger-button" @click="clearSetup">
          Clear Setup
        </button>
      </div>
    </div>

    <!-- Setup Form -->
    <div v-else class="setup-container">
      <div class="setup-header">
        <h1>StopMotion Collaborator</h1>
        <p class="subtitle">Set up your project access</p>
      </div>

      <div data-testid="setup-instructions" class="setup-instructions">
        <h3>Setup Instructions:</h3>
        <ol>
          <li>Enter your AWS S3 API key for project access</li>
          <li>Specify the Project ID you want to work on</li>
          <li>Click "Set Up Project" to begin</li>
        </ol>
      </div>

      <form data-testid="setup-form" class="setup-form" @submit.prevent="handleSetup">
        <div class="form-group">
          <label for="api-key">API Key *</label>
          <input
            id="api-key"
            v-model="apiKey"
            data-testid="api-key-input"
            type="password"
            placeholder="Enter your AWS access key"
            :disabled="isLoading"
            required
          />
          <small data-testid="api-key-help" class="help-text">
            AWS access key with S3 read/write permissions for your project bucket
          </small>
        </div>

        <div class="form-group">
          <label for="project-id">Project ID *</label>
          <input
            id="project-id"
            v-model="projectId"
            data-testid="project-id-input"
            type="text"
            placeholder="e.g., my-stopmotion-project"
            :disabled="isLoading"
            required
          />
          <small data-testid="project-id-help" class="help-text">
            Unique identifier for your stop motion project
          </small>
        </div>

        <button
          data-testid="setup-button"
          type="submit"
          class="setup-button primary-button"
          :disabled="!isFormValid || isLoading"
        >
          {{ isLoading ? 'Setting up...' : 'Set Up Project' }}
        </button>

        <div v-if="error" data-testid="error-message" class="error-message">
          {{ error }}
        </div>
      </form>

      <div class="help-section">
        <h4>Need Help?</h4>
        <ul>
          <li>Ensure your API key has proper S3 permissions</li>
          <li>Project ID should match your S3 bucket structure</li>
          <li>Contact your project administrator for access details</li>
        </ul>
      </div>
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
const showForm = ref(!projectStore.apiKey)
const apiKey = ref('')
const projectId = ref('')
const isLoading = ref(false)
const error = ref('')

// Computed properties
const isFormValid = computed(() => {
  return apiKey.value.length > 0 && projectId.value.length > 0
})

const maskedApiKey = computed(() => {
  if (!projectStore.apiKey) return ''
  const key = projectStore.apiKey
  return key.length > 8
    ? `${key.substring(0, 4)}${'*'.repeat(key.length - 8)}${key.substring(key.length - 4)}`
    : '*'.repeat(key.length)
})

// Methods
const validateForm = (): boolean => {
  error.value = ''

  if (!apiKey.value.trim()) {
    error.value = 'API key is required'
    return false
  }

  if (apiKey.value.length < 8) {
    error.value = 'API key format appears invalid (too short)'
    return false
  }

  if (!projectId.value.trim()) {
    error.value = 'Project ID is required'
    return false
  }

  if (!/^[a-zA-Z0-9-_]+$/.test(projectId.value)) {
    error.value = 'Project ID can only contain letters, numbers, hyphens, and underscores'
    return false
  }

  return true
}

const handleSetup = async () => {
  if (!validateForm()) return

  isLoading.value = true
  error.value = ''

  try {
    // Set API key in store
    projectStore.setApiKey(apiKey.value.trim())

    // Try to load project config
    await projectStore.loadConfig(projectId.value.trim())

    // If we get here, setup was successful
    showForm.value = false
    emit('setup-complete', projectId.value.trim())
  } catch (err) {
    console.error('Setup failed:', err)
    error.value = 'Failed to connect to project. Please check your API key and project ID.'

    // Clear the API key from store if setup failed
    projectStore.clearApiKey()
  } finally {
    isLoading.value = false
  }
}

const clearSetup = () => {
  projectStore.clearApiKey()
  showForm.value = true
  apiKey.value = ''
  projectId.value = ''
  error.value = ''
}

// Load existing API key on mount
projectStore.loadApiKey()
</script>

<style scoped>
.api-key-setup {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.setup-container,
.current-setup {
  background: white;
  border-radius: 12px;
  padding: 40px;
  max-width: 500px;
  width: 100%;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

.setup-header {
  text-align: center;
  margin-bottom: 30px;
}

.setup-header h1 {
  color: #333;
  margin-bottom: 8px;
  font-size: 28px;
  font-weight: 700;
}

.subtitle {
  color: #666;
  font-size: 16px;
  margin: 0;
}

.setup-instructions {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 30px;
}

.setup-instructions h3 {
  margin-top: 0;
  color: #333;
  font-size: 18px;
}

.setup-instructions ol {
  margin: 16px 0 0 20px;
  color: #555;
}

.setup-instructions li {
  margin-bottom: 8px;
  line-height: 1.5;
}

.setup-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
  font-size: 14px;
}

.form-group input {
  padding: 12px 16px;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
}

.form-group input:disabled {
  background-color: #f8f9fa;
  cursor: not-allowed;
}

.help-text {
  color: #666;
  font-size: 12px;
  margin-top: 4px;
  line-height: 1.4;
}

.primary-button,
.secondary-button,
.danger-button {
  padding: 14px 24px;
  border-radius: 8px;
  border: none;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.primary-button {
  background: #667eea;
  color: white;
}

.primary-button:hover:not(:disabled) {
  background: #5a6fd8;
}

.primary-button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.secondary-button {
  background: #f8f9fa;
  color: #333;
  border: 1px solid #e1e5e9;
}

.secondary-button:hover {
  background: #e9ecef;
}

.danger-button {
  background: #dc3545;
  color: white;
}

.danger-button:hover {
  background: #c82333;
}

.setup-button {
  align-self: stretch;
  margin-top: 8px;
}

.error-message {
  background: #f8d7da;
  color: #721c24;
  padding: 12px 16px;
  border-radius: 6px;
  font-size: 14px;
  border: 1px solid #f5c6cb;
}

.help-section {
  margin-top: 30px;
  padding-top: 24px;
  border-top: 1px solid #e1e5e9;
}

.help-section h4 {
  color: #333;
  margin-bottom: 12px;
  font-size: 16px;
}

.help-section ul {
  margin: 0;
  padding-left: 20px;
  color: #666;
}

.help-section li {
  margin-bottom: 8px;
  line-height: 1.4;
  font-size: 14px;
}

/* Current Setup Styles */
.current-setup h2 {
  color: #333;
  margin-bottom: 24px;
  text-align: center;
}

.setup-info {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-item label {
  font-weight: 600;
  color: #333;
}

.masked-key {
  font-family: monospace;
  color: #666;
  font-size: 14px;
}

.action-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
}

/* Mobile Responsiveness */
@media (max-width: 600px) {
  .api-key-setup {
    padding: 16px;
  }

  .setup-container,
  .current-setup {
    padding: 24px;
  }

  .setup-header h1 {
    font-size: 24px;
  }

  .action-buttons {
    flex-direction: column;
  }

  .primary-button,
  .secondary-button,
  .danger-button {
    padding: 12px 16px;
    font-size: 14px;
  }
}
</style>
