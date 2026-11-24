# The result frame: three games, two wishes, one shape

An investigation for BACKLOG 12 (a middle part, Mini Games T417) and 17 (a one-column layout, or
two cards only with a reveal, Bingo), decided together (DECISIONS K42). Nothing in the kit
changes with this page; it recommends, and the owner decides.

Read on 2026-11-24, read-only, from each game's `origin/master`: Mini Games `721761f`, Bingo
Royale `3b8a58e`, Seasonal Cases `073f9ad`; kit `master` `97b8238`. Mini Games' own T417 entry
is not on its `master` (a search of the tree finds none), so what it asks for is taken from the
kit's BACKLOG 12 and the code that would need it.

## What the kit has today

`ResultFrame` ([src/react/ResultFrame.tsx](../../src/react/ResultFrame.tsx) lines 57–81) renders
one fixed order: a first part (`.sk-result-first`: headline with `lines` and `proof`, then
`reveal`, then `placings`) and, if `more` is given, a second card `.sk-result-more`. The reveal
and placings boxes are always rendered, even when empty. A page is the `.sk-result` section; a
`panel` ({ level }) makes the headline an `h2`–`h6` and the first part as high as its content.

[css/frames.css](../../css/frames.css) lines 140–272: every card is a bordered grid; from 900 px
the first part has two columns (`minmax(0,1fr) minmax(20rem,28rem)`, areas 'head head' /
'reveal places'); `.sk-result-more` is its own card below; a phone is one column but still two
cards; in a docked screen the result is the one row of `.sk-docked-main`.

## How each game lays out its result

### Seasonal Mini Games (does not use `ResultFrame`; it is the source of it)

- **Files:** `apps/web/src/round/ResultScreen.tsx` lines 189–228 (`ResultScreen`), 111–142
  (`OwnResult`), 146 (`ResultHead`), 170 (`Guesses`); CSS `result.css`, `resultClosest.css`,
  `resultOwn.css`, `resultBoard.css`; `ClosestToWinning.tsx`, `ResultParts.tsx`.
- **Order** (`ResultScreen.tsx` 205–228): the first-part card (headline, the margin or closest-miss
  line, the proof; the game's reveal; the placings with the team line as their foot), then
  **`Guesses`**: a "Closest to winning" card of 10 rows with "All guesses (N)", or a history
  panel of every guess; then the "more" card (next-round box, teams, match standings).
- **Layout:** a board game's first part is one screen high; a list game's is as high as its
  content. From 900 px two columns as the kit's; with "Closest to winning" the reveal column
  shrinks to 11–15 rem. A phone is one column; opening "All placings" grows the first part and the
  page scrolls. The proof moves to the end on a phone. Games that draw their own first part
  (`ownResult`) get a different page-high grid with a 376 px right-hand next-round box.
- **Fit:** the closest-to-winning card is a fixed part of the fitting (`data-fit-fixed`).

### Seasonal Bingo Royale (uses `ResultFrame` as a panel, v0.11.1)

- **Files:** `apps/web/src/components/FinalPlacement.tsx` lines 34–87 (the frame at 50–85),
  `components/results.css` 147–173; rendered from `Playback.tsx:77`, `game/ArenaNotice.tsx:42`,
  `host/HostConsole.tsx:142`.
- **Props:** `game="bingo"`, `panel={{ level: 3 }}`, `headline="Final placement"`, `lines` (own
  place and the placement rule), `reveal={null}`, `placings` (the podium, places 1–3), `more`
  (ranked rows from place 4, only when any); no `layout`, no `fitted`.
- **Layout:** Bingo does not load `frames.css`. Its `results.css` makes the panel one card
  by `display: contents` on `.sk-result-first`, `-head`, `-places` and `-more`, and
  `display: none` on `.sk-result-reveal` (its note: the kit's panel would be "two cards, the
  placings beside an empty reveal from 900 px"). It overrides the kit's own class names, so a
  rename in the kit would break it silently.

### Seasonal Cases (uses `ResultFrame` as designed, v0.11.1)

- **Files:** `apps/web/src/screens/Result.tsx` lines 86–97, `screens/result.css`; every screen sits
  in the kit's `DockedScreen` (`App.tsx:102`); `frames.css` and `fit.css` are loaded.
- **Props:** `game="mini-games"`, `headline="The winners"`, `proof` (the seal line), `reveal` (a
  grid of every case with its artifact), `placings` (the winners), `more` ("All cases").
- **Layout:** the kit's, unchanged: two columns from 900 px, the reveal box scrolling inside,
  "more" a second card. No mismatch with today's shape.

## What each wish would need

| Wish                                  | Who             | What it needs in the kit                                                                                                                                                                                                            |
| ------------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A **middle part** (BACKLOG 12)        | Mini Games only | A slot `middle` rendered after `.sk-result-first` and before `.sk-result-more`, its own card; fitted as a fixed part; the docked rule `.sk-docked-main > .sk-result` (frames.css 265–268) must keep its one row for the first part. |
| A **one-column** layout (BACKLOG 17)  | Bingo           | An option that drops the 900 px two-column rule for this frame, and that makes first part and "more" read as one card (Bingo now does both by overriding the kit's classes).                                                        |
| **Two cards only with a reveal** (17) | Bingo           | The reveal box is not rendered when `reveal` is null or left out; with none, the 900 px rule gives `places` the whole width. With no reveal and no `more` there is one card.                                                        |

Mini Games' `ownResult` page (the right-hand column) and the "All placings" growth are outside
every option above: they stay the game's own, as the ADOPTION plan already has it.

## Recommendation: one shape that serves all three

1. **Render the reveal only when there is one** (`reveal` null or undefined renders no
   `.sk-result-reveal`), and let the first part take **one column whenever there is none**: the
   CSS keys on a data attribute the component sets (`data-sk-reveal="none"`), not on `:empty`,
   so it holds in every browser and is tested. This is the whole of "two cards only with a
   reveal". Cases and Mini Games always have a reveal, so nothing changes for them; Bingo gets its
   one column.
2. **Add one optional `middle` slot** between the first part and `more`, its own card, fixed in
   the fitting. Mini Games passes `Guesses` there. A game that passes nothing sees no change.
3. **Do not add a general "one column" prop.** With 1., a frame without a reveal is one column on
   its own, and a game with a reveal that wants one column on a desktop has none today. If one
   asks, a `layout: 'stack'` can be added then, with its case.
4. **Merging first part and `more` into one card stays Bingo's** (a short override on the kit's
   documented classes, now with only `display: contents` on two of them), or it becomes a later
   option `panel.merged` if the owner wants Bingo to drop `results.css` completely. It is the one
   point where the kit would be shaped for a single game, so it is left as a question.

### What each game would change

- **Bingo:** load `frames.css` for the result; keep `results.css` only for the merged card (or
  drop it if `panel.merged` is built); drop `display: none` on the reveal (the frame omits it).
- **Mini Games:** pass `middle` for `Guesses`; keep `ownResult`, the "All placings" growth and the
  proof's phone position as its own; adopt the rest with `ResultFrame` as ADOPTION.md plans.
- **Cases:** nothing. It has a reveal and no middle part.

### Open for the owner

- Mini Games' T417 text, which this search could not find; the `middle` slot is shaped from the
  code that would fill it.
- Whether Bingo's single card is worth a kit option (4.).
- Both changes are additive and opt-in by the data they are given, so they fit a minor release.
