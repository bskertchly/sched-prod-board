#!/usr/bin/env bash
# Publish app/ to the gh-pages branch with the current commit stamped in (R6). Run from a clean main.
set -euo pipefail
sha=$(git rev-parse HEAD)
git diff --quiet HEAD || { echo "commit first: the stamped sha must be the build" >&2; exit 1; }
tmp=$(mktemp -d)
cp -r app/. "$tmp"
sed -i "s/__BUILD_SHA__/$sha/g" "$tmp/index.html"
touch "$tmp/.nojekyll"
git -C "$tmp" init -q -b gh-pages
git -C "$tmp" add -A
git -C "$tmp" -c user.name=bskertchly -c user.email=988931+bskertchly@users.noreply.github.com commit -qm "deploy $sha"
git -C "$tmp" push -qf "$(git remote get-url origin)" gh-pages
rm -rf "$tmp"
echo "deployed $sha"
