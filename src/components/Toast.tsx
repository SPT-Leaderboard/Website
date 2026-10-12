// Toast primitive on Kobalte's toast queue (@kobalte/core/toast).
// Public API is unchanged from FRT-10: showToast(message, type) fans out from any
// island once <ToastHost /> is mounted (BaseLayout does site-wide). Kobalte now
// owns the queue semantics the old version hand-rolled: aria-live region, 3s
// auto-dismiss, pause on hover/focus, close button. Styling stays in toast.css.
import { Toast, toaster } from '@kobalte/core/toast';
import { Portal } from 'solid-js/web';
import './toast.css';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

const AUTO_DISMISS_MS = 3000;

export function showToast(message: string, type: ToastType = 'info'): void {
  toaster.show((props) => (
    <Toast
      toastId={props.toastId}
      class={`toast toast--${type}`}
      duration={AUTO_DISMISS_MS}
    >
      <p class="toast__message">{message}</p>
      <Toast.CloseButton class="toast__dismiss" aria-label="Dismiss notification">
        ×
      </Toast.CloseButton>
    </Toast>
  ));
}

export function ToastHost() {
  return (
    <Portal>
      <Toast.Region class="toast-host" aria-label="Notifications">
        <Toast.List />
      </Toast.Region>
    </Portal>
  );
}
