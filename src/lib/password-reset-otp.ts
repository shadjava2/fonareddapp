import { createHmac, randomInt, timingSafeEqual } from 'crypto';

const OTP_TTL_MS = 15 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 8;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const MAX_SENDS_PER_WINDOW = 5;

type Pending = {
  otpHash: string;
  expires: number;
  attempts: number;
  userId: bigint;
};

type GlobalOtp = typeof globalThis & {
  __fonareddOtpStore?: Map<string, Pending>;
  __fonareddOtpSendLog?: Map<string, number[]>;
};

function getStore(): Map<string, Pending> {
  const g = globalThis as GlobalOtp;
  if (!g.__fonareddOtpStore) g.__fonareddOtpStore = new Map();
  return g.__fonareddOtpStore;
}

function getSendLog(): Map<string, number[]> {
  const g = globalThis as GlobalOtp;
  if (!g.__fonareddOtpSendLog) g.__fonareddOtpSendLog = new Map();
  return g.__fonareddOtpSendLog;
}

function makeKey(username: string, email: string): string {
  const u = username.trim().toLowerCase();
  const e = email.trim().toLowerCase();
  return `${u}::${e}`;
}

function otpSecret(): string {
  return (
    process.env.PASSWORD_RESET_OTP_SECRET?.trim() ||
    process.env.JWT_SECRET?.trim() ||
    'dev-only-change-me'
  );
}

function hashOtp(otp: string): string {
  return createHmac('sha256', otpSecret()).update(otp).digest('hex');
}

function safeEqualHex(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, 'hex');
    const bb = Buffer.from(b, 'hex');
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

export function generateSixDigitOtp(): string {
  return String(randomInt(100000, 1000000));
}

export function canSendOtp(username: string, email: string): boolean {
  const key = makeKey(username, email);
  const now = Date.now();
  const log = getSendLog();
  const arr = (log.get(key) || []).filter((t) => now - t < RATE_WINDOW_MS);
  return arr.length < MAX_SENDS_PER_WINDOW;
}

export function recordOtpEmailSent(username: string, email: string): void {
  const key = makeKey(username, email);
  const now = Date.now();
  const log = getSendLog();
  const arr = (log.get(key) || []).filter((t) => now - t < RATE_WINDOW_MS);
  arr.push(now);
  log.set(key, arr);
}

export function savePendingReset(
  username: string,
  email: string,
  userId: bigint,
  otp: string
): void {
  const key = makeKey(username, email);
  getStore().set(key, {
    otpHash: hashOtp(otp),
    expires: Date.now() + OTP_TTL_MS,
    attempts: 0,
    userId,
  });
}

export function clearPendingReset(username: string, email: string): void {
  getStore().delete(makeKey(username, email));
}

/** Retourne l’id utilisateur si le code est valide ; sinon null (tentative enregistrée). */
export function consumeOtp(
  username: string,
  email: string,
  otp: string
): bigint | null {
  const key = makeKey(username, email);
  const store = getStore();
  const entry = store.get(key);
  if (!entry || Date.now() > entry.expires) {
    store.delete(key);
    return null;
  }
  if (entry.attempts >= MAX_OTP_ATTEMPTS) {
    store.delete(key);
    return null;
  }
  entry.attempts += 1;
  const ok = safeEqualHex(hashOtp(otp.trim()), entry.otpHash);
  if (!ok) {
    store.set(key, entry);
    return null;
  }
  store.delete(key);
  return entry.userId;
}
