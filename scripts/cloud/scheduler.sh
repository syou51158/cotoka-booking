#!/usr/bin/env bash
set -euo pipefail

# Cloud Scheduler – Reservation Reminder job (staging)
# Usage:
#   export PROJECT_ID="your-gcp-project"
#   export REGION="asia-northeast1"
#   export BASE_URL="https://stg.cotoka.jp"
#   export CRON_SECRET="<CRON_SECRET>"
#   export JOB_NAME="booking-stg-reminders"  # optional
#   ./scripts/cloud/scheduler.sh create|update|run|describe|delete

PROJECT_ID=${PROJECT_ID:-}
REGION=${REGION:-asia-northeast1}
BASE_URL=${BASE_URL:-}
CRON_SECRET=${CRON_SECRET:-}
JOB_NAME=${JOB_NAME:-booking-stg-reminders}
SCHEDULE_CRON=${SCHEDULE_CRON:-"0 * * * *"}
TIME_ZONE=${TIME_ZONE:-"Asia/Tokyo"}

function require() {
  local name="$1" value="$2"
  if [[ -z "$value" ]]; then
    echo "[ERROR] $name is required" >&2
    exit 1
  fi
}

function create() {
  require PROJECT_ID "$PROJECT_ID"
  require BASE_URL "$BASE_URL"
  require CRON_SECRET "$CRON_SECRET"
  gcloud scheduler jobs create http "$JOB_NAME" \
    --project "$PROJECT_ID" \
    --location "$REGION" \
    --schedule "$SCHEDULE_CRON" \
    --time-zone "$TIME_ZONE" \
    --uri "$BASE_URL/api/cron/reminders" \
    --http-method GET \
    --headers "x-cron-secret=$CRON_SECRET" \
    --attempt-deadline "300s"
}

function update() {
  require PROJECT_ID "$PROJECT_ID"
  require BASE_URL "$BASE_URL"
  require CRON_SECRET "$CRON_SECRET"
  gcloud scheduler jobs update http "$JOB_NAME" \
    --project "$PROJECT_ID" \
    --location "$REGION" \
    --schedule "$SCHEDULE_CRON" \
    --time-zone "$TIME_ZONE" \
    --uri "$BASE_URL/api/cron/reminders" \
    --http-method GET \
    --headers "x-cron-secret=$CRON_SECRET" \
    --attempt-deadline "300s"
}

function run() {
  require PROJECT_ID "$PROJECT_ID"
  gcloud scheduler jobs run "$JOB_NAME" \
    --project "$PROJECT_ID" \
    --location "$REGION"
}

function describe() {
  require PROJECT_ID "$PROJECT_ID"
  gcloud scheduler jobs describe "$JOB_NAME" \
    --project "$PROJECT_ID" \
    --location "$REGION"
}

function delete_job() {
  require PROJECT_ID "$PROJECT_ID"
  gcloud scheduler jobs delete "$JOB_NAME" \
    --project "$PROJECT_ID" \
    --location "$REGION" \
    --quiet
}

case "${1:-}" in
  create) create;;
  update) update;;
  run) run;;
  describe) describe;;
  delete) delete_job;;
  *)
    echo "Usage: $0 {create|update|run|describe|delete}" >&2
    exit 1
    ;;
 esac