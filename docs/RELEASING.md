# Releasing

A version of the kit is an annotated git tag `vX.Y.Z` on a merge commit of `master`. Games pin
it ([DELIVERY.md](DELIVERY.md)). Tags are never moved or deleted.

## Version numbers (semver)

- **Major:** a game must change to take it. That covers a token, class, keyframe or export that
  is removed or renamed, or a changed meaning. Each such change gets a migration note per game in
  the CHANGELOG.
- **Minor:** something new a game can use, or a changed value a game sees, such as a token's
  colour.
- **Patch:** a fix that changes nothing a game relies on.

Before 1.0.0, minor versions may break. Each break is still named in the CHANGELOG.

## Cutting a version

1. On the branch that finishes the version:
   - set `package.json` `"version"` to `X.Y.Z`;
   - turn the CHANGELOG's "Unreleased" into `## [X.Y.Z] - YYYY-MM-DD`, with its compare link;
   - run `pnpm build` and commit `dist/` (CI fails if it differs from the source);
   - update `docs/BACKLOG.md` and `docs/OPEN.md`.
2. Before a minor or major version, a security pass ([security-pass.md](security-pass.md)).
3. Open the PR. Every required check must be green: `verify`, `osv-scanner`, `gitleaks`, `docs`,
   `analyze` (CodeQL), `showcase` (DECISIONS K19).
4. With the owner's approval, merge with a merge commit (`gh pr merge --merge --delete-branch`),
   so the tag sits on a commit of `master`. Then delete the local branch too; only `master` stays
   on origin.
5. Tag the merge commit and push the tag:

   ```sh
   git fetch origin
   git tag -a vX.Y.Z <merge-commit> -m "vX.Y.Z: <one line>"
   git push origin vX.Y.Z
   ```

6. Check CI and CodeQL on the merge commit (`gh run list -R weudlll-cyber/seasonal-kit --branch
master`). Check that `git ls-remote origin` lists only `master` and the tags.

A game then moves to the version in its own PR, with the owner's approval (DECISIONS K1).
