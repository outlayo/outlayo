#!/usr/bin/env sh
set -eu

REPO_URL="${OUTLAYO_REPO:-https://github.com/outlayo/outlayo.git}"
INSTALL_DIR="${OUTLAYO_HOME:-$HOME/.outlayo}"
BIN_DIR="${OUTLAYO_BIN_DIR:-$HOME/.local/bin}"

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
  echo ""
  return 1
}

if [ -n "${OUTLAYO_INSTALL_SH_SHA256:-}" ]; then
  SCRIPT_PATH="${OUTLAYO_INSTALL_SCRIPT_PATH:-$0}"
  if [ ! -f "$SCRIPT_PATH" ]; then
    echo "Cannot verify installer checksum: script file not found at $SCRIPT_PATH"
    echo "Set OUTLAYO_INSTALL_SCRIPT_PATH to the local installer file path."
    exit 1
  fi

  ACTUAL_SHA="$(sha256_file "$SCRIPT_PATH" || true)"
  if [ -z "$ACTUAL_SHA" ]; then
    echo "No checksum tool found (sha256sum/shasum/openssl)."
    exit 1
  fi

  if [ "$ACTUAL_SHA" != "$OUTLAYO_INSTALL_SH_SHA256" ]; then
    echo "Installer checksum mismatch."
    echo "Expected: $OUTLAYO_INSTALL_SH_SHA256"
    echo "Actual:   $ACTUAL_SHA"
    exit 1
  fi

  echo "Installer checksum verified."
fi

if ! command -v git >/dev/null 2>&1; then
  echo "git is required to install Outlayo CLI"
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "node is required to install Outlayo CLI"
  exit 1
fi

if command -v pnpm >/dev/null 2>&1; then
  PACKAGE_INSTALL_CMD="pnpm install --frozen-lockfile"
elif command -v corepack >/dev/null 2>&1; then
  PACKAGE_INSTALL_CMD="corepack pnpm install --frozen-lockfile"
else
  echo "pnpm (or corepack) is required to install Outlayo CLI"
  exit 1
fi

if [ -d "$INSTALL_DIR/.git" ]; then
  echo "Updating existing Outlayo checkout in $INSTALL_DIR"
  git -C "$INSTALL_DIR" pull --ff-only
else
  echo "Cloning Outlayo into $INSTALL_DIR"
  rm -rf "$INSTALL_DIR"
  git clone --depth=1 "$REPO_URL" "$INSTALL_DIR"
fi

if [ -n "${OUTLAYO_EXPECTED_COMMIT:-}" ]; then
  CURRENT_COMMIT="$(git -C "$INSTALL_DIR" rev-parse HEAD)"
  if [ "$CURRENT_COMMIT" != "$OUTLAYO_EXPECTED_COMMIT" ]; then
    echo "Outlayo commit mismatch."
    echo "Expected: $OUTLAYO_EXPECTED_COMMIT"
    echo "Actual:   $CURRENT_COMMIT"
    exit 1
  fi
  echo "Outlayo commit verified: $CURRENT_COMMIT"
fi

echo "Installing dependencies"
sh -c "cd \"$INSTALL_DIR\" && $PACKAGE_INSTALL_CMD"

mkdir -p "$BIN_DIR"
cat > "$BIN_DIR/outlayo" <<EOF
#!/usr/bin/env sh
set -eu
exec node --import tsx "$INSTALL_DIR/apps/cli/src/index.ts" "\$@"
EOF
chmod +x "$BIN_DIR/outlayo"

echo ""
echo "Outlayo CLI installed: $BIN_DIR/outlayo"
echo ""
echo "If needed, add this to your shell profile:"
echo "  export PATH=\"$BIN_DIR:\$PATH\""
echo ""
echo "Next steps:"
echo "  outlayo --help"
echo "  outlayo init"
echo "  outlayo doctor"
