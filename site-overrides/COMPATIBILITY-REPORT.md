# Night Arcade Compatibility Report

Repair date: 2026-10-21. The Google Sites address and all 405 catalog entries are preserved.

## Architecture and hosting

The published Google Site embeds a Google intermediate frame, which embeds https://retrobytelab.github.io/night-arcade/. GitHub Pages serves the library interface, catalog, player shells and bundled game files. Google Sites is the containing homepage, not the host of those executable files.

The catalog contains 29 bundled browser games, 14 Flash games using Ruffle, 222 publisher-embedded players and 140 external source-catalog records. There are 265 default about:blank launch entries. Publisher players comprise 140 Y8, 78 TwoPlayerGames and four Miniplay embeds. An HTML wrapper does not mean the publisher's executable game files are bundled locally.

The homepage loads local application JavaScript, CSS and JSON. It displays remote thumbnails, but does not automatically start games. Its inline player has no initial game source. Optional health metadata is fetched after the catalog renders and cannot prevent the initial library from displaying.

## About launcher

A user click synchronously attempts one about:blank popup. HTML players are fetched from their local player paths with a 20-second timeout. A script owned by the new window writes the document, an absolute base resolves its resources, and shared sizing/fullscreen helpers are added. Publisher wrappers then embed their publisher URL; bundled players use local game resources. The browser address remains about:blank, but resource requests still go to their real hosts and remain subject to browser and administrator policies.

Blocked or denied popups now expose explicit Play here and ordinary player-page choices when available. No extra popup is automatically attempted. Inline loading is a user choice. Fetch failures, invalid HTML and timeouts produce explanations instead of silent success.

## Repairs

- Corrected 103 Cimulity project-root references across six exported pages/chunks. The Next.js export requires a consistent /night-arcade/games/cimulity base for these generated runtime paths.
- Added idempotent deployment-time repair of all 236 HTML player wrappers, including consistent sizing and shared fullscreen/error handling.
- Added safe handling of sandbox exceptions, fetch timeouts, failed thumbnails, stale inline callbacks and unavailable fullscreen APIs.
- Normalized player stage/header layout and kept fixed-size publisher scaling centered through resize/fullscreen.
- Added a static local dependency audit to gate publication on missing critical assets.
- The deployment audit caught missing shared CSS, audio, input, UI and favicon files for Labyrinth, Snake, Memory and Whac-a-Mole. Restored these existing local dependencies to the publication inputs.
- Preserved search, favorites, sorting, categories and recent history. No games were removed or relabeled as confirmed playable.

## Verification and limits

31 automated tests pass. They cover launcher behavior, one-attempt popup recovery, invalid HTML, timeout errors, fullscreen permission denial/rejection and WebKit APIs, player state distinctions, catalog preservation and Cimulity paths. Reapplying the repair script makes zero further changes. A fresh Backrooms popup check confirmed the actual about:blank address, publisher frame assignment and nonzero frame bounds; its status correctly remained gameplay unverified.

The static audit covers all 405 catalog entries and reports no detected missing local dependencies. It follows local HTML references, CSS URLs and literal relative JavaScript imports. It does not prove dynamically computed URLs, SWF/WASM internals, third-party services or gameplay work.

Passive HEAD requests to all 442 configured publisher-frame and external-thumbnail URLs returned HTTP 200. This is reachability evidence only: it does not verify rendering, embedding permission in every context, initialization or gameplay. See catalog-sources/network-check.json for request results.

Browser checks confirmed Cimulity boots at the project-prefixed URL, its simulation clock advances and Statistics opens. A real sandbox without allow-popups denied a launch and displayed the explicit recovery dialog; Play here loaded a 2048 board. Search, sorting and favorite toggling were exercised. Inline fullscreen expanded the player in the test browser. Fullscreen-denial behavior is covered by unit tests, not a managed Chromebook test. A 390px DOM layout check found no modal overflow, but the in-app browser's screenshot viewport was inconsistent; physical mobile verification remains outstanding. Keyboard gameplay interaction in the nested test frame timed out, so no new confirmed-playable status was awarded.

