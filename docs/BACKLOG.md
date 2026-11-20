# Backlog

Part one is what is open, each item with what "done" means. Part two is what is closed, each item
with what closed it. A closed item moves from part one to part two in the same commit that closes
it; [OPEN.md](OPEN.md) is the short page over part one.

## Part one — open

1. **Design basics** (DECISIONS K3, K7). Move the near-identical parts of Mini Games' and Bingo's
   `packages/ui/src` into the kit:
   - the shared tokens;
   - the season colours from the website;
   - the shared motion, with the `sk-` prefix;
   - the light/dark theme script.

   Done when: they are in the kit with tests, CI checks the season colours against the website and
   the text contrast, and v0.1.0 is tagged.

2. **Sign-in helpers and the chat embed, client side.** The website sign-in route helpers (Mini
   Games `packages/ui/src/websiteSignIn.ts`), and the host side of the website chat's embed
   protocol (website `docs/EMBED.md`). Done when: both are in the kit with tests, and a game uses
   them.
3. **Call-view slot** (DECISIONS K6). Reserve the slot in the layout. Done when: the website has
   fixed the call view's placement and size, and the kit's layout reserves exactly that.
4. **Server sign-in and 2FA** (DECISIONS K5). One reviewed merge of Bingo's and Mini Games'
   `websiteSignIn`, `websiteIdentity`, `twoFactor` and `totp`. Done when: the kit holds the more
   complete version plus what only the other has, reviewed and tested, and a security pass is
   recorded.
5. **Adopt the kit in the games:** Mini Games first, then Bingo Royale, then Seasonal Party, each
   in its own PR with the owner's approval. Done when: each game pins a kit tag and has removed
   its own copies of the moved parts.
6. **First security pass** ([security-pass.md](security-pass.md)). Done when: it is recorded
   before v0.2.0.

## Part two — closed

- **Delivery proof** (2026-11-20). A git dependency on a tag works with committed `dist/` and no
  install script, in a Vite build, a Vitest test and a typecheck. Closed by v0.0.1 (`07a8484`) and
  [DELIVERY.md](DELIVERY.md).
- **Project standards** (2026-11-20, DECISIONS K2). Repository files, living docs, supply-chain
  rules, security and quality CI, and the pre-commit hook. Closed by the second bootstrap commit
  on `master`, before master's protection was switched on.
