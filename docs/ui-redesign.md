# Gym Buddy / Kinetic

The redesign makes the next useful action easy to find and gives progress its own destination. It retains account setup, AI provider verification, profile editing, meal estimates, manual logs, history editing, plan approval, and saved reviews.

## Visual system

- Graphite `#0B0D10` canvas, off-white text, electric lime `#D4F878` primary actions.
- Blue for hydration, peach for nutrition, violet for steps and coaching, lime for training.
- Bundled, licensed Space Grotesk Bold for headings and prominent numbers; platform-native body text.
- Glass is expressed through translucent surfaces, fine borders, and subtle gradients. Broad background blur is deliberately avoided to keep charts readable and scrolling inexpensive across platforms.
- The same forward-motion brand mark appears in the app, app icon, splash image, Android adaptive icon, monochrome icon, and favicon. `assets/images/brand-mark.svg` is the scalable source.
- Existing reduced-motion support remains active. Inputs have a focus border; web keyboard navigation has visible focus outlines.

## Screen map

| Destination | Primary purpose |
| --- | --- |
| Today | Today's session, quick logs, energy guide, four daily metrics, coaching, recent activity |
| Plan | Training direction, seven-day selector, expandable sessions, guides, plan context |
| Log | Five explicit log types, optional date adjustment, entry form, inline validation and save feedback |
| Progress | Seven-day consistency, training totals, weight change, selectable 7D/30D charts, AI reviews |
| Progress / Daily history | Date selection, daily summary, chronological entries, editing |
| Profile | Identity and direction, expandable personal details, guides, AI configuration, account actions |
| Coach | Suggested starting prompts, conversation, existing explicit approvals for changes |

Quick-log links carry a fresh entry context. Reopening a shortcut uses its requested log type and date rather than retaining a previous manual selection. Existing drafts are preserved.

## Analytics semantics

Charts show actual manual logs. Empty periods display an invitation to check in, not fabricated activity. Missing entries remain gaps. Averages are calculated over days with entries and labeled per logged day; they do not imply that unlogged nutrition days had zero intake. A recorded zero is distinct from a missing record.

Weight charts use actual weigh-ins, not the previous weight carried forward in daily summaries. The line connects recorded measurements. The 30-day change compares the earliest and latest dates with a weigh-in in that window, using the latest stored measurement for each date. It needs at least two dates. Consistency counts days with any nutrition, training, hydration, steps, or weigh-in entry; it is not a health or readiness score.

Charts have labeled axes, metric units, date labels, point inspection, and previous/next-day controls. Three regression tests cover unknown days, carried-forward weight, and explicit zeros.

## Research informing the direction

[Hevy's feature overview](https://www.hevyapp.com/features/) foregrounds workout logging and progress tracking. [Fitbod's exercise history and records update](https://fitbod.me/blog/exercise-history-and-records/) emphasizes making historical performance and milestones useful. The design inference here is to keep training and logging close to the home screen while making progress a permanent navigation destination.

Implementation references: [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/), [Expo documentation index](https://docs.expo.dev/llms.txt), [Router tabs](https://docs.expo.dev/router/advanced/tabs/), [LinearGradient](https://docs.expo.dev/versions/v57.0.0/sdk/linear-gradient/), [SVG](https://docs.expo.dev/versions/v57.0.0/sdk/svg/), [Fonts](https://docs.expo.dev/versions/v57.0.0/sdk/font/), and [Symbols](https://docs.expo.dev/versions/v57.0.0/sdk/symbols/).

## Verification

Lint and TypeScript pass. All 36 automated tests pass. Expo exports JavaScript/Hermes bundles for web, iOS, and Android; this checks bundling, not signed installable builds. The raster app icon was visually inspected.

The browser tool reported no available browsers, so screen-level visual QA and device interaction testing could not be performed in this session. Before V1 release, verify small-phone layouts, large accessibility text, keyboard behavior, Android/iOS date pickers, chart selection, and all logging/approval flows on actual devices. These checks remain outstanding.

Run `npm run api` and `npm start` for a device preview, or `npm run web` for the browser preview. The new drawing and gradient packages were installed with Expo's SDK-compatible installer.
