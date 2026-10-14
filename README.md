# Gym Buddy

A standalone Expo and React Native app for tracking meals, workouts, water, weight, and goal progress.

## Preview

1. Install Node.js 22.13 or newer (Node.js 24 is used in CI) and run `npm ci`.
2. Run `npm start` (or `npm run web` for a browser preview).
3. Scan the Expo QR code with Expo Go on a phone to test the native app and camera.

No Gym Buddy API server or `EXPO_PUBLIC_API_URL` is needed. Installed preview APKs run without Expo Go, Metro, or a computer.

## Device setup and storage

Choose OpenAI, Claude, or Gemini and enter your own API key. Tap **Verify API key**, then **Continue on this device**. Verification makes a small billable request directly to the selected provider. There is no email/password account or remote sign-in. Setup asks for measurements, goals, preferences and health context, then generates a seven-day plan and nutrition preview for approval.

The profile, approved plan, reviews and activity are stored on this device using AsyncStorage. Native API keys are stored separately using Expo SecureStore (Android Keystore / iOS Keychain), and sent only to the selected AI provider over HTTPS. No developer key is embedded in the app. Browser previews keep keys in memory only and require re-entry after reload; provider CORS policies may restrict direct browser requests. Use Android/iOS to test the complete native flow.

After setup, reopening the app and reading/logging activity work without internet. AI verification, planning, chat, reviews and meal estimates require internet and an active provider key with available quota. **Disconnect AI key** removes the stored key and returns to setup, keeping saved data. Reconnecting resumes the same local profile. **Delete device data** removes the local profile, plans, reviews, key and activity.

Data does not sync between phones, and there is no remote account recovery. Clearing app storage or uninstalling on Android removes local data. Existing server accounts and their account-scoped logs are not automatically imported into the new device profile; the legacy server database and old local storage are left untouched.

## AI provider and meal estimates

The app asks AI to estimate nutrition from one meal description and an optional photo. The user reviews the approximate values and assumptions before saving. Breakfast, lunch, and dinner each have one entry per day; saving another replaces that meal. Snacks can be logged repeatedly. Meal time is recorded.

Photo analysis first checks for identifiable food or a drink. A no-meal result returns a clear message and cannot be saved as a meal; the model must not invent food from a description when the photo is unrelated. For valid meals, the prompt asks for each visible food's estimated cooked/served weight, visible fruits/vegetables, likely preparation, retained oil/fats, and home/restaurant context where supported. The user's quantities add context and foods are counted only once across photo and description. The reviewable breakdown is returned in assumptions and saved with the meal alongside combined nutrition totals. Hidden ingredients, oil and serving sizes remain estimates, and appearance alone does not establish home/restaurant origin.

Enter your chosen provider key during device setup. The same provider is used for chat and text/photo meal estimates. Replace the provider and key on the You tab. The app calls the provider directly; no separately deployed Gym Buddy service is used.

The app selects models by task. Gemini uses Flash Lite for key verification and text/photo meals, and Flash for plans and progress reviews:

| Task | OpenAI | Claude | Gemini |
| --- | --- | --- | --- |
| Key verification | `gpt-6-luna` | `claude-haiku-5-5` | `gemini-3.5-flash-lite` |
| Initial/revised profile and plan | `gpt-6.1-sol` | `claude-sonnet-5-5` | `gemini-3.8-flash` |
| Coach chat | `gpt-6-luna` | `claude-haiku-5-5` | `gemini-3.1-flash-lite` |
| Text meal estimate | `gpt-6-luna` | `claude-haiku-5-5` | `gemini-3.5-flash-lite` |
| Meal estimate with a photo | `gpt-6.1-sol` | `claude-sonnet-5-5` | `gemini-3.5-flash-lite` |
| Weekly/monthly reviews | `gpt-6.1-sol` | `claude-sonnet-5-5` | `gemini-3.8-flash` |

The bundled defaults live in `shared/ai/ai-policy.mjs`; rebuild the app after changing them. Photo and text meals use separate task policies. Chat-requested revisions use the chat model to detect the action, then the planning model to generate an approval preview. Approving previews and reading saved reviews do not call AI again.

Only the selected provider and the user's verified key are used. The retained legacy server supports its existing environment overrides for compatibility tests; those settings are not mobile build configuration.

OpenAI uses no reasoning for Luna routine tasks, medium effort for planning, and low effort for other stronger tasks. Claude uses low effort for routine tasks and medium effort for stronger tasks. Effort parameters are added only for known compatible models, so legacy/custom overrides do not receive unsupported settings. Task-specific output limits include reasoning where the provider counts it; partial output and refusals return recoverable errors rather than invalid JSON. OpenAI photo requests use high detail to retain food/portion information. Retries are bounded to three attempts and the original deadline, respect `Retry-After`, and skip rejected keys, invalid requests, and recognizable permanent quota errors. Claude overloads (`529`) are retryable. Gemini's existing schema fallback remains within that same deadline and preserves its output limit.

