# Codebase cleanup audit

Audited against current `origin/main` at `52f0c7b`, on branch
`chore/production-cleanup`. The working tree was clean before branching. The
cleanup was rebased onto current remote main to preserve its redesign, clinical
nutrition guides, approval workflows, editing, and reviews.

## Completed changes

| Area | Finding and correction |
| --- | --- |
| Starter code | Removed unused development instructions, legacy themed components, unused color/client hooks and palette, and the unreferenced SpaceMono font. Retained the current About route, which had replaced the starter modal. Removed the now-unused `expo-web-browser` dependency. The not-found screen uses the application's existing theme. |
| Account isolation | Cache loading clears the previous account's in-memory state. Failed reads or invalid cache structure keep the app in recovery rather than marking stale state ready and persisting it to another account. Reads wait for pending writes. Late account mutations cannot replace another account's state. |
| Persistence | Retained the existing storage keys and defaults for older meal records and caches without step/water entries. Invalid cache data is preserved, with a retry screen. Write failures are surfaced with a retry that saves the current in-memory snapshot. |
| Numeric validation | Retained existing finite height validation in the server and onboarding. Target calculations return no target for invalid measurements. New weigh-ins use the same 25–400 kg range as the server. Existing history is retained. Login rejects passwords beyond the supported size before hashing. |
| Request handling | Extracted a reusable client request function. The abort deadline includes downloading the response body. Invalid JSON responses and connection failures produce actionable errors; HTTP status codes remain attached to API errors. |
| API structure | `server/index.mjs` handles environment loading, startup, and graceful shutdown. `server/api.mjs` exposes a factory that can be tested on an ephemeral port with an in-memory database. No native project files were generated or edited. |
| API boundaries | Shared byte-based JSON parsing, object validation, 400 responses for malformed JSON, 413 for oversized bodies, no-store responses, internal error masking, explicit deployed web origin configuration, and bounded process-local rate limiting. Increased the ordinary body allowance so valid maximum-length Unicode conversations fit. |
| AI failures | Malformed provider JSON becomes a recoverable 502 error. Expanded the Claude structured-response output budget for seven-day plans. Plan normalization requires a real boolean for recovery days instead of coercing strings. Existing Gemini retries and schema fallback remain in place. |
| Browser behavior | Retained current browser confirmation and inline log feedback. Static HTML colors use the existing theme and preserve keyboard focus styling; removed obsolete starter comments and metadata. |
| Meal estimate integrity | Prevent duplicate estimate requests and changes to submitted food/photo inputs while an estimate is pending. Surface photo picker failures. Cap descriptions at the server-supported length. |
| Duplication | Shared local date/time formatting between storage and logging. Retained the existing date display/calendar utilities and approval workflow rather than replacing them with the older main implementation. |
| Repository hygiene | SQLite databases, WAL/SHM files, and adjacent encryption key files are ignored even when stored outside `server/data`. Existing environment/editor/build exclusions remain. No tracked databases, credentials, generated native projects, or build outputs were found. |
| SDK alignment | Applied Expo's SDK-compatible patch updates for Expo, Router, and SplashScreen. Kept Router/SDK peer dependencies and required icons/modules rather than treating imports alone as proof that a package is unnecessary. |
| Quality checks | Added reproducible install instructions, typecheck/check/export scripts, and a CI workflow covering lint, typecheck, tests, dependency compatibility, Expo Doctor, and all-platform export. |

## Verification

- All 62 tests pass, including the original main suite and new HTTP/regression coverage.
- HTTP coverage exercises provider verification, registration, onboarding and
  seven-day plan generation, plan revision, profile updates, meal estimates, chat,
  returning login, logout, deletion, session invalidation, CORS, malformed bodies,
  unsupported methods, and full-length Unicode conversations.
- Client tests cover API errors, proxy HTML, transport failures, and a stalled
  response body. Cache tests cover legacy defaults, account separation inputs,
  invalid JSON, invalid collection shapes, and invalid numeric entries.
- Rate-limit tests cover caller isolation, window expiry, and bounded capacity.
- Lint covers the app plus server, shared modules, and tests with zero warnings; strict TypeScript checks pass. Expo Doctor passes all 21 checks.
- Web, Android, and iOS JavaScript exports succeed. An export verifies bundling;
  it does not verify native permissions, device behavior, or store installation.
- Browser automation could not run because no browser surface was available in
  this session. No emulator/device or real provider credentials were used.

## Remaining production work

These are real limitations of the existing product/deployment, not evidence that
automated tests establish a perfect or production-certified application.

1. **Device acceptance:** Exercise Android and iOS development builds end to end,
   including image/camera permissions, photo formats, date/time pickers, keyboard
   avoidance, safe areas, accessibility settings, interrupted network requests,
   account switching, deletion, and persistence after restart. Exercise the same
   flows in a browser. Test the three actual providers with deployment-selected
   models; mocked tests cannot establish model availability or provider billing.
2. **Dependency advisories:** `npm audit` reports 30 affected dependency entries
   (19 high, 11 moderate) at the audit date. This is mostly propagation of four
   advisories through the Expo/Metro dependency tree, not 30 independent bugs.
   `braces` and `node-forge` currently list no patched versions. Other affected
   transitive packages are `decode-uri-component` and `uuid`. Audit proposes
   incompatible Expo/React Native downgrades for some entries. No forced downgrade
   or unverified major transitive override was applied. Track upstream fixes,
   review exposure in the deployed artifact/toolchain, and re-run the audit before
   release. References: [braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm),
   [node-forge](https://github.com/advisories/GHSA-86w9-cpqp-85rv),
   [decode-uri-component](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr),
   [uuid](https://github.com/advisories/GHSA-w5hq-g745-h8pq).
3. **Public API operations:** Configure HTTPS, exact web origins, shared gateway
   limits, monitoring with redaction, database/encryption-key backups and restore
   drills, and durable storage. SQLite and synchronous password hashing are
   appropriate to the current single-process prototype; measure load before a
   public launch and move password hashing off the request event loop if serving
   concurrent users at scale. Existing expired session rows need a retention job.
4. **Offline and synchronization behavior:** Activity remains device-local.
   Account deletion removes the server account and current device data; it cannot
   remotely erase offline caches on other devices. A restored server profile takes
   precedence over a cached profile. Profile edits use explicit server-generated
   previews and approval; offline editing would require a separate pending-change
   and conflict design if it becomes a product goal.
   Starting the app with an unreachable API preserves the token but cannot restore
   the authenticated account for offline use.
5. **Session and secret storage:** Native session tokens use SecureStore. Browser
   tokens remain in localStorage as in the existing app; a public web deployment
   needs an explicit session/XSS threat model and a hosting content security policy,
   or a deliberate migration to secure cookie-based sessions. Device activity in
   AsyncStorage is not encrypted. Add email verification/password recovery and
   account-level abuse controls if required by the release's authentication design.
6. **Rendering/performance:** Today/history/profile render their full relevant
   lists in ScrollView. Profile changes also persist the whole account snapshot.
   Measure with a large history on physical phones before introducing list
   virtualization, paginated history, or a database-backed activity store. Avoid
   changing data formats speculatively in a cleanup.
7. **Release configuration:** EAS project ownership, app identifiers, signing,
   deployment API URL, store/privacy disclosures, observability, and release
   acceptance are deployment-specific and still need configuration and validation.
   Health-related target formulas and provider guidance were preserved; this audit
   does not independently certify their clinical validity.

The app is materially cleaner and better protected against the identified
regressions, with the remaining release work recorded rather than hidden.
