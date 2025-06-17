# StopMotionCollaborator

モバイルデバイス向けに設計された協働ストップモーションアニメーション制作Webアプリケーション。

[![Deploy to GitHub Pages](https://github.com/bob-takuya/koma-mobile/actions/workflows/deploy.yml/badge.svg)](https://github.com/bob-takuya/koma-mobile/actions/workflows/deploy.yml)

## 🎬 機能

- **モバイルファースト設計**: スマートフォンの横画面に最適化
- **カメラ統合**: フレーム撮影のための直接カメラアクセス
- **クラウドストレージ**: プロジェクト協働のためのAWS S3統合
- **オニオンスキニング**: 前フレームからの視覚的参照
- **WebP最適化**: モバイル向け効率的画像圧縮
- **リアルタイム同期**: 協働編集機能
- **PWA対応**: オフライン対応プログレッシブWebアプリ
- **自動デプロイ**: GitHub Actions による CI/CD

## 📱 デモ・ドキュメント

- **ライブデモ**: https://bob-takuya.github.io/koma-mobile/
- **ユーザーガイド**: [docs/user-guide.md](docs/user-guide.md)
- **開発者ガイド**: [docs/developer-guide.md](docs/developer-guide.md)
- **AWS設定**: [docs/aws-setup.md](docs/aws-setup.md)

## 📋 プロジェクト構造

```
src/
├── components/          # Vueコンポーネント
│   ├── ApiKeySetup.vue     # 初期設定フォーム
│   └── CameraInterface.vue # メインカメラインターフェース
├── services/           # ビジネスロジックサービス
│   ├── camera.ts          # カメラ操作
│   └── s3.ts             # クラウドストレージ（キャッシュ機能付き）
├── stores/             # Pinia状態管理
│   └── project.ts        # プロジェクト状態
├── types/              # TypeScript型定義
├── views/              # ページコンポーネント
├── router/             # Vue Router設定
└── test/               # テスト設定
```

## 📱 デモ・ドキュメント

- **ライブデモ**: https://yourusername.github.io/koma-mobile/
- **ユーザーガイド**: [docs/user-guide.md](docs/user-guide.md)
- **開発者ガイド**: [docs/developer-guide.md](docs/developer-guide.md)
- **AWS設定**: [docs/aws-setup.md](docs/aws-setup.md)oy to GitHub Pages](https://github.com/yourusername/koma-mobile/actions/workflows/deploy.yml/badge.svg)](https://github.com/yourusername/koma-mobile/actions/workflows/deploy.yml)

## 🎬 機能

- **モバイルファースト設計**: スマートフォンの横画面に最適化
- **カメラ統合**: フレーム撮影のための直接カメラアクセス
- **クラウドストレージ**: プロジェクト協働のためのAWS S3統合
- **オニオンスキニング**: 前フレームからの視覚的参照
- **WebP最適化**: モバイル向け効率的画像圧縮
- **リアルタイム同期**: 協働編集機能
- **PWA対応**: オフライン対応プログレッシブWebアプリ
- **自動デプロイ**: GitHub Actions による CI/CD

## 🚀 クイックスタート

### 前提条件

- Node.js 18+
- カメラサポート付きモダンWebブラウザ
- クラウドストレージ用のAWS S3認証情報

### インストール

```sh
npm install
```

### 開発

```sh
npm run dev
```

### テスト

```sh
npm test
npm run test:ui    # インタラクティブテストUI
npm run test:coverage
```

### 本番ビルド

```sh
npm run build
```

## 📱 使用方法

1. **セットアップ**: AWS S3 APIキーとプロジェクトIDを入力
2. **撮影**: カメラインターフェースを使用してフレームを撮影
3. **ナビゲート**: フレームスライダーでシーン間を移動
4. **オニオンスキン**: 参照用の前フレームオーバーレイを切り替え
5. **同期**: 協働のためフレームをクラウドにアップロード

## 🛠 技術スタック

- **フロントエンド**: Vue 3, TypeScript, Vite
- **状態管理**: Pinia
- **テスト**: Vitest, Vue Test Utils
- **ストレージ**: AWS S3
- **カメラ**: MediaDevices API
- **画像フォーマット**: WebP

## 📋 プロジェクト構造

```
src/
├── components/          # Vueコンポーネント
│   ├── ApiKeySetup.vue     # 初期設定フォーム
│   └── CameraInterface.vue # メインカメラインターフェース
├── services/           # ビジネスロジックサービス
│   ├── camera.ts          # カメラ操作
│   └── s3.ts             # クラウドストレージ
├── stores/             # Pinia状態管理
│   └── project.ts        # プロジェクト状態
├── types/              # TypeScript型定義
└── test/               # テスト設定
``

## 🔧 設定

### 環境変数

`.env`ファイルを作成:
```

VITE_S3_REGION=your-region
VITE_S3_BUCKET=your-bucket

````

### AWS S3 セットアップ

#### 1. S3バケットの作成

1. AWS Management Consoleにログイン
2. S3サービスに移動
3. 新しいバケットを作成（例：`stopmotion-collaborator-your-project`）
4. リージョンを選択（推奨：`ap-northeast-1`）

#### 2. CORS設定

バケットの「Permissions」タブで以下のCORS設定を追加：

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": [
      "https://yourusername.github.io",
      "http://localhost:5173",
      "http://127.0.0.1:5173"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
````

#### 3. IAM権限設定

アプリケーション用のIAMユーザーを作成し、以下のポリシーを適用：

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::your-bucket-name/projects/*"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": "arn:aws:s3:::your-bucket-name",
      "Condition": {
        "StringLike": {
          "s3:prefix": "projects/*"
        }
      }
    }
  ]
}
```

#### 4. API Gateway設定（推奨）

セキュリティ向上のため、API Gatewayを経由したアクセスを推奨：

1. API Gatewayでプロキシ統合を設定
2. Lambda関数でS3アクセスを制御
3. 事前署名付きURLの生成

#### 5. プロジェクト構造

S3バケット内の推奨ディレクトリ構造：

```
your-bucket/
├── projects/
│   ├── project-001/
│   │   ├── config.json
│   │   ├── frame_0000.webp
│   │   ├── frame_0001.webp
│   │   └── ...
│   └── project-002/
│       ├── config.json
│       └── ...
```

#### 6. config.json の例

```json
{
  "totalFrames": 24,
  "fps": 12,
  "aspectRatio": 1.777,
  "frames": [
    {
      "frame": 0,
      "taken": false,
      "filename": null,
      "note": "シーン開始"
    },
    {
      "frame": 1,
      "taken": true,
      "filename": "frame_0001.webp",
      "note": "キャラクター登場"
    }
  ]
}
```

## 📄 ライセンス

MIT License - 詳細はLICENSEファイルを参照

## 🤝 貢献

1. リポジトリをフォーク
2. 機能ブランチを作成: `git checkout -b feature/amazing-feature`
3. 変更のテストを作成
4. 変更をコミット: `git commit -m 'Add amazing feature'`
5. ブランチにプッシュ: `git push origin feature/amazing-feature`
6. プルリクエストを開く

## 🚀 デプロイメント

### GitHub Pages への自動デプロイ

1. **リポジトリ設定**

   ```bash
   git add .
   git commit -m "Setup GitHub Pages deployment"
   git push origin main
   ```

2. **GitHub Pages 有効化**

   - リポジトリの Settings > Pages
   - Source を "GitHub Actions" に設定

3. **環境変数設定**
   - Repository Settings > Secrets and variables > Actions
   - 必要な環境変数を追加

### 手動ビルド

```bash
# 本番ビルド
npm run build

# プレビュー
npm run preview
```

### S3同期（オプション）

CloudFrontを使用する場合：

```bash
# AWS CLI設定後
aws s3 sync dist/ s3://your-bucket/app/ --delete
aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"
```

## 🐛 トラブルシューティング

### カメラアクセスの問題

- **HTTPS必須**: カメラ権限にはHTTPS接続が必要
- **権限確認**: ブラウザのカメラ権限を確認
- **API対応**: MediaDevices API サポートを検証
- **デバイス確認**: カメラデバイスが利用可能か確認

### S3接続の問題

- **API認証情報**: アクセスキーとシークレットキーを確認
- **CORS設定**: ブラウザのCORS制約を確認
- **バケット権限**: IAMポリシーの設定を確認
- **リージョン**: S3バケットのリージョン設定を確認

### GitHub Pages デプロイの問題

- **ビルドエラー**: GitHub Actions のログを確認
- **パス問題**: ベースURLの設定を確認
- **権限問題**: GitHub Pages の設定を確認

### パフォーマンスの問題

- **画像サイズ**: WebP圧縮品質を調整（現在0.8）
- **キャッシュ**: ブラウザキャッシュをクリア
- **ネットワーク**: 通信状況を確認

### メンバー間の協働問題

- **フレーム分担**: 事前にフレーム担当を決定
- **上書き競合**: 同じフレームの同時編集を避ける
- **同期頻度**: 定期的な Sync 実行を推奨

```

```
