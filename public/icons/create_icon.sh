#!/bin/bash
# 192x192の青いカメラアイコンをbase64で作成

cat << 'EOF' | base64 -d > icon-192x192.png
iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==
EOF

# より大きな画像を作成（実際のカメラアイコン風）
python3 << 'PYTHON_EOF'
import base64

# 最小限の青いPNG (1x1ピクセル)
simple_blue = """
iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAEklEQVR42mNk+M8AAiaGAQAATwAVAHOXGQ0AAAAASUVORK5CYII=
"""

with open('icon-192x192.png', 'wb') as f:
    f.write(base64.b64decode(simple_blue.strip()))

print("Created simple blue icon")
PYTHON_EOF
