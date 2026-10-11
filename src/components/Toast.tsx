// FRT-10 toast primitive — one Solid island: a ToastHost plus a module-level showToast().
// Behavior (FRT-10 contract + web-standards-audit §2 KB5, §8 ES6, §9 XC1):
// aria-live="polite" region; auto-dismiss after 3s; pause on hover AND on focus (not just
// hover); keyboard dismiss button; no slide animation under prefers-reduced-motion.
import { For, createSignal, onCleanup } from 'solid-js';
import './toast.css';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

const AUTO_DISMISS_MS = 3000;

// Module-level fan-out: showToast() works from any island or script once a <ToastHost />
// is mounted (BaseLayout mounts one site-wide). Before that it is a no-op.
const listeners = new Set<(toast: ToastItem) => void>();
let nextId = 1;

export function showToast(message: string, type: ToastType = 'info'): void {
  const toast: ToastItem = { id: nextId++, message, type };
  for (const listener of listeners) listener(toast);
}

export function ToastHost() {
  const [toasts, setToasts] = createSignal<ToastItem[]>([]);
  const timers = new Map<number, ReturnType<typeof setTimeout>>();

  const cancelDismiss = (id: number) => {
    const timer = timers.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      timers.delete(id);
    }
  };

  const dismiss = (id: number) => {
    cancelDismiss(id);
    setToasts((current) => current.filter((item) => item.id !== id));
  };

  const scheduleDismiss = (id: number) => {
    cancelDismiss(id);
    timers.set(id, setTimeout(() => dismiss(id), AUTO_DISMISS_MS));
  };

  const add = (toast: ToastItem) => {
    setToasts((current) => [...current, toast]);
    scheduleDismiss(toast.id);
  };

  listeners.add(add);
  onCleanup(() => {
    listeners.delete(add);
    for (const timer of timers.values()) clearTimeout(timer);
    timers.clear();
  });

  return (
    <div class="toast-host" role="status" aria-live="polite">
      <For each={toasts()}>
        {(toast) => (
          <div
            class={`toast toast--${toast.type}`}
            onPointerEnter={() => cancelDismiss(toast.id)}
            onPointerLeave={() => scheduleDismiss(toast.id)}
            onFocusIn={() => cancelDismiss(toast.id)}
            onFocusOut={() => scheduleDismiss(toast.id)}
          >
            <p class="toast__message">{toast.message}</p>
            <button
              type="button"
              class="toast__dismiss"
              aria-label="Dismiss notification"
              onClick={() => dismiss(toast.id)}
            >
              ×
            </button>
          </div>
        )}
      </For>
    </div>
  );
}
