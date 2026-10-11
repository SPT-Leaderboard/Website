/**
 * FRT-19 auth widget island — navbar port of the legacy login button
 * (`js/api-auth.js` `checkAuth()`/`updateAuthStatus()`, feature-inventory
 * "Page: index.html" api-auth.js entry).
 *
 * - Logged out: a "Log in" link to /login (the legacy #loginButton default
 *   state; the login flow itself stays a separate page, data-dependency-map #21).
 * - Logged in: an initials avatar (no image dependency), the username, the
 *   unread badge with the legacy "99+" cap (legacy #networkNotifies), and a
 *   Log out button that clears the mock-session flag and re-fetches.
 * - While getSession() resolves: a neutral skeleton — never a flash of the
 *   wrong auth state.
 * - maintenance: a dismissible tokenized banner under the header. The toast
 *   primitive is unsuitable here: toasts auto-dismiss after 3 s
 *   (src/components/Toast.tsx), while a maintenance notice must persist
 *   until dismissed.
 *
 * Session data comes from src/api/auth.ts (mock-backed until FRT-22).
 * Accessibility (docs/port/web-standards-audit.md): real link/button controls
 * (§2 KB1), the global tokenized :focus-visible ring applies (§3 FC1), the
 * skeleton is aria-hidden behind a role="status" announcement ending in "…"
 * (§8 ES6, §9 XC3), and the unread badge carries an "unread notifications"
 * aria-label (§2 KB5 pattern for notification counts).
 */
import { Portal } from "solid-js/web";
import { Show, createSignal, onMount } from "solid-js";
import { getSession, setMockSession, type Session } from "../../api/auth";
import "./auth-widget.css";

/** Legacy api-auth.js caps the unread badge display at "99+". */
const UNREAD_CAP = 99;

/** Up to the first two leading initials of the username ("Pilot" → "P"). */
function initials(username: string): string {
  return username
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function unreadDisplay(unreadCount: number): string {
  return unreadCount > UNREAD_CAP ? "99+" : String(unreadCount);
}

/**
 * Host for the maintenance banner, inserted right after the header so the
 * banner sits under the header on every page. The island itself is mounted
 * inside the nav and cannot render the banner inline.
 */
function ensureBannerHost(): HTMLElement | undefined {
  const header = document.querySelector("header.site-header");
  if (!header) return undefined;
  let host = document.querySelector<HTMLElement>("[data-auth-banner-host]");
  if (!host) {
    host = document.createElement("div");
    host.setAttribute("data-auth-banner-host", "");
    header.after(host);
  }
  return host;
}

export default function AuthWidget() {
  const [session, setSession] = createSignal<Session | undefined>(undefined);
  const [maintenanceDismissed, setMaintenanceDismissed] = createSignal(false);
  const [bannerHost, setBannerHost] = createSignal<HTMLElement>();

  onMount(() => {
    setBannerHost(ensureBannerHost());
    void refresh();
  });

  async function refresh(): Promise<void> {
    setSession(undefined); // skeleton while resolving, never the wrong state
    setSession(await getSession());
  }

  async function logOut(): Promise<void> {
    setMockSession(false);
    await refresh();
  }

  return (
    <>
      <Show
        when={session()}
        fallback={
          <span class="auth-widget__skeleton" role="status">
            <span class="sr-only">Loading session…</span>
            <span class="auth-widget__skeleton-pill" aria-hidden="true" />
          </span>
        }
      >
        {(current) => (
          <Show
            when={current().authenticated}
            fallback={
              <a class="auth-widget__login" href="/login">
                Log in
              </a>
            }
          >
            <span class="auth-widget__account">
              <span class="auth-widget__avatar" aria-hidden="true">
                {initials(current().username ?? "")}
              </span>
              <span class="auth-widget__username">{current().username}</span>
              <Show when={current().unreadCount > 0}>
                <span
                  class="auth-widget__badge"
                  role="status"
                  aria-label={`${current().unreadCount} unread notifications`}
                >
                  {unreadDisplay(current().unreadCount)}
                </span>
              </Show>
              <button type="button" class="auth-widget__logout" onClick={logOut}>
                Log out
              </button>
            </span>
          </Show>
        )}
      </Show>
      <Show when={bannerHost() && session()?.maintenance && !maintenanceDismissed()}>
        <Portal mount={bannerHost()}>
          <div class="auth-banner" role="status">
            <p class="auth-banner__message">The Network is under maintenance</p>
            <button
              type="button"
              class="auth-banner__dismiss"
              aria-label="Dismiss maintenance banner"
              onClick={() => setMaintenanceDismissed(true)}
            >
              ×
            </button>
          </div>
        </Portal>
      </Show>
    </>
  );
}
