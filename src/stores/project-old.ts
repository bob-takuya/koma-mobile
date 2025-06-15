import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Project, Frame, OnionSkinSettings } from '@/types'

export const useProjectStore = defineStore('project', () => {
  const currentProject = ref<Project | null>(null)
  const currentFrameIndex = ref(0)

  // オニオンスキン設定
  const onionSkinSettings = ref<OnionSkinSettings>({
    enabled: true,
    opacity: 0.3,
    frameCount: 2,
    direction: 'both'
  })

  // 現在のフレーム
  const currentFrame = computed(() => {
    if (!currentProject.value || currentProject.value.frames.length === 0) {
      return null
    }
    return currentProject.value.frames[currentFrameIndex.value] || null
  })

  // オニオンスキン用のフレーム取得
  const getOnionSkinFrames = computed(() => {
    if (!currentProject.value || !onionSkinSettings.value.enabled) {
      return []
    }

    const frames = currentProject.value.frames
    const result: Array<{ frame: Frame; opacity: number }> = []
    const { frameCount, direction } = onionSkinSettings.value
    const baseOpacity = onionSkinSettings.value.opacity

    // 前のフレーム
    if (direction === 'previous' || direction === 'both') {
      for (let i = 1; i <= frameCount; i++) {
        const index = currentFrameIndex.value - i
        if (index >= 0) {
          result.push({
            frame: frames[index],
            opacity: baseOpacity * (1 - (i - 1) / frameCount)
          })
        }
      }
    }

    // 次のフレーム
    if (direction === 'next' || direction === 'both') {
      for (let i = 1; i <= frameCount; i++) {
        const index = currentFrameIndex.value + i
        if (index < frames.length) {
          result.push({
            frame: frames[index],
            opacity: baseOpacity * (1 - (i - 1) / frameCount)
          })
        }
      }
    }

    return result
  })

  // プロジェクト作成
  const createProject = (name: string): Project => {
    const project: Project = {
      id: crypto.randomUUID(),
      name,
      frames: [],
      settings: {
        fps: 24,
        onionSkin: { ...onionSkinSettings.value }
      },
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    
    currentProject.value = project
    currentFrameIndex.value = 0
    return project
  }

  // フレーム追加
  const addFrame = (imageData?: string): Frame => {
    if (!currentProject.value) {
      throw new Error('No active project')
    }

    const frame: Frame = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      imageData
    }

    currentProject.value.frames.push(frame)
    currentProject.value.updatedAt = Date.now()
    currentFrameIndex.value = currentProject.value.frames.length - 1

    return frame
  }

  // フレーム削除
  const removeFrame = (frameId: string) => {
    if (!currentProject.value) return

    const index = currentProject.value.frames.findIndex(f => f.id === frameId)
    if (index !== -1) {
      currentProject.value.frames.splice(index, 1)
      if (currentFrameIndex.value >= currentProject.value.frames.length) {
        currentFrameIndex.value = Math.max(0, currentProject.value.frames.length - 1)
      }
      currentProject.value.updatedAt = Date.now()
    }
  }

  // フレーム移動
  const goToFrame = (index: number) => {
    if (!currentProject.value) return
    
    if (index >= 0 && index < currentProject.value.frames.length) {
      currentFrameIndex.value = index
    }
  }

  const nextFrame = () => {
    if (!currentProject.value) return
    goToFrame(currentFrameIndex.value + 1)
  }

  const previousFrame = () => {
    if (!currentProject.value) return
    goToFrame(currentFrameIndex.value - 1)
  }

  // オニオンスキン設定更新
  const updateOnionSkinSettings = (settings: Partial<OnionSkinSettings>) => {
    onionSkinSettings.value = { ...onionSkinSettings.value, ...settings }
    if (currentProject.value) {
      currentProject.value.settings.onionSkin = { ...onionSkinSettings.value }
      currentProject.value.updatedAt = Date.now()
    }
  }

  return {
    currentProject,
    currentFrameIndex,
    currentFrame,
    onionSkinSettings,
    getOnionSkinFrames,
    createProject,
    addFrame,
    removeFrame,
    goToFrame,
    nextFrame,
    previousFrame,
    updateOnionSkinSettings
  }
})
