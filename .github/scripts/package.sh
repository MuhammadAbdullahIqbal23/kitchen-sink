#!/usr/bin/env bash
# Builds dist/kitchen-sink.skill (the skill folder minus evals) and checks it.
set -euo pipefail
rm -rf dist && mkdir -p dist
(cd skills && zip -qr ../dist/kitchen-sink.skill kitchen-sink -x 'kitchen-sink/evals/*')
list=$(unzip -Z1 dist/kitchen-sink.skill)
grep -qx 'kitchen-sink/SKILL.md' <<<"$list" || { echo "package is missing SKILL.md"; exit 1; }
if grep -q '^kitchen-sink/evals/' <<<"$list"; then echo "package contains evals"; exit 1; fi
echo "packaged $(wc -l <<<"$list") files"
