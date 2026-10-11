// FRT-10 modal primitive (web-standards-audit §2 KB2).
// On open: focus moves into the dialog, the background (everything else under <body>)
// becomes inert, and the trigger element is remembered. Tab is trapped inside; Escape
// closes and focus returns to the trigger. role="dialog" + aria-modal="true" +
// aria-labelledby pointing at the title id. Backdrop click is deliberately not wired
// (not in the contract); the close button and Escape are the exits.
import { Show, createEffect, createUniqueId, onCleanup, type JSX } from 'solid-js';
import './modal.css';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children?: JSX.Element;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal(props: ModalProps) {
  const titleId = `modal-title-${createUniqueId()}`;
  let panel: HTMLDivElement | undefined;
  let previouslyFocused: HTMLElement | null = null;
  let inerted: Element[] = [];

  const releaseBackground = () => {
    for (const element of inerted) element.removeAttribute('inert');
    inerted = [];
  };

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      props.onClose();
      return;
    }
    if (event.key !== 'Tab' || !panel) return;
    const focusables = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (focusables.length === 0) {
      event.preventDefault();
      return;
    }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;
    if (panel.contains(active)) {
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    } else {
      // Focus escaped (e.g. programmatically); pull it back to the dialog.
      event.preventDefault();
      first.focus();
    }
  };

  createEffect(() => {
    if (props.open && panel) {
      previouslyFocused =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      // KB2: background becomes inert while the dialog is open.
      for (const child of Array.from(document.body.children)) {
        if (child === panel || child.contains(panel)) continue;
        child.setAttribute('inert', '');
        inerted.push(child);
      }
      panel.focus();
    } else {
      releaseBackground();
      if (previouslyFocused) previouslyFocused.focus();
      previouslyFocused = null;
    }
  });

  onCleanup(() => {
    releaseBackground();
    previouslyFocused = null;
  });

  return (
    <Show when={props.open}>
      <div class="modal-overlay">
        <div
          class="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabindex={-1}
          ref={panel}
          onKeyDown={handleKeydown}
        >
          <header class="modal__header">
            <h2 id={titleId} class="modal__title">
              {props.title}
            </h2>
            <button
              type="button"
              class="modal__close"
              aria-label="Close dialog"
              onClick={() => props.onClose()}
            >
              ×
            </button>
          </header>
          <div class="modal__body">{props.children}</div>
        </div>
      </div>
    </Show>
  );
}
