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
master`). Check that `git ls-remote origin` lists only `master` and the tags (and, during an
   unattended night, its sheet branch until the sheet's PR merges).
7. Prove the delivery on the tag: a scratch consumer outside every repository, with
   `ignore-scripts=true`, installs `#vX.Y.Z`, typechecks and tests what the version added, and is
   deleted afterwards. Record it in [DELIVERY.md](DELIVERY.md).

The one tag not on a merge commit is v0.0.1, the delivery probe on the root commit (07a8484),
cut before master was protected.

A game then moves to the version in its own PR, with the owner's approval (DECISIONS K1).

## Repository settings (DECISIONS K24)

Set on 2026-11-22 through `gh api repos/weudlll-cyber/seasonal-kit/...` and read back the same
day:

| Setting                         | Read back                                                                                                                                   |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Merge methods                   | `allow_merge_commit: true`, `allow_squash_merge: false`, `allow_rebase_merge: false`: every merge leaves the merge commit a tag sits on     |
| Delete the branch after a merge | `delete_branch_on_merge: true`                                                                                                              |
| Release tags                    | ruleset "Release tags" (id 27815939), `target: tag`, `refs/tags/v*`, rules `update` and `deletion`, `enforcement: active`, no bypass actors |
| Vulnerability alerts            | on (`GET …/vulnerability-alerts` answers 204)                                                                                               |
| Wiki and Projects               | `has_wiki: false`, `has_projects: false`: the docs live in this repository                                                                  |
| Actions pinned to commit SHAs   | `sha_pinning_required: true`; every `uses:` in `.github/` was already a full SHA                                                            |

Master's branch protection is DECISIONS K13 and K19. Renovate (`renovate.json`) needs its GitHub
app, which the owner installs: no Renovate PR or dependency dashboard has appeared yet.
