#!/usr/bin/env bash
# Source this before `mvn spring-boot:run` for local development:
#   source scripts/dev-env.sh
# Reads the credentials minted by scripts/oauth_exchange.py and the service
# account key from secrets/ (gitignored, never committed).

set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

export GOOGLE_SERVICE_ACCOUNT_JSON="$(cat secrets/service-account.json)"
export SPREADSHEET_ID="17rHhCzE3bieXTPWBnwuP2n6YOZnxrkR3umj_kTLlo5A"
export DRIVE_FOLDER_ID="$(python3 -c "import json; print(json.load(open('secrets/drive-folder.json'))['id'])")"
export GOOGLE_OAUTH_CLIENT_ID="$(python3 -c "import json; print(json.load(open('secrets/oauth-client.json'))['client_id'])")"
export GOOGLE_OAUTH_CLIENT_SECRET="$(python3 -c "import json; print(json.load(open('secrets/oauth-client.json'))['client_secret'])")"
export GOOGLE_OAUTH_REFRESH_TOKEN="$(python3 -c "import json; print(json.load(open('secrets/oauth-tokens.json'))['refresh_token'])")"
export APP_PASSWORD="${APP_PASSWORD:-dev-password}"

echo "Env vars de Google cargadas. APP_PASSWORD=$APP_PASSWORD"
