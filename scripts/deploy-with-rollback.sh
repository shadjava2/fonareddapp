#!/usr/bin/env bash
# Déploiement Fonaredd (Next.js + Caddy, MySQL sur l’hôte) — rollback image app-prod
#
# Usage :
#   chmod +x scripts/deploy-with-rollback.sh
#   ./scripts/deploy-with-rollback.sh
#
# Prérequis : .env avec DATABASE_URL (MySQL hôte, ex. host.docker.internal:3306),
# JWT_SECRET, NEXTAUTH_URL (ex. https://fonaredd.com), NEXTAUTH_SECRET
#
# Variables utiles :
#   GIT_PULL=1              — git pull --ff-only avant build
#   DEPLOY_SERVICES         — défaut : "app-prod caddy"
#   APP_HEALTH_URL          — défaut : via Caddy http://127.0.0.1:${FONAREDD_CADDY_HTTP}/
#   RUN_MIGRATE=0           — désactive Prisma migrate deploy
#   DEPLOY_LOG=1
#   BUILD_NO_CACHE=1
#
# Cloudflare Tunnel → http://127.0.0.1:<FONAREDD_CADDY_HTTP> (défaut 18080)

set -Eeo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "$REPO_ROOT"

COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-fonaredd}"
COMPOSE_FILE="${COMPOSE_FILE:-$REPO_ROOT/docker-compose.yml}"
ENV_FILE="${ENV_FILE:-$REPO_ROOT/.env}"
ROLLBACK_FILE="$REPO_ROOT/.deploy-rollback"
CURRENT_FILE="$REPO_ROOT/.deploy-current"

if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE" 2>/dev/null || true
  set +a
fi

DEPLOY_SERVICES="${DEPLOY_SERVICES:-app-prod caddy}"
_CADDY_PORT="${FONAREDD_CADDY_HTTP:-18080}"
_APP_PORT="${FONAREDD_APP_PROD_PORT:-13001}"
# Santé via Caddy (même chemin que le tunnel) ; surchargez APP_HEALTH_URL pour tester l’app directe
APP_HEALTH_URL="${APP_HEALTH_URL:-http://127.0.0.1:${_CADDY_PORT}/}"
APP_PROD_IMAGE="${APP_PROD_IMAGE:-fonaredd-app-prod:latest}"
APP_PROD_ROLLBACK_TAG="${APP_PROD_ROLLBACK_TAG:-fonaredd-app-prod:rollback}"

BUILD_MAX_ATTEMPTS="${BUILD_MAX_ATTEMPTS:-3}"
BUILD_RETRY_DELAY="${BUILD_RETRY_DELAY:-15}"
HEALTH_MAX_ATTEMPTS="${HEALTH_MAX_ATTEMPTS:-24}"
HEALTH_RETRY_DELAY="${HEALTH_RETRY_DELAY:-5}"
HEALTH_INITIAL_DELAY="${HEALTH_INITIAL_DELAY:-15}"
BUILD_NO_CACHE="${BUILD_NO_CACHE:-0}"

export COMPOSE_PROJECT_NAME

if docker compose version >/dev/null 2>&1; then
  COMPOSE_BIN=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_BIN=(docker-compose)
else
  echo "[DEPLOY] ERREUR: Docker Compose introuvable (ni « docker compose », ni « docker-compose »)." >&2
  echo "  Exemples d’installation sur Ubuntu/Debian :" >&2
  echo "    curl -fsSL https://get.docker.com | sudo sh" >&2
  echo "    # ou : sudo apt update && sudo apt install -y docker.io docker-compose-v2 docker-compose-plugin" >&2
  echo "  Vérifiez : docker compose version" >&2
  exit 1
fi

compose() {
  local env_args=()
  if [ -f "$ENV_FILE" ]; then
    env_args+=(--env-file "$ENV_FILE")
  fi
  "${COMPOSE_BIN[@]}" \
    "${env_args[@]}" \
    -f "$COMPOSE_FILE" \
    -p "$COMPOSE_PROJECT_NAME" \
    --project-directory "$REPO_ROOT" \
    "$@"
}

