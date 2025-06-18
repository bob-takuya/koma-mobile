#!/usr/bin/env node

/**
 * koma-mobile-test-20250618-013942に30枚の写真のテストプロジェクトを設定するスクリプト
 *
 * 使い方:
 * node setup-test-project.js [API_KEY]
 *
 * このスクリプトは以下を行います:
 * 1. 30フレームのプロジェクト設定ファイル（config.json）を生成
 * 2. ランダムに15フレームを「撮影済み」に設定
 * 3. モックAPIサーバー経由でS3バケットにアップロード
 */

const BUCKET_NAME = 'koma-mobile-test-20250618-013942'
const PROJECT_ID = 'test-project-30frames'
const TOTAL_FRAMES = 30
const TAKEN_FRAMES_COUNT = 15 // 30フレーム中15フレームを撮影済みに設定
const API_BASE_URL = 'http://localhost:3001/api'

/**
 * プロジェクト設定を生成
 */
function generateProjectConfig() {
  // フレーム配列を生成
  const frames = []

  // 撮影済みフレームをランダムに選択
  const takenFrameNumbers = new Set()
  while (takenFrameNumbers.size < TAKEN_FRAMES_COUNT) {
    const randomFrame = Math.floor(Math.random() * TOTAL_FRAMES)
    takenFrameNumbers.add(randomFrame)
  }

  // フレーム情報を生成
  for (let i = 0; i < TOTAL_FRAMES; i++) {
    const isTaken = takenFrameNumbers.has(i)
    frames.push({
      frame: i,
      taken: isTaken,
      filename: isTaken ? `frame_${i.toString().padStart(4, '0')}.webp` : null,
      note:
        i === 0
          ? 'スタートフレーム'
          : i === TOTAL_FRAMES - 1
            ? 'エンドフレーム'
            : isTaken
              ? `フレーム ${i + 1}`
              : null,
    })
  }

  return {
    totalFrames: TOTAL_FRAMES,
    fps: 12, // 12 FPS (ストップモーションの標準的なフレームレート)
    aspectRatio: 16 / 9, // 16:9 アスペクト比
    frames: frames,
    projectName: 'テストプロジェクト - 30フレーム',
    created: new Date().toISOString(),
    description: '30フレームのテストプロジェクト。15フレームが撮影済みとして設定されています。',
  }
}

/**
 * カラフルなSVG画像を生成
 */
function generateDummySVG(frameNumber) {
  const hue = (frameNumber * 12) % 360
  const hue2 = (hue + 60) % 360

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1920" height="1080" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad${frameNumber}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:hsl(${hue}, 70%, 50%);stop-opacity:1" />
      <stop offset="100%" style="stop-color:hsl(${hue2}, 70%, 30%);stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="1920" height="1080" fill="url(#grad${frameNumber})" />
  
  <!-- Border -->
  <rect x="20" y="20" width="1880" height="1040" fill="none" stroke="white" stroke-width="10" />
  
  <!-- Frame number -->
  <text x="960" y="540" font-family="Arial, sans-serif" font-size="120" font-weight="bold" 
        text-anchor="middle" dominant-baseline="central" fill="white">
    Frame ${frameNumber + 1}
  </text>
  
  <!-- Timestamp -->
  <text x="960" y="680" font-family="Arial, sans-serif" font-size="48" 
        text-anchor="middle" dominant-baseline="central" fill="white">
    ${new Date().toLocaleString('ja-JP')}
  </text>
  
  <!-- Decorative circles -->
  <circle cx="200" cy="200" r="50" fill="rgba(255,255,255,0.3)" />
  <circle cx="1720" cy="200" r="50" fill="rgba(255,255,255,0.3)" />
  <circle cx="200" cy="880" r="50" fill="rgba(255,255,255,0.3)" />
  <circle cx="1720" cy="880" r="50" fill="rgba(255,255,255,0.3)" />
</svg>`
}

/**
 * プロジェクト設定をモックAPIサーバー経由でアップロード
 */
async function uploadConfig(config, apiKey) {
  const url = `${API_BASE_URL}/projects/${PROJECT_ID}/config.json`

  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config, null, 2),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`)
    }

    console.log(`✅ プロジェクト設定をアップロードしました: ${PROJECT_ID}/config.json`)
  } catch (error) {
    console.error('❌ プロジェクト設定のアップロードに失敗:', error.message)
    throw error
  }
}

/**
 * ダミー画像をモックAPIサーバー経由でアップロード
 */
