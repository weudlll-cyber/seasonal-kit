# Tags

Every release tag of the kit, oldest first: the tag, its day, the commit it names and its own
message. A release adds its line ([RELEASING.md](RELEASING.md)); what a version changes is in the
[CHANGELOG](../CHANGELOG.md), its delivery proof in [DELIVERY.md](DELIVERY.md).

| Tag     | Date       | Commit    | What                                                                                             |
| ------- | ---------- | --------- | ------------------------------------------------------------------------------------------------ |
| v0.0.1  | 2026-11-20 | `07a8484` | delivery probe                                                                                   |
| v0.1.0  | 2026-11-20 | `920f983` | the design basics — shared tokens, season colours, sk- motion, theme logic                       |
| v0.2.0  | 2026-11-20 | `609e93c` | Luxora Grotesk in the kit — fonts.css and the five woff2 files                                   |
| v0.3.0  | 2026-11-20 | `0862694` | the game side of the website integration (sign-in, chat embed, call slot)                        |
| v0.4.0  | 2026-11-21 | `a35bc1f` | the screen building blocks (React: fit, docked chat, back link, theme toggle, disclosure)        |
| v0.4.1  | 2026-11-21 | `7791e8a` | DockedScreen without a visual viewport                                                           |
| v0.5.0  | 2026-11-21 | `929c997` | the start card and result frames                                                                 |
| v0.6.0  | 2026-11-21 | `bd5df31` | the game bar and focus mode                                                                      |
| v0.7.0  | 2026-11-21 | `6b0d9a7` | the showcase with axe; DockedScreen's phone height                                               |
| v0.8.0  | 2026-11-21 | `30ce80a` | server sign-in checks and two-factor sign-in (independently reviewed)                            |
| v0.9.0  | 2026-11-21 | `087e5b0` | the shared app header, the dev tools and decisions D1–D6                                         |
| v0.9.1  | 2026-11-22 | `4d57a7e` | the audit of 2026-11-22, behaviour-neutral fixes                                                 |
| v0.10.0 | 2026-11-22 | `36a72cf` | keyboard, focus, targets and fit (B7); the API cleanup (B4)                                      |
| v0.10.1 | 2026-11-22 | `76bd872` | the audit's noted items; data-sk- attributes, server-safe theme toggle                           |
| v0.11.0 | 2026-11-23 | `ab03151` | the games' requests, the season feed, 24 px targets, the handbook                                |
| v0.11.1 | 2026-11-23 | `acd011a` | peer ranges; Renovate leaves Node and the peers alone                                            |
| v0.12.0 | 2026-11-23 | `01dd712` | five additive answers to Mini Games' adoption requests                                           |
| v0.13.0 | 2026-11-24 | `f93dcf0` | header foldBelow, text floor default, bar press, chat hand-over, call view in the slot           |
| v0.14.0 | 2026-11-24 | `8eb1018` | the shared tokens take the --sk- prefix                                                          |
| v0.15.0 | 2026-11-24 | `e6943ad` | FailureBrake, ResultFrame without a reveal and with a middle card                                |
| v0.16.0 | 2026-11-24 | `6801202` | StartCard fit options pass through to useFitScale                                                |
| v0.17.0 | 2026-11-24 | `72ec78d` | the open phone chat sheet stays inside the visible height                                        |
| v0.18.0 | 2026-11-24 | `536477e` | ResultFrame fit options pass through to useFitScale                                              |
| v0.19.0 | 2026-11-24 | `19f0208` | a member's step badges in the header's account chip                                              |
| v0.19.1 | 2026-11-25 | `1dd81a6` | the night's clean-up, no change to the public API                                                |
| v0.20.0 | 2026-11-25 | `61022ec` | aria-controls, a referrer policy on the call frame, sideEffects, the font's holder               |
| v0.21.0 | 2026-11-25 | `f8ae818` | backup and restore, guarded fetch, session cookie, CSRF check, security headers, health routes   |
| v0.22.0 | 2026-11-25 | `2e8ed41` | the fixes from Seasonal Cases' measurements (brand, back link, game bar facts, optional opensIn) |
| v0.23.0 | 2026-11-25 | `6900866` | the testing entry (screens, guards, probe and sweep)                                             |
| v0.24.0 | 2026-11-25 | `84998cd` | steps beside names, a countdown on the server's clock, the API client and loading hook           |
| v0.25.0 | 2026-11-25 | `5927474` | split backup script, website route file for nginx and Caddy, load-check helpers                  |
| v0.26.0 | 2026-11-25 | `0e94fef` | the website's stand-in for browser tests; a database URL's password through PGPASSWORD           |
| v0.27.0 | 2026-11-25 | `b51e7ba` | fixes for Seasonal Cases' and Mini Games' findings                                               |
| v0.28.0 | 2026-11-26 | `c864703` | season icons, the brand link at 44 px, one operator address, the check rule                      |
| v0.29.0 | 2026-11-26 | `3b64ec7` | one admin command for every game, with uninstall                                                 |
| v0.30.0 | 2026-11-26 | `f3829d2` | the host baseline of a standalone install                                                        |
| v0.31.0 | 2026-11-26 | `c5b24d5` | the container hardening check                                                                    |
| v0.32.0 | 2026-11-26 | `0016e86` | the owner and app database roles                                                                 |
| v0.33.0 | 2026-11-26 | `4261eb9` | restore refuses first, the failure brake reserves, Bingo's look findings                         |
| v0.34.0 | 2026-11-26 | `7c1e97f` | base components, one header look, seven fixes from Mini Games                                    |
| v0.35.0 | 2026-11-26 | `8324170` | privacy list, report-only scans, signed release images, three Cases findings                     |
| v0.36.0 | 2026-11-27 | `4f342ce` | the findings of the games' v0.34.0 moves, large text, one working rule for checks                |
| v0.37.0 | 2026-11-27 | `f3d005a` | the one shared call's slot in the dock, and the way back to it                                   |
| v0.38.0 | 2026-11-27 | `a21ffe4` | the sweep's per-screen setup and floors of visible items                                         |
| v0.39.0 | 2026-11-27 | `cd25b4f` | the games' findings on v0.38.0                                                                   |
| v0.39.1 | 2026-11-27 | `29c0f01` | follow-ups to v0.39.0, the commit check proven                                                   |
| v0.40.0 | 2026-11-27 | `23f10b9` | the games' findings on v0.39.1, a local preview, four rules                                      |
