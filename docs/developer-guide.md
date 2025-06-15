# 開発者向けセットアップガイド

## 🛠️ 開発環境のセットアップ

### 前提条件

- Node.js 18.0.0 以上
- npm 或いは yarn
- Git
- VS Code（推奨）

### 1. リポジトリのクローン

```bash
git clone https://github.com/bob-takuya/koma-mobile.git
cd koma-mobile
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. 環境変数の設定

```bash
# .env ファイルを作成
cp .env.example .env

# 必要な値を設定
vim .env
```

### 4. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで http://localhost:5173 にアクセス

## 🏗️ プロジェクト構造

```
src/
├── components/          # Vue コンポーネント
│   ├── ApiKeySetup.vue     # API キー設定
│   └── CameraInterface.vue # メインカメラ UI
├── services/           # ビジネスロジック
│   ├── camera.ts          # カメラ制御
│   └── s3.ts             # AWS S3 連携
├── stores/             # 状態管理 (Pinia)
│   └── project.ts        # プロジェクト状態
├── types/              # TypeScript 型定義
├── views/              # ページコンポーネント
└── router/             # Vue Router 設定
```

## 🧪 テスト

### 単体テスト

```bash
# テスト実行
npm run test

# テスト (watch モード)
npm run test:watch

# カバレッジ付きテスト
npm run test:coverage

# テスト UI
npm run test:ui
```

### E2E テスト

```bash
# Playwright のインストール
npx playwright install

# E2E テスト実行
npm run test:e2e
```

## 📱 モバイルデバッグ

### Chrome DevTools

1. Chrome で開発者ツールを開く
2. Device モードに切り替え
3. 横画面（Landscape）でテスト

### 実機デバッグ

1. 開発サーバーを起動
2. 同一ネットワーク上の実機からアクセス
   ```
   http://[PC-IP-ADDRESS]:5173
   ```

## 🏢 本番ビルド

### ローカルでのビルド確認

```bash
# 本番ビルド
npm run build

# プレビュー
npm run preview
```

### GitHub Pages デプロイ

```bash
# GitHub Pages 用ビルド
npm run build:github-pages

# GitHub にプッシュ（自動デプロイ）
git push origin main
```

## 🔧 設定ファイル

### Vite 設定 (`vite.config.ts`)

- PWA プラグイン設定
- ビルド設定
- プロキシ設定（開発時）

### TypeScript 設定

- `tsconfig.json`: メイン設定
- `tsconfig.app.json`: アプリケーション用
- `tsconfig.node.json`: Node.js 用

### ESLint/Prettier

```bash
# コードフォーマット
npm run format

# リント実行
npm run lint
```

## 🧩 主要な技術スタック

### フロントエンド

- **Vue 3**: Composition API
- **TypeScript**: 型安全性
- **Vite**: 高速ビルドツール
- **Pinia**: 状態管理

### UI/UX

- **CSS**: レスポンシブデザイン
- **PWA**: Service Worker
- **Camera API**: MediaDevices

### クラウド連携

- **AWS S3**: ファイルストレージ
- **API Gateway**: API プロキシ
- **Lambda**: サーバーレス実行

## 🐛 デバッグのヒント

### カメラ関連

```javascript
// カメラストリームの確認
navigator.mediaDevices.enumerateDevices().then((devices) => {
  console.log('Available devices:', devices)
})
```

### S3 連携

```javascript
// ネットワークタブでリクエストを確認
// CORS エラーの場合、S3 バケット設定を確認
```

### ステート管理

```javascript
// Vue DevTools でストア状態を確認
// Pinia DevTools プラグイン推奨
```

## 📦 新機能の追加手順

1. **機能設計**

   - ユーザーストーリーの作成
   - 技術仕様の検討

2. **実装**

   ```bash
   git checkout -b feature/new-feature
   # 実装作業
   ```

3. **テスト**

   ```bash
   npm run test
   npm run test:e2e
   ```

4. **プルリクエスト**
   - レビュー依頼
   - CI/CD チェック

## 🔒 セキュリティ考慮事項

### API キー管理

- 環境変数での管理
- .gitignore での除外
- ローテーション計画

### CORS 設定

```json
{
  "AllowedOrigins": ["https://bob-takuya.github.io"],
  "AllowedMethods": ["GET", "PUT", "POST"],
  "AllowedHeaders": ["*"]
}
```

### Content Security Policy

- 必要に応じて CSP ヘッダーを設定
- インライン JavaScript の制限

## 📈 パフォーマンス最適化

### 画像圧縮

- WebP 品質の調整（現在: 0.8）
- ファイルサイズの監視

### キャッシュ戦略

- Service Worker でのキャッシュ
- S3 の Cache-Control ヘッダー

### バンドル最適化

- Tree shaking の活用
- 動的インポートでのコード分割

## 🚀 デプロイメント

### 自動デプロイ (GitHub Actions)

- `.github/workflows/deploy.yml`
- main ブランチへのプッシュで自動実行

### 手動デプロイ

```bash
# AWS CLI でのデプロイ（オプション）
aws s3 sync dist/ s3://your-bucket/ --delete
aws cloudfront create-invalidation --distribution-id YOUR_ID --paths "/*"
```

## 📚 関連リソース

- [Vue.js ドキュメント](https://vuejs.org/)
- [Vite ガイド](https://vitejs.dev/)
- [AWS S3 開発者ガイド](https://docs.aws.amazon.com/s3/)
- [PWA チェックリスト](https://web.dev/pwa-checklist/)
