# Gym Buddy

An Expo and React Native prototype for tracking meals, workouts, water, weight, and goal progress.

## Preview

1. Install Node.js 22.13 or newer and run `npm install`.
2. Run `npm run api` to start the account and meal-estimate server.
3. Run `npm start` (or `npm run web` for a browser preview).
4. Scan the Expo QR code with Expo Go on a phone to test the native app and camera.

## Accounts and first-time setup

Create an account with an email and a password of at least 10 characters. The second login step asks for an OpenAI, Claude, or Gemini API key. Tap **Verify API key** to make a small provider request; account creation and sign-in remain disabled until it succeeds. Setup then asks for personal measurements, a fitness goal, training location, usual activity, requested training days (1–7), preferred pace, optional existing workout schedule, allergies, injuries or other concerns, and whether special dietary care applies. AI reviews these details and creates a preview of the seven-day plan and nutrition guides. The user reviews and approves this preview before anything is saved. If a schedule was supplied, it organizes that schedule into days. The profile, plan, and encrypted AI key are saved in the API server's SQLite database at `server/data/gym-buddy.sqlite` (override with `DATABASE_PATH`). Passwords are hashed with scrypt; server sessions last 90 days. A returning user with a valid saved session goes straight to Today. Signing in on another device retrieves the profile, plan, and AI provider setting. Daily logs remain on each device and are separated by account.

The app needs the API server to create an account, sign in, and save profile changes. Run `npm run api` on the development computer and keep the phone on the same Wi-Fi. Expo Go uses the computer's LAN address automatically when started in LAN mode. If you use Expo's tunnel mode, set `EXPO_PUBLIC_API_URL=http://YOUR_COMPUTER_LAN_IP:8787` in the app's ignored `.env.local` and restart Expo. The API listens on all local interfaces by default; set `HOST=127.0.0.1` to restrict it to this computer. Use a trusted private network for local development. Deploy the API behind HTTPS before using real personal or health details outside local development. Back up the SQLite database to retain account data.

## AI provider and meal estimates

The app asks AI to estimate nutrition from one meal description and an optional photo. The user reviews the approximate values and assumptions before saving. Breakfast, lunch, and dinner each have one entry per day; saving another replaces that meal. Snacks can be logged repeatedly. Meal time is recorded.

Run `npm run api` in a second terminal. Enter your chosen provider's key during sign in or account creation. The same provider is used for chat and for text or photo meal estimates. You can replace the provider and key on the You tab. Keys are sent to the Gym Buddy API over the configured connection, encrypted at rest by the API, and never returned to the app. The local API creates a separate ignored encryption key file beside the database unless `AI_KEY_ENCRYPTION_SECRET` is set. Keep that file or environment secret when backing up the database; losing it makes saved AI keys unreadable. Use HTTPS when connecting to an API outside a trusted local network.

OpenAI and Claude default to `gpt-4o-mini` and `claude-haiku-5-5`, configurable with `OPENAI_MODEL` and `CLAUDE_MODEL`. For a Gemini API key, verification uses `gemma-4-26b-a4b-it`, initial and revised plans use `gemini-3.8-flash`, coach chat uses `gemma-4-31b-it`, text or photo meal estimates use `gemini-3.5-flash-lite`, and progress reviews use `gemini-3.8-flash`. Override these with `GEMINI_VERIFICATION_MODEL`, `GEMINI_PLANNING_MODEL`, `GEMINI_CHAT_MODEL`, `GEMINI_MEAL_MODEL`, and `GEMINI_REVIEW_MODEL` on the API server. The former `GEMINI_MODEL` setting remains a fallback for planning if `GEMINI_PLANNING_MODEL` is unset. The API sends meal descriptions and photos to the chosen provider. Chat also sends recent conversation messages and the app context displayed in chat.

Onboarding sends the entered profile to the selected provider to generate a weekly plan. The server validates the day structure and bounds the returned numbers; a light, moderate, or aggressive pace changes the permitted calorie range, while recovery is still required. For users under 20, users needing special dietary care, those skipping the metabolic equation, or weight loss at a low BMI, the app pauses personal calorie and drink targets. These are starting estimates, not measured deficits or medical prescriptions. In chat, requests to revise a plan or review nutrition create an approval preview; approval saves the exact validated proposal without a second AI call.

History lets you jump to any past date, add missing meals, workouts, weigh-ins, water, or steps, and edit or delete existing entries. Today prioritizes the current session, quick check-ins, and daily guides. Progress brings together consistency, 7-day and 30-day charts for steps, hydration, food energy, training time, and recorded weigh-ins, with a Daily history view for editing entries. Chart averages use days with entries; gaps remain unknown. Profile details are read-only until you confirm an edit; generating a preview leaves the saved profile unchanged, and approval saves the proposed profile and plan together.

Weekly reviews cover consecutive 7-day periods from setup; monthly reviews cover anniversaries of the setup date. After each period ends, the app creates one AI review the next time it is open online and stores it on the account server. Older saved reviews can be opened without another AI call, and coach chat can use them when asked about historical progress. Daily logs remain device-local, so a review summarizes entries available on the device that generated it. Editing an old entry changes charts but does not rewrite an already saved review.

