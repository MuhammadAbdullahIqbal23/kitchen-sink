#!/usr/bin/env bash
# Prints the skill version and fails if CHANGELOG.md has no matching section.
set -euo pipefail
v=$(sed -n 's/^  version: "\(.*\)"$/\1/p' skills/kitchen-sink/SKILL.md)
[ -n "$v" ] || { echo "no version in SKILL.md" >&2; exit 1; }
grep -qx "## $v" CHANGELOG.md || { echo "CHANGELOG.md has no '## $v' section" >&2; exit 1; }
echo "$v"