log_line() {
  echo "$@"
  if [ -n "${DEPLOY_LOG:-}" ]; then
    if [ "$DEPLOY_LOG" = "1" ]; then
      mkdir -p "$REPO_ROOT/logs"
      echo "$(date -Iseconds) $*" >> "$REPO_ROOT/logs/deploy-$(date +%Y%m%d).log"
    else
      mkdir -p "$(dirname "$DEPLOY_LOG")" 2>/dev/null || true
      echo "$(date -Iseconds) $*" >> "$DEPLOY_LOG"
    fi
  fi
}

save_rollback_image() {
  if docker image inspect "$APP_PROD_IMAGE" >/dev/null 2>&1; then
    docker tag "$APP_PROD_IMAGE" "$APP_PROD_ROLLBACK_TAG"
    log_line "[DEPLOY] Image sauvegardée pour rollback: $APP_PROD_ROLLBACK_TAG"
  else
    log_line "[DEPLOY] Aucune image $APP_PROD_IMAGE existante (premier déploiement ?)"
  fi
}

rollback() {
  trap - ERR
  set +e
  log_line "[DEPLOY] ROLLBACK — restauration $APP_PROD_IMAGE depuis $APP_PROD_ROLLBACK_TAG"

  if docker image inspect "$APP_PROD_ROLLBACK_TAG" >/dev/null 2>&1; then
    docker tag "$APP_PROD_ROLLBACK_TAG" "$APP_PROD_IMAGE"
    log_line "[DEPLOY] Tag $APP_PROD_IMAGE restauré"
  else
    log_line "[DEPLOY] Aucune image $APP_PROD_ROLLBACK_TAG — impossible de restaurer l'image précédente"
  fi

  compose up -d $DEPLOY_SERVICES || true
  log_line "[DEPLOY] Rollback terminé (état containers :)"
  compose ps || true
  exit 1
}

trap 'log_line "[DEPLOY] Erreur — rollback"; rollback' ERR

if [ -f "$ENV_FILE" ]; then
  chmod 600 "$ENV_FILE" 2>/dev/null || true
else
  log_line "[DEPLOY] ERREUR: fichier $ENV_FILE requis (DATABASE_URL, secrets, NEXTAUTH_URL)"
  exit 1
fi

if [ -z "${DATABASE_URL:-}" ]; then
  log_line "[DEPLOY] ERREUR: DATABASE_URL vide — renseignez-le dans $ENV_FILE (MySQL sur l’hôte)"
  exit 1
fi

if [ "${GIT_PULL:-0}" = "1" ] && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  log_line "[DEPLOY] git pull --ff-only..."
  trap - ERR
  if ! git pull --ff-only; then
    log_line "[DEPLOY] ERREUR: git pull a échoué (pas de rollback Docker)"
    exit 1
  fi
  trap 'log_line "[DEPLOY] Erreur — rollback"; rollback' ERR
fi

log_line "[DEPLOY] Compose: ${COMPOSE_FILE#$REPO_ROOT/} (projet: $COMPOSE_PROJECT_NAME)"
log_line "[DEPLOY] Services: $DEPLOY_SERVICES"

log_line "[DEPLOY] Sauvegarde image app-prod pour rollback..."
save_rollback_image

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  GIT_SHA="$(git rev-parse --short HEAD)"
else
  GIT_SHA="manual"
fi
NEW_TAG="deploy-${GIT_SHA}-$(date +%Y%m%d%H%M)"
echo "$NEW_TAG" > "$ROLLBACK_FILE"

BUILD_EXTRA_ARGS=()
if [ "$BUILD_NO_CACHE" = "1" ]; then
  BUILD_EXTRA_ARGS+=(--no-cache)
fi

