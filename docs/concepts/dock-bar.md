# The dock bar's height: measured

An investigation for BACKLOG 13 (Mini Games T416 (3)): the 4 px padding of the dock bar in the
form `line`, and the writing field in the form `field`. **Measured only; `css/dock.css` is
unchanged.** Nothing here is a decision.

**Outcome (v0.15.0):** no kit change (BACKLOG 13). Mini Games measures the bar again in the real
game and reports back; a new item follows if it shows a real overflow.

## How it was measured (2026-11-24)

The kit's showcase (`pnpm showcase:build`, served by Vite's preview) in Chromium, with a throwaway
Playwright script outside the repository (not committed, no dependency added). The showcase's
docked screen has the bar form `line` and call id 7, so its call strip (48 px) is above the bar.

- **`line`:** the showcase's own dock, measured as rendered.
- **`field`:** the showcase has no such state. The script put a 44 px single-line input after
  the chat bar button inside `.sk-chat-dock-row`, which is where `ChatDock` puts a game's `field`
  (`PhoneBar`, `bar === 'field'`). It measures the kit's CSS around a 44 px field; a game's own
  field may differ.
- **Keyboard:** the harness cannot open an on-screen keyboard. "Open" is the window's height cut
  to what a phone's keyboard leaves visible (667 → 400 px, 844 → 500 px). The kit's real follow of
  the keyboard (`--sk-visible-height` on `<html>`, DockedScreen) is covered by unit tests
  (`src/react/dock.test.tsx`, `dockless.test.tsx`), not by this script.

## The numbers

CSS px. `row` is `.sk-chat-dock-row` (border 1 px, padding 4 px 10 px, gap 6 px); the dock section
adds a bottom margin of 10 px (`dock.css` line 110); the share is of the window's height.

| Window     | Form    | Bar button | Row | Row + margin | Row + margin + call strip | Share of the window (no call)              |
| ---------- | ------- | ---------- | --- | ------------ | ------------------------- | ------------------------------------------ |
| 375 × 667  | `line`  | 44         | 54  | 64           | 118 (dock 108 + 10)       | 9.6 %; keyboard open (400 px high): 16.0 % |
| 375 × 667  | `field` | 44         | 104 | 114          | 168 (dock 158 + 10)       | 17.1 %; keyboard open: 28.5 %              |
| 390 × 844  | `line`  | 44         | 54  | 64           | 118                       | 7.6 %; keyboard open (500 px high): 12.8 % |
| 390 × 844  | `field` | 44         | 104 | 114          | 168                       | 13.5 %; keyboard open: 22.8 %              |
| 1280 × 800 | strip   | —          | 190 | 190          | the call slot sits beside | 23.8 % (the strip is not the phone bar)    |

With the keyboard "open" every height above is the same as with it closed: the bar and its row are
laid out in the flow and do not change with the window; only their share does.

### The padding's share

The row's 4 px top and 4 px bottom are **8 px**:

- in `line`, 8 of the row's 54 px (14.8 %), and of 64 px with the margin (12.5 %);
- in `field`, 8 of 104 px (7.7 %);
- of the window: 1.2 % of 667 px, 0.9 % of 844 px, 2.0 % of a 400 px visible height.

The padding sits **inside** the rounded border (radius 16 px) around a 44 px target (`--hit-target`,
K29). Without it the 44 px button would touch the border.

### The field

In `field` the field is always rendered beside the bar (the DOM has it in the row from the first
render, closed or open sheet) and was 44 px high, visible, in all four phone measurements. **This
measurement did not reproduce a hidden field.** If Mini Games sees it hidden, the cause is not the
kit's markup; candidates are its own `#root { height: var(--sk-visible-height, 100dvh) }` with the
dock under content that cannot shrink below its need (the dock is `flex: none`), or its own
`overflow`. That needs Mini Games' page, which this repository does not have; it is not decided
here.

## Recommendation

1. **Change nothing in `dock.css` now.** The 4 px padding is 8 px of the window at most 2 % even
   with the keyboard open, and it is what keeps the 44 px target inside its border (K29). Removing
   it would change every game's phone bar for a gain that small.
2. **If Mini Games shows a real overflow** (a screen at 375 × 667 with the keyboard open where the
   dock leaves too little for its content), add an **opt-in** `compact` form to the bar: no row
   padding, 8 px less in `line`, a 44 px bar still. A game that names nothing sees today's bar. It
   needs its own showcase state and a measurement of that overflow first.
3. **For the hidden field, ask Mini Games for the page** (its CSS height chain and the keyboard
   case) before any change in the kit. The kit's side shows the field.
