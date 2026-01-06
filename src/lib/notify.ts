// Petit helper pour déclencher un toast sans hook (utilisé dans axios interceptors)
type Variant = 'success' | 'error' | 'info' | 'warning';

declare global {
  interface Window {
    __notify?: (
      message: string,
      options?: { variant?: Variant; durationMs?: number }
    ) => void;
  }
}

export function exposeNotify(
  fn: (
    message: string,
    options?: { variant?: Variant; durationMs?: number }
  ) => void
) {
  if (typeof window !== 'undefined') {
    window.__notify = fn;
  }
}

export function toastNotify(
  message: string,
  options?: { variant?: Variant; durationMs?: number }
) {
  if (typeof window !== 'undefined' && typeof window.__notify === 'function') {
    window.__notify(message, options);
  }
}
