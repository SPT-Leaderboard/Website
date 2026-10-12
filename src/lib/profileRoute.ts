// Profile deep-link routing helper.
//
// The row buttons used to set `window.location.hash` directly. That is a
// navigation: for a fragment that matches no element the browser scrolls the
// document to the top, so every profile open "re-rendered" the page from the
// user's point of view (owner report 2026-10-12). history.pushState updates
// the URL without scrolling, but does not fire hashchange/popstate, so we
// dispatch the event ourselves — the ProfileModal listeners stay unchanged.
export function openProfile(permaLink: string): void {
  history.pushState(history.state, '', `#id=${permaLink}`);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}
