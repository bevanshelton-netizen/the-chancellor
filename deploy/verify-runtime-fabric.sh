#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${1:-./deploy/runtime-fabric.env}"
[[ -f "$ENV_FILE" ]] || { echo "Missing $ENV_FILE"; exit 2; }

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

PRODUCT="${IZAKHONO_PRODUCT:-the-chancellor}"
RELEASE_ID="${IZAKHONO_RELEASE_ID:-}"
HEALTH_PATH="${IZAKHONO_HEALTH_PATH:-/api/health}"
TIMEOUT="${IZAKHONO_HEALTH_TIMEOUT_SECONDS:-5}"

[[ "$RELEASE_ID" =~ ^[0-9a-f]{40}$ ]] || {
  echo "IZAKHONO_RELEASE_ID must be an approved 40-character commit SHA."
  exit 3
}

healthy=0
matching=0
checked=0

check_target() {
  local name="$1"
  local base="$2"
  [[ -n "$base" ]] || return 0
  checked=$((checked+1))
  local url="${base%/}$HEALTH_PATH"
  printf '%-24s ' "$name"

  local body
  if ! body="$(curl -fsS --max-time "$TIMEOUT" "$url")"; then
    echo "UNHEALTHY $url"
    return 0
  fi

  healthy=$((healthy+1))
  local verdict
  verdict="$(HEALTH_JSON="$body" EXPECTED_PRODUCT="$PRODUCT" EXPECTED_RELEASE="$RELEASE_ID" node -e "
    const x=JSON.parse(process.env.HEALTH_JSON||'{}');
    const p=String(x.product||'');
    const r=String(x.release?.id||'');
    if(p===process.env.EXPECTED_PRODUCT && r===process.env.EXPECTED_RELEASE){
      process.stdout.write('MATCH');
    }else{
      process.stdout.write('MISMATCH product='+p+' release='+r);
    }
  " 2>/dev/null || true)"

  if [[ "$verdict" == "MATCH" ]]; then
    matching=$((matching+1))
    echo "APPROVED_RELEASE $url"
  else
    echo "HEALTHY_WRONG_RELEASE $url [$verdict]"
  fi
}

check_target "${IZAKHONO_TARGET_1_NAME:-OWNED-PRIMARY}" "${IZAKHONO_TARGET_1_URL:-}"
check_target "${IZAKHONO_TARGET_2_NAME:-OWNED-SECONDARY}" "${IZAKHONO_TARGET_2_URL:-}"
check_target "${IZAKHONO_TARGET_3_NAME:-OWNED-TERTIARY}" "${IZAKHONO_TARGET_3_URL:-}"
check_target "${IZAKHONO_TARGET_4_NAME:-OWNED-DR}" "${IZAKHONO_TARGET_4_URL:-}"
check_target "${IZAKHONO_EXTERNAL_NAME:-EXTERNAL-RESILIENCE}" "${IZAKHONO_EXTERNAL_URL:-}"

echo
echo "Healthy targets: $healthy / $checked"
echo "Approved-release targets: $matching / $checked"

[[ "$checked" -gt 0 ]] || { echo "No runtime targets configured."; exit 4; }
[[ "$matching" -gt 0 ]] || { echo "No healthy target is serving the approved Chancellor release."; exit 5; }

echo "The Chancellor Runtime Fabric has at least one approved serving target."
