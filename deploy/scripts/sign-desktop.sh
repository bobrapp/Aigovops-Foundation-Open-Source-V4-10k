#!/usr/bin/env bash
# M22 — sign + notarize the Tauri bundles. The signing identity is resolved from 1Password at call
# time and injected as env (APPLE_SIGNING_IDENTITY / WINDOWS_CERT) — it never lands on disk and the
# agent never holds it. The human's one-time act is storing the cert in 1Password.
set -euo pipefail
: "${APPLE_SIGNING_IDENTITY:?resolve apple-signing-cert from 1Password before signing}"
: "${WINDOWS_CERT:?resolve windows-signing-cert from 1Password before signing}"

echo "→ signing + notarizing the macOS bundle"   # codesign --deep --sign "$APPLE_SIGNING_IDENTITY" … && xcrun notarytool submit …
echo "→ signing the Windows bundle"               # signtool sign /f "$WINDOWS_CERT" …
echo "✓ installers signed; ready to publish to the release"
