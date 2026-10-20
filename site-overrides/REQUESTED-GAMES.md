# Requested Games Review - October 20, 2026

## Follow-Up: Recognizable Publisher Games

Added Backrooms, Basketball Stars, Basketball Legends 2020, BasketBros.io,
Volley Random and Boxing Random from TwoPlayerGames' public Embed controls.
Game assets remain hosted by the publisher. Provenance and observations are in
`catalog-sources/requested-publishers.json`.

The actual browser fixture exposed an address bug: calling `document.open()`
from the opener could replace the popup's document URL with the library URL.
The active launchers now write from a script created inside the blank document.
All six new popup checks returned `about:blank` after this correction. This is
not navigation or a browser-security bypass; it keeps the blank document's URL.

Backrooms reached its game menu in the saved wrapper and its fullscreen stage
matched viewport bounds. Nested game-canvas input could not be reliably driven
by the test browser, so full gameplay and fullscreen are still not marked passed.
All six remain internally untested rather than falsely advertised as supported.

The official FNF itch.io Embed dialog was inspected directly. It supplies a
167px-high promotional widget linking to itch.io, not a playable game embed.
That widget is not offered as a substitute for the requested game.

The URL and branding are unchanged. Hosting is not moved or disguised to evade
school filtering. About:blank is a launch container, not an access-control bypass.
No new external Play actions are added. Publisher/source citations remain credits.

## Prepared Additions

These entries have local HTML launchers. They remain internally **untested**, not
"about:blank supported": full gameplay, actual popup behavior and fullscreen have
not been confirmed for each one. Papa's Pizzeria rendered its intro locally in
Ruffle. Browser automation became slow and timed out repeatedly; an intro is not
a gameplay pass. A-Z ordering is the default for the library and categories.

| Request | Result | Source / Evidence |
| --- | --- | --- |
| Papa's cooking games | 14 original Flash editions prepared with Ruffle: Pizzeria, Burgeria, Taco Mia!, Freezeria, Pancakeria, Wingeria, Hot Doggeria, Cupcakeria, Pastaria, Donuteria, Cheeseria, Bakeria, Sushiria, Scooperia. Not paid mobile/HD/To Go/Deluxe editions. | [Flipline distribution page](https://www.flipline.com/freegames.html) explicitly permits hosting the supplied packages. `catalog-sources/flipline.json` pins each ZIP checksum. |
| Basket Random | Original publisher embed wrapper prepared; no copied assets. | [RHM / TwoPlayerGames](https://www.twoplayergames.org/game/basket-random), public Embed control and `embedFrame` metadata. |
| Soccer Random | Original publisher embed wrapper prepared; no copied assets. | [RHM / TwoPlayerGames](https://www.twoplayergames.org/game/soccer-random), public Embed control and `embedFrame` metadata. |
| Sports games | Existing Sports category retained, plus the two Random games above. | Sources and licenses remain per catalog entry. |
| Emulators | Ruffle Flash emulation is included for authorized Flipline SWFs. No commercial console ROMs or BIOS files included. | [Ruffle](https://github.com/ruffle-rs/ruffle), MIT / Apache-2.0. Pinned npm distribution and license files retained. |

## Not Added As Playable Entries

"No verified permission" means this review did not establish permission, not that
permission can never be obtained. A downloadable file, a public GitHub mirror or
owning a retail copy does not by itself grant public website redistribution rights.

| Request | Current blocker / Useful next input |
| --- | --- |
| Snow Rider 3D | No working, authorized HTML redistribution package verified. The user's mirror previously rendered an intro but went blank after resizing. The [GameBiz distributor listing](https://gamedistribution.com/games/snow-rider-3d/) has an embedding route with publisher terms; no account or agreement was created/accepted. Remains unavailable rather than an external Play link. Creator-authorized HTML or written permission would help. |
| Baldi's Basics | [Original creator's release](https://basically-games.itch.io/baldis-basics) provides native downloads, not a verified redistributable browser build. No fan port is substituted for the original. Need an authorized WebGL/HTML build and permission. |
| Friday Night Funkin' | [Official page](https://ninja-muffin24.itch.io/funkin) has a browser edition, but open source code is not permission to redistribute the art/music. The [asset license](https://github.com/FunkinCrew/funkin.assets/blob/main/LICENSE.md) explicitly restricts redistribution. Need an authorized third-party game embed or permission. |
| At least 9 FNF mods, including Huggy Wuggy | Quota is not fulfilled. No nine browser builds with cleared code, music, art and character rights were established. Need creator-published embed instructions/permission for each specific mod; no arbitrary mirror downloads. |
| Cookie Clicker | [Official browser game](https://orteil.dashnet.org/cookieclicker/) exists. No third-party hosting or embedding permission was verified, so no mirrored package is published. |
| Five Nights at Freddy's 1, 2, 3, 4 | No authorized redistributable browser builds were verified. The [original game is commercially distributed](https://store.steampowered.com/app/319510/). Native executables cannot be used as HTML game files. Need rights-holder-authorized web builds. |
| Geometry Dash | Checked [RobTop's official site](https://geometrydash.com/). No authorized redistributable HTML package verified; Scratch remakes are not passed off as the original. |
| Getting Over It | [Creator's release page](https://www.foddy.net/blog/2017/09/getting-over-it/) does not establish a licensed web redistribution package. Need creator-authorized HTML build. |
| GET YOKED | [Creator's itch page](https://gregs-games.itch.io/get-yoked-2) has a browser prototype. Permission for third-party hosting/embedding was not established. No assets copied. |
| Gorilla Tag | [Official developer](https://www.anotheraxiom.com/) describes the VR title. No original-game browser build/hosting permission verified. A locomotion code repository is not a redistribution license for the full game. |
| GTA 1 or 2 | [Rockstar's original release information](https://www.rockstargames.com/games/gta2) does not establish browser redistribution rights. No game data, ROMs or native packages copied. |
| Lethal Ape | [Official site](https://lethalape.com/) offers Quest VR. Its promotional asset-kit permission is not a license to redistribute the game. Need an authorized browser build. |
| PS3 emulator | [RPCS3](https://rpcs3.net/) is a native emulator, not a drop-in HTML application. No credible browser-ready PS3 emulator was verified. No fake emulator card or download is added. |
| Solar Smash | [Paradyme](https://paradyme.games/) is the original developer. No third-party embed/hosting permission verified. An authorized playable on another service would not automatically permit extracting it. |
| Flappy Dunk | No original Voodoo-authorized browser package or publisher embed verified. No similarly named remake substituted. |
| Backrooms | Added the specific Backrooms edition supplied through TwoPlayerGames' public Embed control. Its menu rendered; full gameplay testing remains incomplete. |
| Soundboard | No specific board was named or licensed audio collection verified. Need a creator-published board with embed permission or a licensed audio pack; no copyrighted clip collection copied. |
| The World's Hardest Game | No rights-holder-authorized distribution package verified in this pass. Third-party embed offers are not taken as proof they hold the original game's rights. Need an original-author/publisher-approved SWF/HTML package. |

An HTML attachment can be inspected locally, but permission must cover public
hosting before it is published. Do not send passwords, account tokens or paid ROMs.
