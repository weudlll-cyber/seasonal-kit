# Seasonal Kit

`@seasonal/kit` holds the shell, UI and platform parts that every Seasonal game uses from one
place: Seasonal Bingo Royale, Seasonal Mini Games, Seasonal Party and later games. Games keep
their own play; the kit holds what is the same around it. Every game depends on it, so it is held
to a stricter standard than any single game ([docs/DECISIONS.md](docs/DECISIONS.md) K2).

## What is inside

| Import                     | What it is                                                                              |
| -------------------------- | --------------------------------------------------------------------------------------- |
| `@seasonal/kit/tokens.css` | the season colours, copied from the website                                             |
| `@seasonal/kit`            | the theme logic: `resolveTheme`, `storedTheme`, `storeTheme`, `systemTheme` and `Theme` |

## How a game pins it

```json
"dependencies": {
  "@seasonal/kit": "github:weudlll-cyber/seasonal-kit#v0.0.1"
}
```

A game moves to a new tag only with the owner's approval. It installs compiled `dist/`, and no
script runs on install. See [docs/DELIVERY.md](docs/DELIVERY.md).

## How a version is cut

It is cut as a PR with every check green, merged with a merge commit, and then an annotated tag
`vX.Y.Z` on that commit. See [docs/RELEASING.md](docs/RELEASING.md) and
[CHANGELOG.md](CHANGELOG.md).

## Working on the kit

See [CONTRIBUTING.md](CONTRIBUTING.md), and [CLAUDE.md](CLAUDE.md) for the working rules. Open
work is in [docs/OPEN.md](docs/OPEN.md) and [docs/BACKLOG.md](docs/BACKLOG.md); security is in
[SECURITY.md](SECURITY.md).

## License

GNU Affero General Public License v3.0 or later ([LICENSE](LICENSE)), as Mini Games.
