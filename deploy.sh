#!/usr/bin/env bash
# Production deployment script for how.nz
# - Generates the Hexo site
# - Deploys to Heroku via hexo-deployer-heroku
# - Optionally clears Cloudflare cache (if credentials are set)

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

cd "$ROOT_DIR"

echo "how.nz deployment starting..."
echo "================================="

echo -e "\n${YELLOW}Step 1: Cleaning + generating site...${NC}"
if [ ! -d node_modules ]; then
  echo -e "${YELLOW}node_modules not found; installing dependencies...${NC}"
  npm install
fi
npm run clean
npm run build

echo -e "\n${YELLOW}Step 2: Deploying to Heroku...${NC}"
npm run deploy

echo -e "\n${YELLOW}Step 3: Clearing Cloudflare cache (optional)...${NC}"
ZONE_ID="${CLOUDFLARE_ZONE_HOW_NZ:-${CLOUDFLARE_ZONE_HOWNZ:-${CLOUDFLARE_ZONE_HOW:-${CLOUDFLARE_ZONE_ID:-}}}}"

if [[ -z "$ZONE_ID" ]]; then
  echo -e "${YELLOW}Skipping cache clear: set CLOUDFLARE_ZONE_HOW_NZ (or CLOUDFLARE_ZONE_HOWNZ / CLOUDFLARE_ZONE_HOW / CLOUDFLARE_ZONE_ID).${NC}"
else
  if [[ -n "${CLOUDFLARE_API_TOKEN:-}" ]]; then
    CF_AUTH_HEADERS=("-H" "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}")
  elif [[ -n "${CLOUDFLARE_API_KEY:-}" && -n "${CLOUDFLARE_EMAIL:-}" ]]; then
    CF_AUTH_HEADERS=("-H" "X-Auth-Email: ${CLOUDFLARE_EMAIL}" "-H" "X-Auth-Key: ${CLOUDFLARE_API_KEY}")
  else
    echo -e "${YELLOW}Skipping cache clear: set CLOUDFLARE_API_TOKEN or CLOUDFLARE_API_KEY + CLOUDFLARE_EMAIL.${NC}"
    CF_AUTH_HEADERS=()
  fi

  if [[ ${#CF_AUTH_HEADERS[@]} -gt 0 ]]; then
    RESPONSE=$(curl -s -X POST "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/purge_cache" \
      "${CF_AUTH_HEADERS[@]}" \
      -H "Content-Type: application/json" \
      --data '{"purge_everything":true}')

    if command -v jq >/dev/null 2>&1; then
      SUCCESS=$(echo "$RESPONSE" | jq -r '.success // false')
      if [[ "$SUCCESS" == "true" ]]; then
        echo -e "${GREEN}Cloudflare cache cleared.${NC}"
      else
        echo -e "${YELLOW}Cloudflare cache purge response:${NC}"
        echo "$RESPONSE" | jq -r '.'
      fi
    else
      echo -e "${BLUE}Cloudflare purge response:${NC}"
      echo "$RESPONSE"
    fi
  fi
fi

echo -e "\n${GREEN}Deployment complete!${NC}"
