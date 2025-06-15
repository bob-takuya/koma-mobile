<script setup lang="ts">
/**
 * Stop Motion Collaborator using Tweeq Framework
 * Integrated Tweeq-based application following the reference pattern
 */

import { useTweeq, Tq } from '@/composables/useTweeq'
import CameraInterface from '@/components/CameraInterface.vue'
import { useProjectStore } from '@/stores/project'

const tweeq = useTweeq()
const projectStore = useProjectStore()

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
        }
      },
      {
        id: 'next_frame',
        bind: 'right',
        perform() {
          console.log('Next frame action triggered')
        }
      },
      {
        id: 'prev_frame',
        bind: 'left',
        perform() {
          console.log('Previous frame action triggered')
        }
      }
    ]
  }
])
</script>

<template>
  <Tq.App>
    <template #title>
      <Tq.TitleBar name="StopMotion Collaborator" icon="/favicon.ico">
        <template #center>
          <Tq.InputGroup>
            <Tq.InputCheckbox
              v-if="projectStore.getCurrentFrameData"
              :modelValue="false"
              icon="📹"
              inlinePosition="start"
            />
            <Tq.InputNumber
              :modelValue="projectStore.currentFrame + 1"
              :min="1"
              :max="projectStore.totalFrames"
              :step="1"
              suffix=" frame"
              style="width: 6em"
              inlinePosition="end"
              @update:modelValue="projectStore.setCurrentFrame($event - 1)"
            />
          </Tq.InputGroup>
        </template>
      </Tq.TitleBar>
    </template>
    
    <template #default>
      <div class="main-content">
        <CameraInterface />
      </div>
    </template>
  </Tq.App>
</template>

<style scoped>
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}
</style>