attempt=1
while [ "$attempt" -le "$BUILD_MAX_ATTEMPTS" ]; do
  log_line "[DEPLOY] Build app-prod tentative $attempt/$BUILD_MAX_ATTEMPTS..."
  if compose build "${BUILD_EXTRA_ARGS[@]}" app-prod; then
    break
  fi
  if [ "$attempt" -ge "$BUILD_MAX_ATTEMPTS" ]; then
    log_line "[DEPLOY] Build échoué après $BUILD_MAX_ATTEMPTS tentatives"
    rollback
  fi
  log_line "[DEPLOY] Nouvelle tentative dans ${BUILD_RETRY_DELAY}s..."
  sleep "$BUILD_RETRY_DELAY"
  attempt=$((attempt + 1))
done

log_line "[DEPLOY] Démarrage stack: $DEPLOY_SERVICES"
compose up -d $DEPLOY_SERVICES

if [ "${RUN_MIGRATE:-1}" = "1" ]; then
  log_line "[DEPLOY] Prisma migrate deploy..."
  if ! compose run --rm app-prod npx prisma migrate deploy; then
    log_line "[DEPLOY] Migration Prisma échouée"
    log_line "[DEPLOY] Derniers logs fonaredd-app-prod:"
    docker logs fonaredd-app-prod 2>&1 | tail -40 | while read -r line; do log_line "  $line"; done
    rollback
  fi
fi

log_line "[DEPLOY] Health check: $APP_HEALTH_URL"
if [ -n "$HEALTH_INITIAL_DELAY" ] && [ "$HEALTH_INITIAL_DELAY" -gt 0 ] 2>/dev/null; then
  log_line "[DEPLOY] Attente ${HEALTH_INITIAL_DELAY}s avant la 1re vérification..."
  sleep "$HEALTH_INITIAL_DELAY"
fi

app_ok=0
for i in $(seq 1 "$HEALTH_MAX_ATTEMPTS"); do
  if curl -fsS -m 10 -o /dev/null "$APP_HEALTH_URL" 2>/dev/null; then
    app_ok=1
    log_line "[DEPLOY] Application OK (HTTP)"
    break
  fi
  [ $((i % 6)) -eq 0 ] && log_line "[DEPLOY] Health tentative $i/$HEALTH_MAX_ATTEMPTS..."
  sleep "$HEALTH_RETRY_DELAY"
done

if [ "$app_ok" -ne 1 ]; then
  log_line "[DEPLOY] Health check KO après $HEALTH_MAX_ATTEMPTS tentatives"
  log_line "[DEPLOY] Derniers logs fonaredd-app-prod:"
  docker logs fonaredd-app-prod 2>&1 | tail -40 | while read -r line; do log_line "  $line"; done
  rollback
fi

echo "$NEW_TAG" > "$CURRENT_FILE"
log_line "[DEPLOY] Déploiement réussi. Tag: $NEW_TAG"

if [ -n "${CLOUDFLARED_TUNNEL_TOKEN:-}" ]; then
  if "${COMPOSE_BIN[@]}" -f "$COMPOSE_FILE" -p "$COMPOSE_PROJECT_NAME" --project-directory "$REPO_ROOT" config --services 2>/dev/null | grep -qx "cloudflared"; then
    log_line "[DEPLOY] Recréation cloudflared (profile tunnel)..."
    cf=()
    [ -f "$ENV_FILE" ] && cf+=(--env-file "$ENV_FILE")
    "${COMPOSE_BIN[@]}" "${cf[@]}" -f "$COMPOSE_FILE" -p "$COMPOSE_PROJECT_NAME" --project-directory "$REPO_ROOT" --profile tunnel up -d --force-recreate cloudflared 2>/dev/null || true
  fi
fi

log_line "[DEPLOY] Nettoyage Docker (prune léger)..."
docker builder prune -f >/dev/null 2>&1 || true
docker image prune -f >/dev/null 2>&1 || true

log_line "[DEPLOY] État final:"
compose ps || true
log_line "[DEPLOY] Terminé"
exit 0
