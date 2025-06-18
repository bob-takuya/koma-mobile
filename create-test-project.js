#!/usr/bin/env node

/**
 * koma-mobile-test-20250618-013942に30枚の写真のテストプロジェクトを設定するスクリプト
 *
 * 使い方:
 * node create-test-project.js
 *
 * このスクリプトは以下を行います:
 * 1. 30フレームのプロジェクト設定ファイル（config.json）を生成
 * 2. ランダムに15フレームを「撮影済み」に設定
 * 3. S3バケットにアップロード（AWS認証が必要）
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { createCanvas } from 'canvas'

const BUCKET_NAME = 'koma-mobile-test-20250618-013942'
const PROJECT_ID = 'test-project-30frames'
const TOTAL_FRAMES = 30
const TAKEN_FRAMES_COUNT = 15 // 30フレーム中15フレームを撮影済みに設定

// S3クライアント設定
const s3Client = new S3Client({
  region: 'ap-northeast-1',
})

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
 * ダミー画像を生成（WebPフォーマット）
 */
function generateDummyImage(frameNumber) {
  const canvas = createCanvas(1920, 1080) // 1080p解像度
  const ctx = canvas.getContext('2d')

  // グラデーション背景
  const gradient = ctx.createLinearGradient(0, 0, 1920, 1080)
  gradient.addColorStop(0, `hsl(${frameNumber * 12}, 70%, 50%)`)
  gradient.addColorStop(1, `hsl(${(frameNumber * 12 + 60) % 360}, 70%, 30%)`)

  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 1920, 1080)

  // フレーム番号を描画
  ctx.fillStyle = 'white'
  ctx.font = 'bold 120px Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(`Frame ${frameNumber + 1}`, 960, 540)

  // タイムスタンプ
  ctx.font = '48px Arial'
  ctx.fillText(new Date().toLocaleString('ja-JP'), 960, 680)

  // ボーダー
  ctx.strokeStyle = 'white'
  ctx.lineWidth = 10
  ctx.strokeRect(20, 20, 1880, 1040)

  return canvas.toBuffer('image/webp', { quality: 0.8 })
}

/**
 * S3にプロジェクト設定をアップロード
 */
async function uploadConfig(config) {
  const configKey = `projects/${PROJECT_ID}/config.json`

  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: configKey,
      Body: JSON.stringify(config, null, 2),
      ContentType: 'application/json',
      Metadata: {
        'project-type': 'test',
        'total-frames': TOTAL_FRAMES.toString(),
        created: new Date().toISOString(),
      },
    })

    await s3Client.send(command)
    console.log(`✅ プロジェクト設定をアップロードしました: s3://${BUCKET_NAME}/${configKey}`)
  } catch (error) {
    console.error('❌ プロジェクト設定のアップロードに失敗:', error.message)
    throw error
  }
}

/**
 * S3にダミー画像をアップロード
 */
async function uploadFrameImages(config) {
  console.log(`📸 ${TAKEN_FRAMES_COUNT}枚のダミー画像をアップロード中...`)

  let uploadedCount = 0

  for (const frame of config.frames) {
    if (frame.taken && frame.filename) {
      try {
        const imageBuffer = generateDummyImage(frame.frame)
        const imageKey = `projects/${PROJECT_ID}/${frame.filename}`

        const command = new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: imageKey,
          Body: imageBuffer,
          ContentType: 'image/webp',
          Metadata: {
            'frame-number': frame.frame.toString(),
            'project-id': PROJECT_ID,
            created: new Date().toISOString(),
          },
        })

        await s3Client.send(command)
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
}

/**
 * メイン処理
 */
async function main() {
  console.log('🚀 30フレームテストプロジェクトの作成を開始します...')
  console.log(`📁 バケット: ${BUCKET_NAME}`)
  console.log(`🎬 プロジェクトID: ${PROJECT_ID}`)
  console.log('')

  try {
    // 1. プロジェクト設定を生成
    console.log('⚙️  プロジェクト設定を生成中...')
    const config = generateProjectConfig()

    // 2. S3にプロジェクト設定をアップロード
    console.log('📤 プロジェクト設定をS3にアップロード中...')
    await uploadConfig(config)

    // 3. ダミー画像を生成・アップロード
    console.log('🖼️  ダミー画像を生成・アップロード中...')
    await uploadFrameImages(config)

    // 4. 完了メッセージとサマリー
    console.log('\n🎉 テストプロジェクトの作成が完了しました!')
    showProjectSummary(config)
  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error.message)
    console.error('詳細:', error)
    process.exit(1)
  }
}

// スクリプト実行
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