The app sends meal descriptions/photos, relevant profile details, conversation messages and app context directly to the chosen provider for the requested AI feature. Provider usage is billed to the user's key. Keys are never included in saved profiles, logs, reviews, or returned feature results.

See [model selection and validation notes](docs/ai-model-routing.md) for the pricing comparison, output budgets, and test scope.

Onboarding sends the entered profile to the selected provider to generate a weekly plan. The app validates the day structure and bounds the returned numbers; a light, moderate, or aggressive pace changes the permitted calorie range, while recovery is still required. For users under 20, users needing special dietary care, those skipping the metabolic equation, or weight loss at a low BMI, the app pauses personal calorie and drink targets. These are starting estimates, not measured deficits or medical prescriptions. In chat, requests to revise a plan or review nutrition create an approval preview; approval saves the exact validated proposal without a second AI call.

History lets you jump to any past date, add missing meals, workouts, weigh-ins, water, or steps, and edit or delete existing entries. Today prioritizes the current session, quick check-ins, and daily guides. Progress brings together consistency, 7-day and 30-day charts for steps, hydration, food energy, training time, and recorded weigh-ins, with a Daily history view for editing entries. Chart averages use days with entries; gaps remain unknown. Profile details are read-only until you confirm an edit; generating a preview leaves the saved profile unchanged, and approval saves the proposed profile and plan together.

Weekly reviews cover consecutive 7-day periods from setup; monthly reviews cover anniversaries of the setup date. After each period ends, the app creates one AI review the next time it is open online and stores it on the device runtime. Older saved reviews can be opened without another AI call, and coach chat can use them when asked about historical progress. Daily logs remain device-local, so a review summarizes entries available on the device that generated it. Editing an old entry changes charts but does not rewrite an already saved review.

The browser and native app both use the device runtime. No local API URL or LAN discovery is used.

AI nutrition figures are estimates. Photos cannot reveal exact portions, cooking oil, or hidden allergens. The app keeps the user's description and the model's assumptions with each saved meal.

## Plan-based workout logging

Training sessions are labeled Day 1, Day 2, and so on, excluding recovery days. Select any session in Log → Workout, or use **Log this session** from the Plan tab. New plans supply structured exercises; existing text-based plans also load without regeneration.

Choose the details you have for each exercise: reps, weight, time, speed or incline. Selecting reps includes sets. Weight is optional, including for squats and timed holds. Time can be entered in seconds or minutes; switching units preserves the duration. Walking supports time, speed in km/h and incline in degrees. Cycling supports time and speed; running records time. Speed is offered only for walking and cycling, and incline only for walking. When Weight is selected, check **Individual weights in each hand** to enter separate Left hand and Right hand kg values for every set. Leave it unchecked for one shared total load (including a barbell) or selected machine stack weight. The hand values are stored and displayed separately in history and editing; the app never guesses or doubles them. Add or remove sets or intervals, add extra exercises, or skip an exercise for this session. Skipped exercises are excluded from the saved workout and can be restored before saving. Switching training days asks before clearing entered exercise values; switching log categories keeps the current workout draft while the screen remains mounted.

**Change exercise** and **Add an exercise** open a searchable dropdown of exercises from every plan day, remembered choices and prior workouts. Selecting a listed exercise does not call AI. **Not present in the dropdown** enables a description and calls the selected AI provider directly using the locally stored key and text-meal model policy. The full exercise list accompanies the description so AI can reuse an existing exercise. Review the suggested name before applying it; confirmed new exercises join the device-local library for future selection. Ambiguous descriptions show a possible match and missing details. Walking, treadmill walking and cooldown/post-workout walks share one Walking entry; running variants share Running and cycling/bicycling variants share Cycling. The same rules are included in plan generation and enforced when plans are normalized. The performed name, original exercise, description and selected measurements are saved together on the device, visible in Daily history, and editable there.

## Suggested targets

Birth date determines age and updates automatically, including at midnight while the app is open. For adults aged 20 or older with enough information, the app estimates resting energy with the Mifflin–St Jeor equation and applies an activity factor. It then uses a modest goal adjustment: −300 kcal for weight loss, +200 kcal for weight gain, or no adjustment for maintenance. BMI is displayed as context, not used to calculate energy.

Protein starts at 0.8–1.6 g/kg depending on activity and goal. Water shows an approximate **beverage** starting point of 2.2 L or 3.0 L based on the selected equation reference; food contributes additional water. These are guides, not fixed needs. Automatic targets pause for users under 20, special dietary care, or weight-loss goals at a low BMI. The app does not prescribe targets for pregnancy, breastfeeding, or a medical condition needing a special diet.

## Data and checks

Logs, profile details, approved plans and reviews are stored locally. Meal photos are used for the current estimate and are not saved with the meal. Failed reads preserve the saved data and offer retry. Failed activity saves show a retry button; failed profile saves leave the approved data unchanged and the preview available to retry.

