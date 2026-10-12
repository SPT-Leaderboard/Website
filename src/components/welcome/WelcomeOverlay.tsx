// Prod-design-dossier §Welcome gate, MODERNIZED per its skip-list: a
// NON-BLOCKING first-visit overlay (prod's gate locked the page until
// dismissal; the rewrite lets users dismiss with Escape, a backdrop click,
// the close button, or the CTA — and the flag means they never see it again
// this browser). Solid island on the home route only (index.astro).
// Accessibility: role="dialog" aria-modal="false" (nothing beneath is
// inert), labelled by the heading, Escape handled, focus moved to the CTA
// on open and restored to the page heading on dismiss; prefers-reduced-
// motion skips the exit animation and the subtitle crossfade.
import { Show, createSignal, onCleanup, onMount } from 'solid-js';
import './welcome.css';

const SEEN_STORAGE_KEY = 'sptlb.welcome.seen';
const SUBTITLE_INTERVAL_MS = 3000; // prod glitch-phrase cadence (~3 s)
const EXIT_ANIMATION_MS = 300; // prod fade + translateY(-20px) 300 ms

/** Prod's glitch subtitle phrases (index.html welcome gate). */
const SUBTITLE_PHRASES = [
  'Escape from Tarkov — offline',
  'Single Player Tarkov',
  'Community-driven rankings',
  'Fair play. Verified raids.',
];

export default function WelcomeOverlay() {
  const [open, setOpen] = createSignal(false);
  const [closing, setClosing] = createSignal(false);
  const [phraseIndex, setPhraseIndex] = createSignal(0);
  const [reducedMotion, setReducedMotion] = createSignal(false);

  let cta: HTMLButtonElement | undefined;
  let pageHeading: HTMLElement | undefined;
  let subtitleTimer: ReturnType<typeof setInterval> | undefined;
  let exitTimer: ReturnType<typeof setTimeout> | undefined;

  onMount(() => {
    setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    pageHeading = document.querySelector<HTMLElement>('main h1') ?? undefined;
    if (window.localStorage.getItem(SEEN_STORAGE_KEY) !== null) return;
    setOpen(true);
    cta?.focus();
    subtitleTimer = setInterval(
      () => setPhraseIndex((index) => (index + 1) % SUBTITLE_PHRASES.length),
      SUBTITLE_INTERVAL_MS,
    );
  });

  onCleanup(() => {
    if (subtitleTimer !== undefined) clearInterval(subtitleTimer);
    if (exitTimer !== undefined) clearTimeout(exitTimer);
  });

  /** Dismiss: persist the flag, animate out (unless reduced motion), then
      unmount and hand focus back to the page heading. */
  function dismiss(): void {
    if (closing()) return;
    window.localStorage.setItem(SEEN_STORAGE_KEY, new Date().toISOString());
    if (subtitleTimer !== undefined) clearInterval(subtitleTimer);
    if (reducedMotion()) {
      setOpen(false);
      pageHeading?.focus();
      return;
    }
    setClosing(true);
    exitTimer = setTimeout(() => {
      setOpen(false);
      pageHeading?.focus();
    }, EXIT_ANIMATION_MS);
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') dismiss();
  };

  return (
    <Show when={open()}>
      {/* Click-out dismiss: only a click on the scrim itself (not the card)
          closes, so text selection inside the card never dismisses. */}
      <div
        class={`welcome${closing() ? ' welcome--closing' : ''}`}
        role="dialog"
        aria-modal="false"
        aria-labelledby="welcome-heading"
        onKeyDown={onKeyDown}
        onClick={(event) => {
          if (event.target === event.currentTarget) dismiss();
        }}
      >
        <section class="welcome__card">
          <button
            type="button"
            class="welcome__close"
            aria-label="Dismiss welcome message"
            onClick={dismiss}
          >
            ×
          </button>
          <h2 id="welcome-heading" class="welcome__heading">
            Welcome to SPTLB
          </h2>
          {/* Prod's glitch-phrase subtitle, re-implemented as a timed text
              swap (no blink/clip animation; skip-list honors XC1). */}
          <p class="welcome__subtitle" aria-live="off">
            {SUBTITLE_PHRASES[phraseIndex()]}
          </p>
          <div class="welcome__actions">
            <button type="button" class="welcome__cta" ref={cta} onClick={dismiss}>
              Enter the leaderboard
            </button>
            <a class="welcome__secondary" href="/meta">
              Explore the weapon meta
            </a>
            <a class="welcome__secondary" href="/achievements">
              Browse achievements
            </a>
          </div>
        </section>
      </div>
    </Show>
  );
}
