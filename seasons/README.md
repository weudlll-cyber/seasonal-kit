# Season icons

> **Licence note:** the season icons belong to the Seasonal Tokens project. They are not covered by
> this repository's AGPL licence. The same files are public in the Seasonal Entertainment website
> repository, which they come from; the owner approved shipping them in the kit on 2026-11-25
> ([docs/DECISIONS.md](../docs/DECISIONS.md) K83). The Seasonal Tokens logo and the emblem are not
> here.

The website's four optimized files, `client/src/assets/seasons/` of seasonal-entertainment
`master` at `cc743b9`, copied byte for byte. They are never edited here: CI compares them with the
website's `master` on every pull request and daily (`scripts/season-check.mjs`), as it does the
season colours.

| File         | Bytes | sha256                                                             |
| ------------ | ----- | ------------------------------------------------------------------ |
| `spring.svg` | 28780 | `f890925794ae84ea88a59680c59d7ef26f9bfdb927f1b36523da907281616457` |
| `summer.svg` | 53899 | `c15ef7dafe7d8dcf3932bb2c84b9f7704ada6f46597febe77d544006a93704da` |
| `autumn.svg` | 27301 | `dddfb16ca5959fe423dfc01b2e2c46dcfec634cd4f905b3d0dd02607f30034d1` |
| `winter.svg` | 47635 | `c8d65493ad6db1c364f99df4ff53a728a82ae62a44cc090a2a62b45225d7fd3f` |

## Using them

- With React: `SeasonIcon` from `@seasonal/kit/react`, with `@seasonal/kit/seasons.css`.
- Without React: the same stylesheet's classes
  (`<span class="sk-season-icon" data-sk-season="spring" role="img" aria-label="Spring">`), or the
  files by their package paths, `@seasonal/kit/seasons/spring.svg` and so on.
