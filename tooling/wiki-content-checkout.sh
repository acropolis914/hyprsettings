#!/usr/bin/env bash
set -euo pipefail

# -------------------------
# Config
# -------------------------
REPO_URL="https://github.com/hyprwm/hyprland-wiki.git"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOCAL_REPO="$SCRIPT_DIR/.hyprland-wiki"
TARGET_DIR="../src/hyprland-wiki-content"

echo "Updating wiki content..."

# -------------------------
# 1️⃣ Clone or update local repo (full history)
# -------------------------
if [ ! -d "$LOCAL_REPO/.git" ]; then
    echo "Cloning full repo into $LOCAL_REPO..."
    git clone --branch main --tags "$REPO_URL" "$LOCAL_REPO"
else
    echo "Updating local repo in $LOCAL_REPO..."
    git -C "$LOCAL_REPO" fetch --tags origin main
    git -C "$LOCAL_REPO" reset --hard origin/main
fi

# -------------------------
# 2️⃣ Clear target folder
# -------------------------
echo "Clearing target folder $TARGET_DIR..."
mkdir -p "$TARGET_DIR"
find "$TARGET_DIR" -mindepth 1 -exec rm -rf {} +

# -------------------------
# 3️⃣ Copy content folder
# -------------------------
if [ -d "$LOCAL_REPO/content" ]; then
    echo "Copying content folder..."
    cp -r "$LOCAL_REPO/content/." "$TARGET_DIR/"
else
    echo "Warning: content folder not found in local repo"
fi

# -------------------------
# 4️⃣ Copy LICENSE
# -------------------------
if [ -f "$LOCAL_REPO/LICENSE" ]; then
    echo "Copying LICENSE..."
    cp "$LOCAL_REPO/LICENSE" "$TARGET_DIR/"
else
    echo "Warning: LICENSE file not found in local repo"
fi

# -------------------------
# 5️⃣ Create version file using latest commit date
# -------------------------
REPO="hyprwm/hyprland-wiki"

# Get latest commit date from GitHub API
LATEST_DATE=$(curl -s "https://api.github.com/repos/$REPO/commits/main" \
  | grep '"date":' | head -n1 \
  | sed -E 's/.*"([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2}).*/\1.\2.\3_\4\5/')

VERSION="v$LATEST_DATE"

# Get current local fetch time
LAST_FETCHED=$(date +'%Y.%m.%d_%H%M')

# Write .version file
{
    echo "$VERSION"
    echo "last_fetched: $LAST_FETCHED"
} > "$TARGET_DIR/.version"

echo "Updated .version: $VERSION, last fetched $LAST_FETCHED"

# -------------------------
# Done
# -------------------------
echo "Done! Content folder and LICENSE are up to date."
echo "Local repo kept in $LOCAL_REPO for fast updates on reruns."