Run `npm run check` for lint (zero warnings), typecheck, and tests. Run `npm run export` to check web, Android, and iOS bundling, and `npx expo-doctor` for SDK/config checks. CI runs these checks on pushes and pull requests. HTTP tests use an in-memory database and mocked AI providers; they never use your saved accounts or paid provider keys.

## Standalone Android APK

The existing `preview` EAS profile produces a signed release APK with JavaScript, fonts, images, validation and AI workflows bundled inside it. Use Node.js 22.13+ and an Expo account:

```powershell
npx eas-cli@latest login
npx eas-cli@latest build:configure --platform android
npx eas-cli@latest build --platform android --profile preview
```

On first setup, create/link the EAS project, choose a stable Android package identifier such as `com.subash.gymbuddy`, and let EAS generate/manage the Android signing keystore. Preserve the existing `preview` profile in `eas.json` (`distribution: internal`, `android.buildType: apk`). No API URL, server secrets or user API key needs to be configured in EAS.

Open the completed build's download link on your phone, download the APK, allow installation from that browser/file manager if Android asks, then install and open Gym Buddy. Choose a provider, enter/verify your own key, complete setup and approve your plan. Your computer can be switched off. To test later changes, rebuild with the same profile and install the new APK over the old version using the same package and signing key.

The `production` profile creates an Android App Bundle for Google Play, which cannot be installed directly as an APK. EAS performs the native build/signing in the cloud; Android Studio is not required. An export/bundle check is not an APK build, and phone installation still needs to be tested on a real device.

## Legacy server

`server/` and its HTTP/account tests remain as compatibility fixtures. The app imports only `shared/device-runtime.mjs` and platform-neutral `shared/ai/` workflows; it does not import or start the Node server, SQLite server database, or Node crypto modules. `npm run api` is optional for legacy development and is never needed by the standalone app. `.env.example` documents only that legacy server's settings.

## UI redesign

The Kinetic design uses Gold / Night surfaces, gold actions, neutral metric colors, a bundled Space Grotesk heading font, and restrained glass gradients. See [design notes](docs/ui-redesign.md) for the screen map, research, analytics semantics, and validation status.

All displayed dates use `dd-mm-yyyy`; saved dates stay ISO. Shared Gold / Night calendar and time dialogs work across platforms. Macro panels compare intake with saved daily targets and upper limits, including separate added sugar and saturated fat. Legacy plans retain labeled general references until the user requests a nutrition review. Total sugar has no invented universal target.

## Personalized nutrition guides

The selected AI provider proposes nutrition during onboarding, explicit profile edits, and coach-requested reviews. The app validates finite values, bounds general adult suggestions, and reconciles protein/carbohydrate/fat energy with the approved calorie guide. AI estimates, adjusted estimates, clinician-entered values, targets and upper limits have distinct labels. Approved guides are saved on the device and reused across Today, Plan, Profile, meal logging, history and coach context; they are not regenerated daily.

Structured health conditions include diabetes, high cholesterol, kidney disease and other dietary medical needs. Optional clinician-provided values are entered by the user; the app does not verify their provenance. They take priority over AI and are never silently adjusted. For diabetes, kidney disease, special dietary care and other sensitive medical contexts, missing numeric targets show **clinician guidance needed**. Partial clinician macro plans do not receive invented complementary macros. General saturated-fat ceilings use 6% of energy for high cholesterol, versus 10% otherwise, pending individual clinician advice. Total sugar and added sugar are different measurements; added sugar does not cover all WHO free sugars.

New meal estimates include added sugar and saturated fat only when supported by the meal description/photo. Missing values remain unknown, including in daily totals when any meal lacks them; historical meals are not backfilled with zero. A four-week interval or at least 5% weight change prompts an explicit review. Changing health conditions or clinician values requires a new profile-and-plan preview. Previews expire after ten minutes, are device-session-bound and single-use, and become invalid if the saved profile or plan changes. Restarting the app discards pending previews. Rejection or leaving the preview makes no saved profile or plan change.

Reference bounds use the [National Academies adult macro distribution ranges](https://www.ncbi.nlm.nih.gov/books/NBK610333/), [EFSA fibre reference](https://www.efsa.europa.eu/en/press/news/nda100326), [FDA added-sugar information](https://www.fda.gov/food/nutrition-facts-label/added-sugars-nutrition-facts-label), and [AHA saturated-fat guidance](https://www.heart.org/en/healthy-living/healthy-eating/eat-smart/fats/saturated-fats). These are general guardrails, not disease treatment recommendations. The fibre upper bound of 40 g is an app suggestion bound, not a tolerable upper intake limit. The app does not invent micronutrient or supplement prescriptions.

Nutrition logic changes require rebuilding/updating the app. Existing device profiles can use **Review with AI coach** to generate and approve updated guides.