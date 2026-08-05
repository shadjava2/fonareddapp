import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  /** Circuit breaker : évite de marteler MySQL quand l’hôte Docker est bloqué (erreur 1129). */
  dbCircuitOpenUntil?: number;
};

/** Fenêtre pendant laquelle on refuse les requêtes après un blocage hôte MySQL. */
const CIRCUIT_COOLDOWN_MS = 60_000;

function envInt(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

/**
 * Parse `DATABASE_URL` → options pool MariaDB (Prisma 7 ignore connection_limit / pool_timeout dans l’URL).
 */
function parseMysqlUrl(url: string): {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  allowPublicKeyRetrieval: boolean;
  ssl: false | undefined;
} {
  const u = new URL(url);
  const database = decodeURIComponent(u.pathname.replace(/^\//, '').split('/')[0] || '');
  const sslParam = (u.searchParams.get('ssl') || '').toLowerCase();
  const apr = (u.searchParams.get('allowPublicKeyRetrieval') || 'true').toLowerCase();

  return {
    host: u.hostname || '127.0.0.1',
    port: u.port ? Number(u.port) : 3306,
    user: decodeURIComponent(u.username || ''),
    password: decodeURIComponent(u.password || ''),
    database,
    allowPublicKeyRetrieval: apr !== 'false' && apr !== '0',
    // MySQL hôte / Docker : SSL souvent désactivé (ssl=false dans l’URL)
    ssl: sslParam === 'false' || sslParam === '0' ? false : undefined,
  };
}

function isMysqlHostBlockedError(err: unknown): boolean {
  const parts: string[] = [];
  let cur: unknown = err;
  for (let i = 0; i < 6 && cur; i++) {
    if (typeof cur === 'string') parts.push(cur);
    else if (cur && typeof cur === 'object') {
      const o = cur as { message?: unknown; cause?: unknown; code?: unknown };
      if (o.message != null) parts.push(String(o.message));
      if (o.code != null) parts.push(String(o.code));
      cur = o.cause;
      continue;
    }
    break;
  }
  const bag = parts.join(' ').toLowerCase();
  return (
    bag.includes('is blocked because of many connection errors') ||
    bag.includes('flush-hosts') ||
    bag.includes('er_host_is_blocked') ||
    bag.includes('1129')
  );
}

function createPrismaClient(): PrismaClient | undefined {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return undefined;

  const parsed = parseMysqlUrl(url);

  /**
   * Pool volontairement petit.
   * Timeouts : courts pour MySQL local / Docker ; plus longs si l’hôte est distant
   * (ex. Tailscale) — sinon acquireTimeout 8s tombe avant la 1re connexion (~10s).
   */
  const isRemoteHost =
    parsed.host !== '127.0.0.1' &&
    parsed.host !== 'localhost' &&
    parsed.host !== 'host.docker.internal' &&
    parsed.host !== 'mysql';
  const connectionLimit = envInt('DB_CONNECTION_LIMIT', isRemoteHost ? 8 : 5);
  const connectTimeout = envInt('DB_CONNECT_TIMEOUT_MS', isRemoteHost ? 15_000 : 3_000);
  const acquireTimeout = envInt('DB_ACQUIRE_TIMEOUT_MS', isRemoteHost ? 60_000 : 8_000);
  /** idleTimeout du driver mariadb est en secondes */
  const idleTimeoutSec = envInt('DB_IDLE_TIMEOUT_SEC', 60);

  const adapter = new PrismaMariaDb({
    host: parsed.host,
    port: parsed.port,
    user: parsed.user,
    password: parsed.password,
    database: parsed.database,
    connectionLimit,
    connectTimeout,
    acquireTimeout,
    idleTimeout: idleTimeoutSec,
    // Distant : garder 1 connexion chaude évite de re-payer 10 s à chaque requête
    minimumIdle: isRemoteHost ? 1 : 0,
    allowPublicKeyRetrieval: parsed.allowPublicKeyRetrieval,
    ...(parsed.ssl === false ? { ssl: false } : {}),
  });

  const base = new PrismaClient({
    adapter,
    log:
      process.env.PRISMA_LOG === '1'
        ? ['error', 'warn']
        : process.env.NODE_ENV === 'development'
          ? ['error', 'warn']
          : ['error'],
  });

  // Circuit breaker : si MySQL a bloqué l’IP Docker, on arrête d’ouvrir des connexions pendant 60 s
  const extended = base.$extends({
    query: {
      async $allOperations({ args, query }) {
        const until = globalForPrisma.dbCircuitOpenUntil ?? 0;
        if (Date.now() < until) {
          const waitSec = Math.ceil((until - Date.now()) / 1000);
          throw new Error(
            `Base de données temporairement indisponible (hôte MySQL bloqué). Réessayez dans ~${waitSec}s, ou exécutez FLUSH HOSTS côté MySQL.`
          );
        }
        try {
          return await query(args);
        } catch (err) {
          if (isMysqlHostBlockedError(err)) {
            globalForPrisma.dbCircuitOpenUntil = Date.now() + CIRCUIT_COOLDOWN_MS;
            console.error(
              `[prisma] MySQL a bloqué l’hôte du conteneur — circuit ouvert ${CIRCUIT_COOLDOWN_MS / 1000}s. Sur le serveur : sudo mysqladmin flush-hosts`
            );
          }
          throw err;
        }
      },
    },
  });

  return extended as unknown as PrismaClient;
}

export const prisma: PrismaClient | undefined =
  globalForPrisma.prisma ?? createPrismaClient();

// Toujours mémoriser (prod Docker inclus) pour un seul pool par process Node
globalForPrisma.prisma = prisma;
