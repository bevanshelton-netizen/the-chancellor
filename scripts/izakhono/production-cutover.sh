#!/usr/bin/env sh
set -eu

: "${CHANCELLOR_ENV_FILE:?CHANCELLOR_ENV_FILE must point to the owner-hosted production env file}"
: "${IZAKHONO_PUBLIC_APP_URL:?IZAKHONO_PUBLIC_APP_URL is required}"

[ -f "$CHANCELLOR_ENV_FILE" ] || { echo "Production env file not found: $CHANCELLOR_ENV_FILE" >&2; exit 1; }
case "$IZAKHONO_PUBLIC_APP_URL" in https://*) ;; *) echo "Public application URL must use HTTPS." >&2; exit 1;; esac

app_name="the-chancellor"
canary_name="${app_name}-canary"
revision="${GITHUB_SHA:-manual}"
short_revision="$(printf '%s' "$revision" | cut -c1-12)"
image="${app_name}:izakhono-${short_revision}"
canary_port="${IZAKHONO_CANARY_PORT:-13001}"
production_port="${IZAKHONO_PRODUCTION_PORT:-3000}"
data_volume="the_chancellor_data"
canary_volume="the_chancellor_canary_data"

docker build \
  --label "za.co.izakhono.product=THE CHANCELLOR" \
  --label "za.co.izakhono.commit=$revision" \
  --label "za.co.izakhono.channel=production-candidate" \
  -t "$image" .

docker volume create "$data_volume" >/dev/null
docker volume create "$canary_volume" >/dev/null
docker rm -f "$canary_name" >/dev/null 2>&1 || true

docker run -d --name "$canary_name" \
  --env-file "$CHANCELLOR_ENV_FILE" \
  -e NODE_ENV=production -e PORT=3000 -e DATA_DIR=/app/data \
  -e IZAKHONO_RUNTIME=true -e PERSISTENT_STORAGE=true \
  -v "${canary_volume}:/app/data" \
  -p "127.0.0.1:${canary_port}:3000" "$image" >/dev/null
cleanup_canary(){ docker rm -f "$canary_name" >/dev/null 2>&1 || true; }
trap cleanup_canary EXIT INT TERM

attempt=0
until curl --fail --silent --show-error "http://127.0.0.1:${canary_port}/api/health" >/dev/null; do
  attempt=$((attempt+1)); [ "$attempt" -lt 30 ] || { docker logs "$canary_name" || true; echo "Canary health gate failed." >&2; exit 1; }; sleep 2
done

canary_ready="$(curl --fail --silent --show-error "http://127.0.0.1:${canary_port}/api/go-live")"
printf '%s' "$canary_ready" | grep -q '"readyForPaidTraffic":true' || { printf '%s\n' "$canary_ready"; echo "Canary commercial readiness gate failed; production was not changed." >&2; exit 1; }

old_image=""
if docker container inspect "$app_name" >/dev/null 2>&1; then
  old_image="$(docker container inspect --format '{{.Config.Image}}' "$app_name")"
  docker rm -f "$app_name" >/dev/null
fi

rollback(){
  docker rm -f "$app_name" >/dev/null 2>&1 || true
  if [ -n "$old_image" ]; then
    docker run -d --name "$app_name" --restart unless-stopped \
      --env-file "$CHANCELLOR_ENV_FILE" \
      -e NODE_ENV=production -e PORT=3000 -e DATA_DIR=/app/data \
      -e IZAKHONO_RUNTIME=true -e PERSISTENT_STORAGE=true \
      -v "${data_volume}:/app/data" -p "127.0.0.1:${production_port}:3000" "$old_image" >/dev/null
  fi
}

if ! docker run -d --name "$app_name" --restart unless-stopped \
  --env-file "$CHANCELLOR_ENV_FILE" \
  -e NODE_ENV=production -e PORT=3000 -e DATA_DIR=/app/data \
  -e IZAKHONO_RUNTIME=true -e PERSISTENT_STORAGE=true \
  -v "${data_volume}:/app/data" -p "127.0.0.1:${production_port}:3000" "$image" >/dev/null; then
  rollback; echo "Promotion failed; previous Chancellor image restored." >&2; exit 1
fi

attempt=0
until curl --fail --silent --show-error "http://127.0.0.1:${production_port}/api/health" >/dev/null; do
  attempt=$((attempt+1)); [ "$attempt" -lt 30 ] || { docker logs "$app_name" || true; rollback; echo "Promoted container failed health; rolled back." >&2; exit 1; }; sleep 2
done

local_ready="$(curl --fail --silent --show-error "http://127.0.0.1:${production_port}/api/go-live")"
printf '%s' "$local_ready" | grep -q '"readyForPaidTraffic":true' || { printf '%s\n' "$local_ready"; rollback; echo "Promoted container failed commercial gate; rolled back." >&2; exit 1; }

public_base="${IZAKHONO_PUBLIC_APP_URL%/}"
curl --fail --silent --show-error "$public_base/api/health" >/dev/null || { rollback; echo "External HTTPS health acceptance failed; rolled back." >&2; exit 1; }
public_ready="$(curl --fail --silent --show-error "$public_base/api/go-live")"
printf '%s' "$public_ready" | grep -q '"readyForPaidTraffic":true' || { printf '%s\n' "$public_ready"; rollback; echo "External paid-traffic readiness failed; rolled back." >&2; exit 1; }

echo "THE CHANCELLOR promoted successfully on IZAKHONO sovereign infrastructure."
