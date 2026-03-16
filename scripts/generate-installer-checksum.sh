#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
TARGET="$ROOT_DIR/install.sh"
OUTPUT_DIR="$ROOT_DIR/checksums"
OUTPUT_FILE="$OUTPUT_DIR/install.sh.sha256"

sha256_file() {
  target="$1"
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$target" | awk '{print $1}'
    return 0
  fi
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$target" | awk '{print $1}'
    return 0
  fi
  if command -v openssl >/dev/null 2>&1; then
    openssl dgst -sha256 "$target" | awk '{print $NF}'
    return 0
  fi
  echo "No checksum tool found (sha256sum/shasum/openssl)."
  exit 1
}

mkdir -p "$OUTPUT_DIR"
SHA="$(sha256_file "$TARGET")"
printf "%s  %s\n" "$SHA" "install.sh" > "$OUTPUT_FILE"

echo "Wrote $OUTPUT_FILE"
echo "Checksum: $SHA"
