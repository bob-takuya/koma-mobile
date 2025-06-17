<script setup lang="ts">
/**
 * Stop Motion Collaborator using Tweeq Framework
 * Integrated Tweeq-based application following the reference pattern
 */

import { initTweeq, useTweeq } from '@/composables/useTweeq'
import CameraInterface from '@/components/CameraInterface.vue'
import { useProjectStore } from '@/stores/project'

// Initialize Tweeq with StopMotion theme
initTweeq('com.stopmotion.collaborator', {
  colorMode: 'light',
  accentColor: '#667eea',
  grayColor: '#9494B8',
  backgroundColor: '#fcfcfc',
})

const tweeq = useTweeq()
const projectStore = useProjectStore()

// Handle frame number input
function handleFrameChange(event: Event) {
  const target = event.target as HTMLInputElement
  const frameNumber = parseInt(target.value)
  if (!isNaN(frameNumber)) {
    projectStore.setCurrentFrame(frameNumber - 1)
  }
}

// Register StopMotion-specific actions
tweeq.actions.register([
  {
    id: 'camera',
    icon: 'camera',
    children: [
      {
        id: 'take_photo',
        bind: 'space',
        perform() {
          // This will be handled by the CameraInterface component
          console.log('Take photo action triggered')
        },
      },
      {
        id: 'next_frame',
        bind: 'right',
        perform() {
          console.log('Next frame action triggered')
        },
      },
      {
        id: 'prev_frame',
        bind: 'left',
        perform() {
          console.log('Previous frame action triggered')
        },
      },
    ],
  },
])
</script>

<template>
  <div class="tweeq-app">
    <header class="title-bar">
      <div class="title-section">
        <img src="/favicon.ico" alt="App Icon" class="app-icon" />
        <h1>StopMotion Collaborator</h1>
      </div>
      <div class="controls">
        <div class="input-group">
          <label class="checkbox-input" v-if="projectStore.getCurrentFrameData">
            <input type="checkbox" :checked="false" />
            <span>📹</span>
          </label>
          <div class="number-input">
            <input
              type="number"
              :value="projectStore.currentFrame + 1"
              :min="1"
              :max="projectStore.totalFrames"
              :step="1"
              @input="handleFrameChange"
            />
            <span class="suffix">frame</span>
          </div>
        </div>
      </div>
    </header>

    <main class="main-content">
      <CameraInterface />
    </main>
  </div>
</template>

<style scoped>
.tweeq-app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: var(--background-color, #fcfcfc);
}

.title-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1rem;
  background-color: var(--accent-color, #667eea);
  color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.title-section {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.app-icon {
  width: 24px;
  height: 24px;
}

.title-section h1 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.controls {
  display: flex;
  align-items: center;
}

.input-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 0.375rem;
  padding: 0.25rem 0.5rem;
}

.checkbox-input {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  cursor: pointer;
}

.checkbox-input input[type='checkbox'] {
  margin: 0;
}

.number-input {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.number-input input[type='number'] {
  width: 4rem;
  padding: 0.25rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 0.25rem;
  background-color: rgba(255, 255, 255, 0.1);
  color: white;
  text-align: center;
}

.number-input input[type='number']:focus {
  outline: none;
  border-color: rgba(255, 255, 255, 0.5);
  background-color: rgba(255, 255, 255, 0.2);
}

.suffix {
  font-size: 0.875rem;
  opacity: 0.9;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}
</style>
