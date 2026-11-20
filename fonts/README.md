# Fonts

> **Licence note:** the Luxora Grotesk font belongs to the Seasonal Tokens project, which bought
> it. It is not covered by this repository's AGPL licence. The owner approved shipping it in the
> kit on 2026-11-20 ([docs/DECISIONS.md](../docs/DECISIONS.md) K8). The files were copied
> unchanged from the Seasonal Mini Games repository. They are byte-identical to the copies in
> Seasonal Bingo Royale and in the Seasonal Entertainment website repository, which first shipped
> them.

| File                                | Face (`css/fonts.css`) | Bytes | sha256                                                             |
| ----------------------------------- | ---------------------- | ----- | ------------------------------------------------------------------ |
| `luxora-grotesk-book.woff2`         | 400 normal (body)      | 21996 | `8512ada429aecf96f7f5fd94464f39f65134ea5f5f870dfe3a56b57f5d989292` |
| `luxora-grotesk-regular.woff2`      | 500 normal             | 24388 | `856b73bce8cee2f9eddc39db8be031e652c4fbead6bce32e6be888a49dde01fb` |
| `luxora-grotesk-bold.woff2`         | 700 normal (headings)  | 26424 | `69cfa95ef347cf98355b4d7fd21c5af1e3af72be7d6208250f4f4eec8dea5af8` |
| `luxora-grotesk-italic.woff2`       | 400 italic             | 25308 | `3343ff43ff40808916327ceedb59177d35093c83e2d65685855b328633f6fe19` |
| `luxora-grotesk-light-italic.woff2` | 300 italic             | 20984 | `3abe7bb32a1a08f6ef15f1c6c513182f3ec3565fcd6c0dd711aee35710180ffa` |

Sources, read on 2026-11-20:

- seasonal-mini-games `assets/fonts/` at `91b23bc`;
- seasonal-bingo-royale `assets/fonts/` at `c3b76c1`;
- seasonal-entertainment `client/src/assets/fonts/` at `e7b995c`.

`tests/fonts.test.ts` checks that every file still has its hash and that `css/fonts.css` points
only at files that are here.
