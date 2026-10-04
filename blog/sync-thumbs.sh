#!/bin/bash
# sync-thumbs.sh
# 사용법: ./sync-thumbs.sh
# krk_Blog/Article/ 폴더의 이미지를 blog/public/images/blog/[slug]-thumb.[ext] 로 복사

SRC=~/Documents/Business/KRK/krk_Blog/Article
DEST=~/Documents/Business/KRK/krk-blog-deploy/blog/public/images/blog

mkdir -p "$DEST"

count=0
for file in "$SRC"/*.png "$SRC"/*.jpg "$SRC"/*.jpeg "$SRC"/*.webp 2>/dev/null; do
  [ -f "$file" ] || continue
  filename=$(basename "$file")
  ext="${filename##*.}"
  slug="${filename%.*}"
  dest_file="$DEST/${slug}-thumb.${ext}"
  if [ -f "$dest_file" ]; then
    echo "⏭️  스킵 (이미 있음): ${slug}-thumb.${ext}"
    continue
  fi
  cp "$file" "$dest_file"
  echo "✅ 신규 복사: ${slug}-thumb.${ext}"
  ((count++))
done

echo "---"
echo "총 ${count}개 복사 완료 → blog/public/images/blog/"
