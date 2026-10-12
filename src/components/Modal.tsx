// Modal primitive on Kobalte's Dialog (@kobalte/core/dialog). Kobalte supplies
// what the FRT-10 hand-rolled version reimplemented: focus trap, inert/hidden
// background, scroll lock, Escape handling — plus outside-click close, which the
// old contract deliberately omitted (modern UX expectation; owner direction
// 2026-10-12: use battle-tested primitives, don't hand-roll).
// Styling stays in modal.css on the same token classes.
import { Dialog } from '@kobalte/core/dialog';
import { Portal } from 'solid-js/web';
import { type JSX } from 'solid-js';
import './modal.css';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children?: JSX.Element;
}

export function Modal(props: ModalProps) {
  return (
    <Dialog
      open={props.open}
      onOpenChange={(open) => {
        if (!open) props.onClose();
      }}
      modal={true}
    >
      <Portal>
        <Dialog.Overlay class="modal-overlay" />
        <Dialog.Content class="modal">
          <div class="modal__header">
            <Dialog.Title class="modal__title">{props.title}</Dialog.Title>
            <Dialog.CloseButton class="modal__close" aria-label="Close dialog">
              ×
            </Dialog.CloseButton>
          </div>
          <div class="modal__body">{props.children}</div>
        </Dialog.Content>
      </Portal>
    </Dialog>
  );
}
