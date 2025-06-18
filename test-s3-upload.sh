#!/bin/bash

# S3 HTTP PUT テストスクリプト
BUCKET_NAME="koma-mobile-test-20250618-013942"
PROJECT_ID="current-project"
FRAME_NUMBER="0000"
KEY="projects/${PROJECT_ID}/frame_${FRAME_NUMBER}.webp"
URL="https://${BUCKET_NAME}.s3.ap-northeast-1.amazonaws.com/${KEY}"

echo "🔍 Testing S3 HTTP PUT upload..."
echo "Bucket: ${BUCKET_NAME}"
echo "Key: ${KEY}"
echo "URL: ${URL}"

# Create a test image file
echo "📝 Creating test image..."
cat << 'EOF' | base64 -d > test_image.webp
UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAAQAAAQAAAP4AAAA=
EOF

# Test upload with curl
echo "📤 Testing HTTP PUT upload..."
HTTP_STATUS=$(curl -w "%{http_code}" -o /dev/null -s \
  -X PUT \
  -H "Content-Type: image/webp" \
  --data-binary @test_image.webp \
  "${URL}")

echo "HTTP Status: ${HTTP_STATUS}"

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ Upload appeared successful (HTTP 200)"
  
  # Test if file actually exists
  echo "🔍 Checking if file exists..."
  HEAD_STATUS=$(curl -w "%{http_code}" -o /dev/null -s -I "${URL}")
  echo "HEAD Status: ${HEAD_STATUS}"
  
  if [ "$HEAD_STATUS" = "200" ]; then
    echo "✅ File confirmed to exist in S3!"
  else
    echo "❌ File does not exist in S3 (HEAD ${HEAD_STATUS})"
  fi
else
  echo "❌ Upload failed with HTTP ${HTTP_STATUS}"
fi

# Cleanup
rm -f test_image.webp

echo "🔚 Test completed"