State meanings are intentionally distinct: loaded means a player/frame load event; initialized requires an explicit runtime signal (currently Ruffle where available); confirmed playable requires a recorded gameplay check. Cross-origin frames cannot reliably reveal game initialization or publisher errors. Slow loading stays unverified rather than being labeled failed without evidence.

## Domains and dependencies

The containing Google site uses sites.google.com, www.gstatic.com, apis.google.com, fonts.googleapis.com and fonts.gstatic.com. The application uses retrobytelab.github.io. Thumbnails use cdn2.y8.com, images.twoplayergames.org and www3/www4/www5.minijuegosgratis.com.

Publisher frame hosts are y8.com, www.twoplayergames.org and www.miniplay.com. Observed downstream hosts include storage.y8.com, files.twoplayergames.org, html5.gamedistribution.com, ext.minijuegos.com, ext.minijuegosgratis.com and playhop.com. Miniplay may load s1/s2/s3.minijuegosgratis.com, ssl.minijuegosgratis.com, api.minijuegos.com and www1.minijuegosgratis.com. Observed consent/analytics services include www.googletagmanager.com, cmp.setupcmp.com, cdn.privacy-mgmt.com, js-agent.newrelic.com, matomo.y8.com and account.y8.com. Publisher-controlled requests can change; this is not an exhaustive future network allowlist.

Bundled game dependencies include cdnjs.cloudflare.com (Predator Prey jQuery), static.adamheins.com (its CSS), unpkg.com (PeerJS), cloud0.peerjs.com, eu-0.turn.peerjs.com, us-0.turn.peerjs.com, stun.l.google.com, stun1.l.google.com and openrelay.metered.ca. Multiplayer/high-score services use websoccer.vibecoach.workers.dev and webtennis.vibecoach.workers.dev. GenerateRacer uses api.github.com. Legacy HexGL contains a dynamically created ssl.google-analytics.com/ga.js request. Build-only dependencies include registry.npmjs.org, i.flipline.com and the GitHub release archive. Build dependencies are not homepage runtime requirements.

## Google Sites and managed browsers

The live embed points to the expected GitHub Pages application. Google's outer intermediate iframe permits scripts/popups and popup escape, but has no explicit allowfullscreen attribute; the inner application iframe has allowfullscreen. A nested ancestor can limit fullscreen regardless of a descendant's setting. The application now reports unavailable/denied fullscreen without trying to override policy. The ordinary player-page option can be used only where normal policies permit it.

An immediate homepage block is not explained by the Play-click popup handler alone: no game popup is attempted before a click. Other Google Sites working does not imply this specific page, its GitHub frame, thumbnails or publisher hosts are allowed. The exact blocked request must be identified before attributing the result to a specific Lightspeed feature.

Lightspeed documents game-aggregator/proxy inspection capabilities, but having Filter Agent installed does not establish which inspection features or category rules the school enables. No recognizable Ultraviolet, Scramjet or Rammerhead proxy was found in the reviewed implementation. About:blank wrappers are not a way to avoid filtering; policies can still block their source resources or the containing site.

Chrome's displayed wording alone cannot distinguish an extension/client block, administrator URL policy or a response/embedding restriction. School IT should inspect the actual blocked URL, request/frame type, Chrome error code, Lightspeed category/rule and the affected account/device organizational unit. Provide them the Google Sites URL and GitHub Pages URL for review. Only authorized administrators should change an allowlist or policy. No filter bypass, deceptive renaming or alternate access route is recommended.

Primary references: https://www.lightspeedsystems.com/blog/k-12-proxy-bypass-has-changed-heres-what-were-doing-about-it/ ; https://chromium.googlesource.com/chromium/src/+/main/net/base/net_error_list.h ; https://support.google.com/chrome/a/answer/7532419?hl=en ; https://support.google.com/chrome/a/answer/9942583?hl=en .
