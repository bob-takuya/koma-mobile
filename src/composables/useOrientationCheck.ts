import { ref, onMounted, onUnmounted } from 'vue'

export function useOrientationCheck() {
  const isPortrait = ref(false)
  const showOrientationWarning = ref(false)

  const checkOrientation = () => {
    const width = window.innerWidth
    const height = window.innerHeight
    
    // 縦向きかどうかを判定
    isPortrait.value = height > width
    
    // モバイルデバイスで縦向きの場合、警告を表示
    if (isPortrait.value && (width < 768 || height < 480)) {
      showOrientationWarning.value = true
    } else {
      showOrientationWarning.value = false
    }
  }

  const handleOrientationChange = () => {
    // orientationchangeイベントの後、少し遅延を持って実行
    setTimeout(checkOrientation, 100)
  }

  const dismissWarning = () => {
    showOrientationWarning.value = false
  }

  onMounted(() => {
    checkOrientation()
    window.addEventListener('resize', checkOrientation)
    window.addEventListener('orientationchange', handleOrientationChange)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', checkOrientation)
    window.removeEventListener('orientationchange', handleOrientationChange)
  })

  return {
    isPortrait,
    showOrientationWarning,
    dismissWarning
  }
}
