# Showcase

The kit's showcase is one page that shows every component of `@seasonal/kit/react` with sample
content, the way a game would use them. It is for looking at the kit, and for the accessibility
check that runs on every pull request. It lives in `showcase/`
([its page](../showcase/Showcase.tsx)) and is never shipped:
`package.json` `"files"` leaves it out.

## What it shows

- **The shell:** the back link and the theme toggle.
- **The app header** four times ([`showcase/Headers.tsx`](../showcase/Headers.tsx)):
  - signed out and standalone (Sign in, Register);
  - signed in, in website mode (the back link, "Walter (host)");
  - signed in with the development tools (a Quick Test link and the Dev sign-in menu);
  - a website admin's long bar in website mode.

  Each folds into one Menu whenever its items do not fit on one row: the phones fold all four,
  and 1280 px folds the admin's.

- **The game bar:** the season pill, "Shared", "9:50 left", Chat with 3 unread, Players and Host,
  and the phase strip with "Play · now". Under it a crowded bar, as Seasonal Cases has it.
- **The docked screen,** in a box 640 px high: the start card (or, with `?screen=result`, the
  result) on top, and under it the chat strip with the website's chat frame (a stub page,
  [`showcase/embed/chat/`](../showcase/embed/chat/index.html)) and the call slot with call id 7,
  which frames a stub of the call view
  ([`showcase/embed/call/7.html`](../showcase/embed/call/7.html), since v0.13.0). A phone shows
  the chat bar and the 48 px call strip instead.
- **The result frame** on its own.

`?theme=light` or `?theme=dark` opens the page in that theme; without it, the toggle starts from the
stored choice or the system setting, as in a game.

## How to run it

```sh
pnpm showcase          # serves the page for people (Vite's dev server)
pnpm showcase:test     # builds it, serves the build on port 4317, screenshots it and runs axe
```

The first `pnpm showcase:test` on a machine needs Playwright's Chromium:
`pnpm exec playwright install chromium`.

## Where the screens land

`pnpm showcase:test` writes one full-page screenshot per screen, viewport and theme to
`showcase/screens/`, as `<screen>-<viewport>-<theme>.png`:

- the screens: `start` and `result`;
- the viewports: `desktop-1280x720`, `desktop-1536x768`, `desktop-1920x1080`,
  `phone-375x667` and `phone-390x844`;
- the themes: `light` and `dark`.

On each phone viewport and theme one more screen, `header-menu-<viewport>-<theme>.png`, shows
the third header's menu and its dev menu opened. Four more show the kit's focus ring on the first
header, `focus-ring-<viewport>-<theme>.png`, at 1280 × 720 and 390 × 844, light and dark (for
the owner to look at, DECISIONS K29). That makes 28 screens a run. Before every run the folder is
emptied
([`showcase/global-setup.ts`](../showcase/global-setup.ts)), so only the last run's screens are
there. The folder is git-ignored: screens are never committed and never pile up (DECISIONS K16).
CI takes the same screenshots on its runner and keeps none.

## What the run checks

For each of the 20 docked screens, the spec ([`showcase/showcase.spec.ts`](../showcase/showcase.spec.ts)) checks
three things:

- the page has the theme asked for;
- the dock is in the layout the viewport gets (desktop at 900 px and wider in landscape, else
  phone);
- axe, with the WCAG 2.0, 2.1 and 2.2 A and AA rules, finds no serious or critical violation.

For each focus-ring screen, Tab reaches the header's brand, its outline is solid, and axe finds
nothing serious. At 320 × 640 the page must not scroll sideways (WCAG 1.4.10). For each of the 4
header-menu screens it opens the first header's Menu (axe again), then the third
header's Menu and its Dev sign-in panel (axe again). Moderate axe findings do not fail the run.
axe's `target-size` (WCAG 2.5.8, 24 px) is kept on (DECISIONS K33), and a probe proves it runs:
two 10 px buttons put side by side on the page are reported.

What only a browser's layout shows is measured in
[`showcase/layout.spec.ts`](../showcase/layout.spec.ts) (since v0.11.0): the back link keeps a
gap of 4 px or more between its arrow and its words; every app header keeps one row at 1280,
1536, 1920 and 390 px, the admin's folded at 1280 px and a short one unfolded at 1920 px; a
crowded game bar (Seasonal Cases' lead,
two long facts, the time and three buttons) stays inside the screen at 320, 360 and 375 px, every
button still 44 px.
Since v0.12.0 Mini Games' bar (the back link first, the Pre-picks button with the `prefs` icon) is
on the page too: at 1280 px the link shows arrow and words, at 390 and 320 px the arrow alone in a
target 44 px wide with the words as its accessible name, and the bar ends inside the screen.

CI runs it on every pull request and on master (job `showcase`, `.github/workflows/ci.yml`).