async function uploadFrameImages(config, apiKey) {
  console.log(`📸 ${TAKEN_FRAMES_COUNT}枚のダミー画像をアップロード中...`)

  let uploadedCount = 0

  for (const frame of config.frames) {
    if (frame.taken && frame.filename) {
      try {
        // SVGを生成してBlobに変換
        const svgString = generateDummySVG(frame.frame)
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml' })

        // ファイル名からフレームIDを取得 (frame_0001.webp -> frame_0001)
        const frameId = frame.filename.replace('.webp', '')
        const url = `${API_BASE_URL}/projects/${PROJECT_ID}/frames/${frameId}`

        const response = await fetch(url, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'image/svg+xml',
          },
          body: svgBlob,
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`)
        }

        uploadedCount++
        console.log(
          `  ✅ Frame ${frame.frame + 1}/${TOTAL_FRAMES} uploaded (${uploadedCount}/${TAKEN_FRAMES_COUNT})`,
        )
      } catch (error) {
        console.error(`  ❌ Frame ${frame.frame + 1} のアップロードに失敗:`, error.message)
      }
    }
  }

  console.log(`📸 ${uploadedCount}枚の画像をアップロードしました`)
}

/**
 * プロジェクトサマリーを表示
 */
function showProjectSummary(config) {
  console.log('\n📋 プロジェクトサマリー:')
  console.log('─'.repeat(50))
  console.log(`プロジェクトID: ${PROJECT_ID}`)
  console.log(`S3バケット: ${BUCKET_NAME}`)
  console.log(`総フレーム数: ${config.totalFrames}`)
  console.log(`撮影済みフレーム: ${config.frames.filter((f) => f.taken).length}`)
  console.log(`FPS: ${config.fps}`)
  console.log(`アスペクト比: ${config.aspectRatio}`)
  console.log(`作成日時: ${config.created}`)

  console.log('\n📍 撮影済みフレーム一覧:')
  const takenFrames = config.frames.filter((f) => f.taken).map((f) => f.frame + 1)
  console.log(`  ${takenFrames.join(', ')}`)

  console.log('\n🔗 アクセス方法:')
  console.log('1. アプリ (https://bob-takuya.github.io/koma-mobile/) にアクセス')
  console.log('2. API Key を入力')
  console.log(`3. Project ID に "${PROJECT_ID}" を入力`)
  console.log('4. "START" をクリック')

  console.log('\n💡 ローカルテスト用:')
  console.log('1. npm run dev:full でモックAPIサーバーを起動')
  console.log('2. http://localhost:5173 にアクセス')
  console.log('3. API Key に "test-key" を入力')
  console.log(`4. Project ID に "${PROJECT_ID}" を入力`)
}

/**
 * API接続をテスト
 */
async function testApiConnection() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    const data = await response.json()
    console.log('✅ モックAPIサーバーに接続成功:', data.bucket)
    return true
  } catch (error) {
    console.error('❌ モックAPIサーバーへの接続に失敗:', error.message)
    console.error('💡 "npm run dev:api" または "npm run dev:full" でAPIサーバーを起動してください')
    return false
  }
}

/**
 * メイン処理
 */
async function main() {
  const apiKey = process.argv[2] || 'test-api-key'

  console.log('🚀 30フレームテストプロジェクトの作成を開始します...')
  console.log(`📁 バケット: ${BUCKET_NAME}`)
  console.log(`🎬 プロジェクトID: ${PROJECT_ID}`)
  console.log(`🔑 API Key: ${apiKey}`)
  console.log('')

  try {
    // 0. API接続をテスト
    console.log('🔌 モックAPIサーバーに接続中...')
    const isConnected = await testApiConnection()
    if (!isConnected) {
      process.exit(1)
    }

    // 1. プロジェクト設定を生成
    console.log('⚙️  プロジェクト設定を生成中...')
    const config = generateProjectConfig()

    // 2. プロジェクト設定をアップロード
    console.log('📤 プロジェクト設定をS3にアップロード中...')
    await uploadConfig(config, apiKey)

    // 3. ダミー画像を生成・アップロード
    console.log('🖼️  ダミー画像を生成・アップロード中...')
    await uploadFrameImages(config, apiKey)

    // 4. 完了メッセージとサマリー
    console.log('\n🎉 テストプロジェクトの作成が完了しました!')
    showProjectSummary(config)
  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error.message)
    console.error('詳細:', error)
    process.exit(1)
  }
}

// Import fetch for Node.js
async function importFetch() {
  if (typeof fetch === 'undefined') {
    const { default: fetch, Blob } = await import('node-fetch')
    global.fetch = fetch
    global.Blob = Blob
  }
}

// スクリプト実行
importFetch().then(() => main())
