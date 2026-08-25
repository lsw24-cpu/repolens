#!/usr/bin/env bash
set -euo pipefail

VERSION="${1:-1.0.0}"
if [[ ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Version must use semantic version format, for example 1.0.0." >&2
  exit 2
fi
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_DIR="$(cd "$PACKAGE_DIR/../.." && pwd)"
DIST_DIR="$REPO_DIR/dist"
ICON_SOURCE="$PACKAGE_DIR/Packaging/AppIcon-1024.png"
INFO_TEMPLATE="$PACKAGE_DIR/Packaging/Info.plist"
WORK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/repolens-package.XXXXXX")"
APP_DIR="$WORK_DIR/RepoLens.app"
ICONSET_DIR="$WORK_DIR/AppIcon.iconset"
ARCHIVE_PATH="$DIST_DIR/RepoLens-macOS-universal-v${VERSION}.zip"

cleanup() {
  rm -rf "$WORK_DIR"
}
trap cleanup EXIT

cd "$PACKAGE_DIR"
swift build -c release --triple arm64-apple-macosx13.0 --product RepoLensMobile
swift build -c release --triple x86_64-apple-macosx13.0 --product RepoLensMobile

mkdir -p "$APP_DIR/Contents/MacOS" "$APP_DIR/Contents/Resources" "$ICONSET_DIR" "$DIST_DIR"
lipo -create \
  ".build/arm64-apple-macosx/release/RepoLensMobile" \
  ".build/x86_64-apple-macosx/release/RepoLensMobile" \
  -output "$APP_DIR/Contents/MacOS/RepoLensMobile"
chmod 755 "$APP_DIR/Contents/MacOS/RepoLensMobile"

# Preserve RevenueCat's privacy manifest in the standard macOS app resources directory.
cp -R ".build/arm64-apple-macosx/release/RevenueCat_RevenueCat.bundle" \
  "$APP_DIR/Contents/Resources/RevenueCat_RevenueCat.bundle"

cp "$INFO_TEMPLATE" "$APP_DIR/Contents/Info.plist"
plutil -replace CFBundleShortVersionString -string "$VERSION" "$APP_DIR/Contents/Info.plist"
plutil -replace CFBundleVersion -string "${VERSION//./}" "$APP_DIR/Contents/Info.plist"

sips -z 16 16 "$ICON_SOURCE" --out "$ICONSET_DIR/icon_16x16.png" >/dev/null
sips -z 32 32 "$ICON_SOURCE" --out "$ICONSET_DIR/icon_16x16@2x.png" >/dev/null
sips -z 32 32 "$ICON_SOURCE" --out "$ICONSET_DIR/icon_32x32.png" >/dev/null
sips -z 64 64 "$ICON_SOURCE" --out "$ICONSET_DIR/icon_32x32@2x.png" >/dev/null
sips -z 128 128 "$ICON_SOURCE" --out "$ICONSET_DIR/icon_128x128.png" >/dev/null
sips -z 256 256 "$ICON_SOURCE" --out "$ICONSET_DIR/icon_128x128@2x.png" >/dev/null
sips -z 256 256 "$ICON_SOURCE" --out "$ICONSET_DIR/icon_256x256.png" >/dev/null
sips -z 512 512 "$ICON_SOURCE" --out "$ICONSET_DIR/icon_256x256@2x.png" >/dev/null
sips -z 512 512 "$ICON_SOURCE" --out "$ICONSET_DIR/icon_512x512.png" >/dev/null
cp "$ICON_SOURCE" "$ICONSET_DIR/icon_512x512@2x.png"
iconutil -c icns "$ICONSET_DIR" -o "$APP_DIR/Contents/Resources/AppIcon.icns"

# Ad-hoc sign the bundle for integrity verification.
codesign --force --deep --sign - "$APP_DIR"
codesign --verify --deep --strict --verbose=2 "$APP_DIR"

rm -f "$ARCHIVE_PATH"
ditto -c -k --sequesterRsrc --keepParent "$APP_DIR" "$ARCHIVE_PATH"
(
  cd "$DIST_DIR"
  shasum -a 256 "$(basename "$ARCHIVE_PATH")" > "$(basename "$ARCHIVE_PATH").sha256"
)

file "$APP_DIR/Contents/MacOS/RepoLensMobile"
echo "Created $ARCHIVE_PATH"
echo "Created $ARCHIVE_PATH.sha256"
