# Gym Buddy / Kinetic

The redesign makes the next useful action easy to find and gives progress its own destination. It retains account setup, AI provider verification, profile editing, meal estimates, manual logs, history editing, plan approval, and saved reviews.

## Visual system

- Gold / Night palette from the supplied references: gold `#FCA311`, night navy `#14213D`, near-black `#05070C`, charcoal surfaces, white text and neutral supporting colors.
- Gold for primary actions, training and steps; pale gold for nutrition; white and gray for supporting metrics. Warm gold and navy gradients preserve the existing glass treatment.
- Bundled, licensed Space Grotesk Bold for headings and prominent numbers; platform-native body text.
- Glass is expressed through translucent surfaces, fine borders, and subtle gradients. Broad background blur is deliberately avoided to keep charts readable and scrolling inexpensive across platforms.
- The same forward-motion brand mark appears in the app, app icon, splash image, Android adaptive icon, monochrome icon, and favicon. `assets/images/brand-mark.svg` is the scalable source.
- Existing reduced-motion support remains active. Inputs have a focus border; web keyboard navigation has visible focus outlines.

## Screen map

| Destination | Primary purpose |
| --- | --- |
| Today | Today's session, five quick logs (meal, workout, water, weight, steps), energy guide, four daily metrics, coaching, recent activity |
| Plan | Training direction, seven-day selector, expandable sessions, guides, plan context |
| Log | Five explicit log types, optional date adjustment, entry form, inline validation and save feedback |
| Progress | Seven-day consistency, training totals, weight change, selectable 7D/30D charts, AI reviews |
| Progress / Daily history | Date selection, daily summary, chronological entries, editing |
| Profile | Identity and direction, expandable personal details, guides, AI configuration, account actions |
| Coach | Suggested starting prompts, conversation, existing explicit approvals for changes |

A persistent gold **AI Coach** button sits above the bottom navigation on every main tab, hides while the native keyboard is open, and opens the existing coach conversation. Content has bottom spacing so its final controls can scroll clear of the button.

Quick-log links carry a fresh entry context. Reopening a shortcut uses its requested log type and date rather than retaining a previous manual selection. Existing drafts are preserved.

## Analytics semantics

Charts show actual manual logs. Empty periods display an invitation to check in, not fabricated activity. Missing entries remain gaps. Averages are calculated over days with entries and labeled per logged day; they do not imply that unlogged nutrition days had zero intake. A recorded zero is distinct from a missing record.

Weight charts use actual weigh-ins, not the previous weight carried forward in daily summaries. The line connects recorded measurements. The 30-day change compares the earliest and latest dates with a weigh-in in that window, using the latest stored measurement for each date. It needs at least two dates. Consistency counts days with any nutrition, training, hydration, steps, or weigh-in entry; it is not a health or readiness score.

Charts have labeled axes, metric units, date labels, point inspection, and previous/next-day controls. Three regression tests cover unknown days, carried-forward weight, and explicit zeros.

## Research informing the direction

[Hevy's feature overview](https://www.hevyapp.com/features/) foregrounds workout logging and progress tracking. [Fitbod's exercise history and records update](https://fitbod.me/blog/exercise-history-and-records/) emphasizes making historical performance and milestones useful. The design inference here is to keep training and logging close to the home screen while making progress a permanent navigation destination.

Implementation references: [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/), [Expo documentation index](https://docs.expo.dev/llms.txt), [Router tabs](https://docs.expo.dev/router/advanced/tabs/), [LinearGradient](https://docs.expo.dev/versions/v57.0.0/sdk/linear-gradient/), [SVG](https://docs.expo.dev/versions/v57.0.0/sdk/svg/), [Fonts](https://docs.expo.dev/versions/v57.0.0/sdk/font/), and [Symbols](https://docs.expo.dev/versions/v57.0.0/sdk/symbols/).

## Verification

Lint and TypeScript pass. All 42 automated tests pass. Expo exports JavaScript/Hermes bundles for web, iOS, and Android; this checks bundling, not signed installable builds. The raster app icon was visually inspected.

The browser tool reported no available browsers, so screen-level visual QA and device interaction testing could not be performed in this session. Before V1 release, verify small-phone layouts, large accessibility text, keyboard behavior, Android/iOS date pickers, chart selection, and all logging/approval flows on actual devices. These checks remain outstanding.

Run `npm run api` and `npm start` for a device preview, or `npm run web` for the browser preview. The new drawing and gradient packages were installed with Expo's SDK-compatible installer.

## Macro guides, dates, and motion

Nutrition panels share one consumed / daily-guide component, including Today, selected-day summaries, meal estimates, Plan, and Profile. The history timeline compares each meal with the daily guide and labels that context explicitly. Protein keeps the approved plan guide. Carbohydrate ranges use 45-60% of daily energy at 4 kcal/g; fat ranges use 20-35% at 9 kcal/g; the adult fibre reference is 25 g/day. These references remain as a labeled fallback for legacy plans. New plans persist validated AI nutrition guides with source, target/limit kind, rationale and review metadata. Clinician-entered values override AI; sensitive medical contexts leave missing guides marked for clinician input. Separate added sugar and saturated fat preserve unknown values from older logs. Profile and onboarding changes require preview and approval.

The references come from [EFSA's dietary reference values](https://www.efsa.europa.eu/en/press/news/nda100326), supported by its [summary report](https://www.efsa.europa.eu/sites/default/files/2017_09_DRVs_summary_report.pdf). The app logs total sugar, which includes naturally occurring sugars. It displays a missing guide rather than treating a free/added-sugar limit as a total-sugar target; see [EFSA's sugar assessment](https://www.efsa.europa.eu/en/plain-language-summary/tolerable-upper-intake-level-dietary-sugars).

All structured dates display as DD-MM-YYYY, including picker fields, chart labels, history, profile birth dates, notices, review periods, and coach change proposals. Dates embedded in coach/review text are also formatted for display. Storage, IDs, date comparisons, and API parameters remain ISO. Calendar and time dialogs share the Gold / Night surface across Android, iOS, and web, with direct date entry, bounded calendar navigation, 24-hour time controls, cancel/apply actions, and Android-back dismissal. Native OS picker dialogs are no longer used.

Navigation receives an explicit dark theme at the root and dark tab-scene backgrounds. Tab changes crossfade over 280 ms; stack navigation uses a fade with a short upward movement. Content begins visible and never resets to invisible on tab revisits. Reduced-motion preferences disable transitions. Runtime smoothness and keyboard/accessibility behavior still require device confirmation because the available browser inventory is empty.

Personalized-nutrition validation: 51 automated tests pass, including HTTP onboarding/profile previews, account-bound approvals, persisted guides, no extra AI call on approval, and authoritative coach context. Typecheck and Expo lint pass. Native device QA remains outstanding.

Macro presentation groups saturated fat under Total fat and added sugar under Total sugar. Both appear as smaller, expandable Includes details with their consumed / limit values and an explicit already-included explanation. The five main nutrient rows stay visible. Approval previews expand a subset when its guide changes, so a revised limit is visible during review. Meal timelines expose the same grouped breakdown through a Meal nutrition disclosure. Tracking, totals and saved guides retain all seven measurements without double counting.
