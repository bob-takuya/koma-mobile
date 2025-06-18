import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useProjectStore } from '@/stores/project'

export function useAspectRatio() {
  const projectStore = useProjectStore()
  const containerRef = ref<HTMLElement | null>(null)
  const aspectRatio = ref(16 / 9) // デフォルトのアスペクト比

  // プロジェクト設定からアスペクト比を取得
  const projectAspectRatio = computed(() => {
    if (projectStore.config?.aspectRatio) {
      return projectStore.config.aspectRatio
    }
    return aspectRatio.value
  })

  // コンテナのサイズに基づいて最適なサイズを計算
  const calculateOptimalSize = () => {
    if (!containerRef.value) return { width: 0, height: 0 }

    const container = containerRef.value
    const containerWidth = container.clientWidth
    const containerHeight = container.clientHeight
    const ratio = projectAspectRatio.value

    let width: number
    let height: number

    // コンテナのアスペクト比とプロジェクトのアスペクト比を比較
    if (containerWidth / containerHeight > ratio) {
      // コンテナの方が横長なので、高さに合わせる
      height = containerHeight
      width = height * ratio
    } else {
      // コンテナの方が縦長なので、幅に合わせる
      width = containerWidth
      height = width / ratio
    }

    return { width, height }
  }

  const optimalSize = ref(calculateOptimalSize())

  const updateSize = () => {
    optimalSize.value = calculateOptimalSize()
  }

  onMounted(() => {
    window.addEventListener('resize', updateSize)
    window.addEventListener('orientationchange', () => {
      setTimeout(updateSize, 100)
    })

    // 初期サイズを計算
    setTimeout(updateSize, 50)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', updateSize)
  })

  return {
    containerRef,
    aspectRatio: projectAspectRatio,
    optimalSize,
    updateSize,
  }
}
