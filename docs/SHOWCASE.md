# Showcase

The kit's showcase is one page that shows every component of `@seasonal/kit/react` with sample
content, the way a game would use them. It is for looking at the kit, and for the accessibility
check that runs on every pull request. It lives in `showcase/`
([its page](../showcase/Showcase.tsx)) and is never shipped:
`package.json` `"files"` leaves it out.

## What it shows

- **The shell:** the back link and the theme toggle.
- **The game bar:** the season pill, "Shared", "9:50 left", Chat with 3 unread, Players and Host,
  and the phase strip with "Play · now".
- **The docked screen,** in a box 640 px high: the start card (or, with `?screen=result`, the
  result) on top, and under it the chat strip with the website's chat frame (a stub page,
  [`showcase/embed/chat/`](../showcase/embed/chat/index.html)) and the reserved call slot with a
  call id. The slot is outlined on this page only, since it frames nothing yet (BACKLOG 8). A phone
  shows the chat bar and the 48 px call strip instead.
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

That makes 20 screens a run. Before every run the folder is emptied
([`showcase/global-setup.ts`](../showcase/global-setup.ts)), so only the last run's screens are
there. The folder is git-ignored: screens are never committed and never pile up (DECISIONS K16).
CI takes the same screenshots on its runner and keeps none.

## What the run checks

For each of the 20, the spec ([`showcase/showcase.spec.ts`](../showcase/showcase.spec.ts)) checks
three things:

- the page has the theme asked for;
- the dock is in the layout the viewport gets (desktop at 900 px and wider in landscape, else
  phone);
- axe, with the WCAG 2.0, 2.1 and 2.2 A and AA rules, finds no serious or critical violation.

CI runs it on every pull request and on master (job `showcase`, `.github/workflows/ci.yml`).
