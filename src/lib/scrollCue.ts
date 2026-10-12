/**
 * Scroll-affordance helper for horizontally scrollable regions (leaderboard
 * tables, the profile tab strip). Wires `data-scrollable` and
 * `data-at-scroll-end` attributes so CSS can show a right-edge fade only while
 * columns are actually clipped, and drop it once everything is scrolled into
 * view. Sizes are re-checked on scroll, element resizes, and content resizes
 * (table rows re-rendering), so the cue tracks the real overflow state.
 *
 * Returns a cleanup function for `onCleanup` inside a Solid ref callback.
 */
export function wireScrollCue(el: HTMLElement): () => void {
  const update = () => {
    const scrollable = el.scrollWidth > el.clientWidth + 1;
    el.toggleAttribute('data-scrollable', scrollable);
    el.toggleAttribute(
      'data-at-scroll-end',
      !scrollable || el.scrollLeft >= el.scrollWidth - el.clientWidth - 1,
    );
  };
  update();
  el.addEventListener('scroll', update, { passive: true });
  const observer = new ResizeObserver(update);
  observer.observe(el);
  for (const child of Array.from(el.children)) observer.observe(child);
  return () => {
    el.removeEventListener('scroll', update);
    observer.disconnect();
  };
}
