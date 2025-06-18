// ブラウザのコンソールで実行するテスト用コード

// 1. テストデータを設定
console.log('Setting test data...')
localStorage.setItem('stopmotion-bucket-name', 'test-bucket')
localStorage.setItem('stopmotion-project-id', 'test-project')
console.log('Test data set:', {
  bucket: localStorage.getItem('stopmotion-bucket-name'),
  project: localStorage.getItem('stopmotion-project-id'),
})

// 2. 現在のページをリロード
console.log('Reloading page...')
window.location.reload()