The browser preview calls `http://localhost:8787` by default. Expo Go in LAN mode uses the Metro computer's address for the API. For a tunnel connection or a separately hosted API, set `EXPO_PUBLIC_API_URL` in an ignored `.env.local` file for Expo, then restart the app.

AI nutrition figures are estimates. Photos cannot reveal exact portions, cooking oil, or hidden allergens. The app keeps the user's description and the model's assumptions with each saved meal.

## Suggested targets

Birth date determines age and updates automatically, including at midnight while the app is open. For adults aged 20 or older with enough information, the app estimates resting energy with the Mifflin–St Jeor equation and applies an activity factor. It then uses a modest goal adjustment: −300 kcal for weight loss, +200 kcal for weight gain, or no adjustment for maintenance. BMI is displayed as context, not used to calculate energy.

Protein starts at 0.8–1.6 g/kg depending on activity and goal. Water shows an approximate **beverage** starting point of 2.2 L or 3.0 L based on the selected equation reference; food contributes additional water. These are guides, not fixed needs. Automatic targets pause for users under 20, special dietary care, or weight-loss goals at a low BMI. The app does not prescribe targets for pregnancy, breastfeeding, or a medical condition needing a special diet.

## Data and checks

Logs are stored on the device with AsyncStorage, scoped by account. Profile details are stored on the account server and cached on the device. Meal photos are used only for the current estimate and are not saved with the meal. Run `npm test`, `npx expo lint`, and `npx tsc --noEmit` for checks.

## Android and iOS builds

The shared app targets both Android and iOS. Once signed in to an Expo account, use `npx eas-cli@latest build --platform all --profile preview` for installable test builds or `npx eas-cli@latest build --platform all --profile production` for store builds. EAS will ask for the Android package name, iOS bundle identifier, and signing credentials on first setup. The `preview` profile produces an Android APK and an internally distributed iOS build; the `production` profile produces an Android App Bundle and an iOS store build.

## UI redesign

The Kinetic design uses Gold / Night surfaces, gold actions, neutral metric colors, a bundled Space Grotesk heading font, and restrained glass gradients. See [design notes](docs/ui-redesign.md) for the screen map, research, analytics semantics, and validation status.

All displayed dates use `dd-mm-yyyy`; saved dates stay ISO. Shared Gold / Night calendar and time dialogs work across platforms. Macro panels compare intake with saved daily targets and upper limits, including separate added sugar and saturated fat. Legacy plans retain labeled general references until the user requests a nutrition review. Total sugar has no invented universal target.

## Personalized nutrition guides

The selected AI provider proposes nutrition during onboarding, explicit profile edits, and coach-requested reviews. The server validates finite values, bounds general adult suggestions, and reconciles protein/carbohydrate/fat energy with the approved calorie guide. AI estimates, adjusted estimates, clinician-entered values, targets and upper limits have distinct labels. Approved guides are saved with the account and reused across Today, Plan, Profile, meal logging, history and coach context; they are not regenerated daily.

Structured health conditions include diabetes, high cholesterol, kidney disease and other dietary medical needs. Optional clinician-provided values are entered by the user; the app does not verify their provenance. They take priority over AI and are never silently adjusted. For diabetes, kidney disease, special dietary care and other sensitive medical contexts, missing numeric targets show **clinician guidance needed**. Partial clinician macro plans do not receive invented complementary macros. General saturated-fat ceilings use 6% of energy for high cholesterol, versus 10% otherwise, pending individual clinician advice. Total sugar and added sugar are different measurements; added sugar does not cover all WHO free sugars.

New meal estimates include added sugar and saturated fat only when supported by the meal description/photo. Missing values remain unknown, including in daily totals when any meal lacks them; historical meals are not backfilled with zero. A four-week interval or at least 5% weight change prompts an explicit review. Changing health conditions or clinician values requires a new profile-and-plan preview. Previews expire after ten minutes, are account-bound and single-use, and become invalid if the saved profile or plan changes. Restarting the API discards pending previews. Rejection or leaving the preview makes no account change.

Reference bounds use the [National Academies adult macro distribution ranges](https://www.ncbi.nlm.nih.gov/books/NBK610333/), [EFSA fibre reference](https://www.efsa.europa.eu/en/press/news/nda100326), [FDA added-sugar information](https://www.fda.gov/food/nutrition-facts-label/added-sugars-nutrition-facts-label), and [AHA saturated-fat guidance](https://www.heart.org/en/healthy-living/healthy-eating/eat-smart/fats/saturated-fats). These are general guardrails, not disease treatment recommendations. The fibre upper bound of 40 g is an app suggestion bound, not a tolerable upper intake limit. The app does not invent micronutrient or supplement prescriptions.

Nutrition changes require restarting/updating both the API and app. Existing accounts can use **Review with AI coach** to generate and approve guides. Legacy direct-save onboarding/recompute/revise API endpoints return 409 to prevent bypassing the preview workflow.
