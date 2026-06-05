#!/usr/bin/env bash
set -euo pipefail

OUT_FILE="src/lib/types/database.generated.ts"
TMP_FILE="${OUT_FILE}.tmp"

# Generate to temp file first so consumers never see partial output.
npx --yes supabase@2.101.0 gen types typescript --linked --schema public > "$TMP_FILE"

# Basic integrity checks to avoid publishing truncated/invalid output.
if [[ ! -s "$TMP_FILE" ]]; then
  echo "Type generation failed: output is empty" >&2
  rm -f "$TMP_FILE"
  exit 1
fi

if ! rg -q "^export type Database =" "$TMP_FILE"; then
  echo "Type generation failed: Database export missing" >&2
  rm -f "$TMP_FILE"
  exit 1
fi

mv "$TMP_FILE" "$OUT_FILE"
