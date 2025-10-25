#!/usr/bin/env bash
set -euo pipefail

# Cloud Monitoring – Uptime Checks + Log-based Alerts (staging)
# Usage examples:
#   export PROJECT_ID="your-gcp-project"
#   export BASE_HOST="stg.cotoka.jp"
#   export CHANNEL_EMAIL="info@cotoka.jp"
#   export ERROR_THRESHOLD=5
#   ./scripts/cloud/monitoring.sh create-uptime
#   ./scripts/cloud/monitoring.sh list-uptime
#   ./scripts/cloud/monitoring.sh create-alerts
#   ./scripts/cloud/monitoring.sh describe-alerts
#   ./scripts/cloud/monitoring.sh delete-uptime
#   ./scripts/cloud/monitoring.sh delete-alerts

PROJECT_ID=${PROJECT_ID:-}
BASE_HOST=${BASE_HOST:-stg.cotoka.jp}
CHANNEL_EMAIL=${CHANNEL_EMAIL:-}
ERROR_THRESHOLD=${ERROR_THRESHOLD:-5}
REGION=${REGION:-ASIA_PACIFIC}

UPTIME_1_NAME=${UPTIME_1_NAME:-"stg-api-services"}
UPTIME_1_PATH=${UPTIME_1_PATH:-"/api/services"}
UPTIME_2_NAME=${UPTIME_2_NAME:-"stg-ja-booking"}
UPTIME_2_PATH=${UPTIME_2_PATH:-"/ja/booking"}
CHECK_INTERVAL=${CHECK_INTERVAL:-"60s"}
TIMEOUT=${TIMEOUT:-"10s"}

LOG_METRIC_NAME=${LOG_METRIC_NAME:-"errors_count"}
ALERT_POLICY_NAME=${ALERT_POLICY_NAME:-"stg: errors >= ${ERROR_THRESHOLD} in 5m"}
CHANNEL_DISPLAY=${CHANNEL_DISPLAY:-"Staging Alerts"}

function require() {
  local name="$1" value="$2"
  if [[ -z "$value" ]]; then
    echo "[ERROR] $name is required" >&2
    exit 1
  fi
}

function create_uptime() {
  require PROJECT_ID "$PROJECT_ID"
  echo "Creating uptime checks on $BASE_HOST ..."
  gcloud monitoring uptime-checks create "$UPTIME_1_NAME" \
    --project "$PROJECT_ID" \
    --display-name "$UPTIME_1_NAME" \
    --http-check \
    --host "$BASE_HOST" \
    --path "$UPTIME_1_PATH" \
    --port 443 \
    --use-ssl \
    --check-interval "$CHECK_INTERVAL" \
    --timeout "$TIMEOUT" \
    --selected-regions "$REGION" || true

  gcloud monitoring uptime-checks create "$UPTIME_2_NAME" \
    --project "$PROJECT_ID" \
    --display-name "$UPTIME_2_NAME" \
    --http-check \
    --host "$BASE_HOST" \
    --path "$UPTIME_2_PATH" \
    --port 443 \
    --use-ssl \
    --check-interval "$CHECK_INTERVAL" \
    --timeout "$TIMEOUT" \
    --selected-regions "$REGION" || true
}

function list_uptime() {
  require PROJECT_ID "$PROJECT_ID"
  gcloud monitoring uptime-checks list --project "$PROJECT_ID"
}

function delete_uptime() {
  require PROJECT_ID "$PROJECT_ID"
  gcloud monitoring uptime-checks delete "$UPTIME_1_NAME" --project "$PROJECT_ID" --quiet || true
  gcloud monitoring uptime-checks delete "$UPTIME_2_NAME" --project "$PROJECT_ID" --quiet || true
}

function create_alerts() {
  require PROJECT_ID "$PROJECT_ID"
  require CHANNEL_EMAIL "$CHANNEL_EMAIL"

  echo "Creating logs-based metric: $LOG_METRIC_NAME ..."
  gcloud logging metrics create "$LOG_METRIC_NAME" \
    --project "$PROJECT_ID" \
    --description "Count of log entries with severity>=ERROR" \
    --log-filter "severity>=ERROR" || true

  echo "Creating notification channel: $CHANNEL_EMAIL ..."
  CHANNEL_ID=$(gcloud monitoring channels create \
    --project "$PROJECT_ID" \
    --type email \
    --display-name "$CHANNEL_DISPLAY" \
    --channel-labels email_address="$CHANNEL_EMAIL" \
    --format="value(name)")

  echo "Creating alert policy ..."
  cat > /tmp/alert_policy.json <<EOF
{
  "displayName": "${ALERT_POLICY_NAME}",
  "combiner": "OR",
  "conditions": [
    {
      "displayName": "errors-count-threshold",
      "conditionThreshold": {
        "filter": "metric.type=\"logging.googleapis.com/user/${LOG_METRIC_NAME}\" resource.type=\"global\"",
        "aggregations": [
          { "alignmentPeriod": "300s", "perSeriesAligner": "ALIGN_SUM" }
        ],
        "comparison": "COMPARISON_GT",
        "thresholdValue": ${ERROR_THRESHOLD},
        "duration": "300s",
        "trigger": { "count": 1 }
      }
    }
  ],
  "notificationChannels": [
    "projects/${PROJECT_ID}/notificationChannels/${CHANNEL_ID}"
  ]
}
EOF

  gcloud monitoring policies create \
    --project "$PROJECT_ID" \
    --policy-from-file /tmp/alert_policy.json
}

function describe_alerts() {
  require PROJECT_ID "$PROJECT_ID"
  gcloud monitoring policies list --project "$PROJECT_ID"
  gcloud logging metrics list --project "$PROJECT_ID"
  gcloud monitoring channels list --project "$PROJECT_ID"
}

function delete_alerts() {
  require PROJECT_ID "$PROJECT_ID"
  gcloud monitoring policies list --project "$PROJECT_ID" --format="value(name)" | while read -r p; do
    gcloud monitoring policies delete "$p" --project "$PROJECT_ID" --quiet || true
  done
  gcloud monitoring channels list --project "$PROJECT_ID" --format="value(name)" | while read -r c; do
    gcloud monitoring channels delete "$c" --project "$PROJECT_ID" --quiet || true
  done
  gcloud logging metrics delete "$LOG_METRIC_NAME" --project "$PROJECT_ID" --quiet || true
}

case "${1:-}" in
  create-uptime) create_uptime;;
  list-uptime) list_uptime;;
  delete-uptime) delete_uptime;;
  create-alerts) create_alerts;;
  describe-alerts) describe_alerts;;
  delete-alerts) delete_alerts;;
  *)
    echo "Usage: $0 {create-uptime|list-uptime|delete-uptime|create-alerts|describe-alerts|delete-alerts}" >&2
    exit 1
    ;;
 esac