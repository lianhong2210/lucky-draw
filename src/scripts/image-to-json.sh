#!/bin/bash
# =============================================================================
# image-to-json.sh
#
# Scans a folder of sample image files and generates a JSON file.
#
# The file name (without extension) is used as the display name.
# Example: "John Tan.jpeg" -> { "name": "John Tan", ... }
#
# Pre-requisites: 
#   Redirect to scripts folder before running the script
#   Command: cd src/scripts
#
# Usage:
#   ./image-to-json.sh
#   ./image-to-json.sh --folder ./photos --output result.json --base-path /photos/balls/sample
# =============================================================================

# ── Default Configuration ─────────────────────────────────────────────────────
IMAGE_FOLDER="../../public/photos/balls/sample"
OUTPUT_FILE="../listing/sample.json"
BASE_PATH="/photos/balls/sample"
# ─────────────────────────────────────────────────────────────────────────────

# ── Parse Arguments ───────────────────────────────────────────────────────────
while [ $# -gt 0 ]; do
  case "$1" in
    --folder)     IMAGE_FOLDER="$2";  shift 2 ;;
    --output)     OUTPUT_FILE="$2";   shift 2 ;;
    --base-path)  BASE_PATH="$2";     shift 2 ;;
    --help|-h)
      echo "Usage: $0 [--folder <path>] [--output <file>] [--base-path <path>]"
      echo ""
      echo "  --folder     Folder containing sample images (default: ./images)"
      echo "  --output     Output JSON filename             (default: sample.json)"
      echo "  --base-path  Prefix used for imageUrl field  (default: /photos/balls/sample)"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Run '$0 --help' for usage."
      exit 1
      ;;
  esac
done

# ── Validate folder ───────────────────────────────────────────────────────────
if [ ! -d "$IMAGE_FOLDER" ]; then
  echo "Error: Folder not found: $IMAGE_FOLDER"
  exit 1
fi

# ── Helper: escape special chars for JSON ────────────────────────────────────
json_escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

# ── Process files & build JSON ────────────────────────────────────────────────
echo "Scanning: $IMAGE_FOLDER"
echo ""

TMP_FILE=$(mktemp)

find "$IMAGE_FOLDER" -maxdepth 1 -type f | sort | while IFS= read -r filepath; do
  filename="$(basename "$filepath")"

  # Check if file has an image extension (case-insensitive)
  ext="${filename##*.}"
  ext_lower=$(echo "$ext" | tr '[:upper:]' '[:lower:]')
  case "$ext_lower" in
    jpg|jpeg|png|gif|webp|bmp) ;;
    *) continue ;;
  esac

  # Extract name: filename without extension
  name="${filename%.*}"

  # Skip if name is empty
  if [ -z "$name" ]; then
    echo "  Skipped (could not parse name): $filename"
    continue
  fi

  image_url="${BASE_PATH}/${filename}"

  # Escape values for JSON
  name_escaped=$(json_escape "$name")
  path_escaped=$(json_escape "$image_url")

  # Write entry to temp file
  echo "{\"name\": \"${name_escaped}\", \"imageUrl\": \"${path_escaped}\"}" >> "$TMP_FILE"

  echo "  OK  $name"
done

# ── Write final JSON ──────────────────────────────────────────────────────────
echo "[" > "$OUTPUT_FILE"
total=$(wc -l < "$TMP_FILE" | tr -d ' ')
current=0

while IFS= read -r line; do
  current=$((current + 1))
  if [ "$current" -lt "$total" ]; then
    echo "  $line," >> "$OUTPUT_FILE"
  else
    echo "  $line" >> "$OUTPUT_FILE"
  fi
done < "$TMP_FILE"

echo "]" >> "$OUTPUT_FILE"
rm -f "$TMP_FILE"

# ── Summary ───────────────────────────────────────────────────────────────────
entry_count=$(grep -c '"name"' "$OUTPUT_FILE" 2>/dev/null || echo 0)
echo ""
echo "----------------------------------------"
echo "Done!"
echo "  Processed : $entry_count file(s)"
echo "  Output    : $OUTPUT_FILE"
echo "----------------------------------------"