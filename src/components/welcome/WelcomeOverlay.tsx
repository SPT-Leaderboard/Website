// Prod-design-dossier §Welcome gate, MODERNIZED per its skip-list: a first-
// visit overlay on Kobalte's Dialog (same primitive as Modal.tsx, owner
// direction 2026-10-12: battle-tested primitives, not hand-rolled focus
// traps). modal=true makes the full-screen scrim behave modal: focus is
// trapped inside, the page behind is inert, and Escape + outside-click both
// dismiss (findings 2-3). The flag means users never see it again in this
// browser. Solid island on the home route only (index.astro).
// Accessibility: labelled by the Dialog.Title heading, focus moved into the
// dialog on open and restored on dismiss by Kobalte; prefers-reduced-motion
// skips the exit animation, the subtitle crossfade, and the glitch-phrase
// interval entirely (finding 5).
import { Dialog } from '@kobalte/core/dialog';
import { Portal } from 'solid-js/web';
import { Show, createSignal, onCleanup, onMount } from 'solid-js';
import './welcome.css';

// Finding 4: sptlb:* namespace + private-mode-safe localStorage access.
const SEEN_STORAGE_KEY = 'sptlb:welcome-seen';
const SUBTITLE_INTERVAL_MS = 3000; // prod glitch-phrase cadence (~3 s)

/** Prod's glitch subtitle phrases (index.html welcome gate). */
const SUBTITLE_PHRASES = [
  'Escape from Tarkov — offline',
  'Single Player Tarkov',
  'Community-driven rankings',
  'Fair play. Verified raids.',
];

function readSeenFlag(): string | null {
  try {
    return window.localStorage.getItem(SEEN_STORAGE_KEY);
  } catch {
    return null; // private mode / storage disabled: show the overlay
  }
}

function writeSeenFlag(): void {
  try {
    window.localStorage.setItem(SEEN_STORAGE_KEY, new Date().toISOString());
  } catch {
    // Storage unavailable: overlay just reappears next visit; not fatal.
  }
}

export default function WelcomeOverlay() {
  const [open, setOpen] = createSignal(false);
  const [closing, setClosing] = createSignal(false);
  const [phraseIndex, setPhraseIndex] = createSignal(0);
  const [reducedMotion, setReducedMotion] = createSignal(false);

  let subtitleTimer: ReturnType<typeof setInterval> | undefined;
  let exitTimer: ReturnType<typeof setTimeout> | undefined;

  function startSubtitleTimer(): void {
    if (subtitleTimer !== undefined) return;
    subtitleTimer = setInterval(
      () => setPhraseIndex((index) => (index + 1) % SUBTITLE_PHRASES.length),
      SUBTITLE_INTERVAL_MS,
    );
  }

  function stopSubtitleTimer(): void {
    if (subtitleTimer !== undefined) clearInterval(subtitleTimer);
    subtitleTimer = undefined;
  }

  onMount(() => {
    // Finding 5: reduced motion never starts the glitch-phrase interval, and
    // a live preference change stops/starts it instead of polling.
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onMotionChange = (event: MediaQueryListEvent) => {
      setReducedMotion(event.matches);
      if (event.matches) stopSubtitleTimer();
      else if (open()) startSubtitleTimer();
    };
    setReducedMotion(media.matches);
    media.addEventListener('change', onMotionChange);
    onCleanup(() => media.removeEventListener('change', onMotionChange));

    if (readSeenFlag() !== null) return;
    setOpen(true);
    if (!media.matches) startSubtitleTimer();
  });

  onCleanup(() => {
    stopSubtitleTimer();
    if (exitTimer !== undefined) clearTimeout(exitTimer);
  });

  /** Dismiss (Kobalte routes Escape, backdrop click, and the close button
      here): persist the flag, animate out (unless reduced motion), then
      unmount. Focus restore is Kobalte's job. */
  function dismiss(): void {
    if (closing()) return;
    writeSeenFlag();
    stopSubtitleTimer();
    if (reducedMotion()) {
      setOpen(false);
      return;
    }
    setClosing(true);
    // Exit duration has one source: --duration-base in CSS (finding 6).
    const durationMs = Number.parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--duration-base'),
    );
    exitTimer = setTimeout(() => setOpen(false), durationMs || 250);
  }

  return (
    <Show when={open()}>
      <Dialog.Root
        open={open()}
        onOpenChange={(next) => {
          if (!next) dismiss();
        }}
        modal={true}
      >
        <Portal>
          <div class={`welcome${closing() ? ' welcome--closing' : ''}`}>
            <Dialog.Overlay class="welcome__scrim" />
            <Dialog.Content class="welcome__card">
              {/* Finding 11: glyph is decorative; the accessible name is the
                  button's aria-label. */}
              <Dialog.CloseButton class="welcome__close" aria-label="Dismiss welcome message">
                <span aria-hidden="true">×</span>
              </Dialog.CloseButton>
              <Dialog.Title class="welcome__heading">Welcome to SPTLB</Dialog.Title>
              {/* Prod's glitch-phrase subtitle, re-implemented as a timed text
                  swap (no blink/clip animation; skip-list honors XC1). */}
              <p class="welcome__subtitle" aria-live="off">
                {SUBTITLE_PHRASES[phraseIndex()]}
              </p>
              <div class="welcome__actions">
                <button type="button" class="welcome__cta" onClick={dismiss}>
                  Enter the leaderboard
                </button>
                <a class="welcome__secondary" href="/meta" onClick={dismiss}>
                  Explore the weapon meta
                </a>
                <a class="welcome__secondary" href="/achievements" onClick={dismiss}>
                  Browse achievements
                </a>
              </div>
            </Dialog.Content>
          </div>
        </Portal>
      </Dialog.Root>
    </Show>
  );
}
