# Gym Buddy

An Expo and React Native prototype for tracking meals, workouts, water, weight, and goal progress.

## Preview

1. Install Node.js 22.13 or newer and run `npm install`.
2. Run `npm run api` to start the account and meal-estimate server.
3. Run `npm start` (or `npm run web` for a browser preview).
4. Scan the Expo QR code with Expo Go on a phone to test the native app and camera.

## Accounts and first-time setup

Create an account with an email and a password of at least 10 characters. Setup asks for personal measurements, a fitness goal and schedule, training location, usual activity, allergies, injuries or other concerns, and whether special dietary care applies. The profile is saved in the API server's SQLite database at `server/data/gym-buddy.sqlite` (override with `DATABASE_PATH`). Passwords are hashed with scrypt; server sessions last 90 days. A returning user with a valid saved session goes straight to Today. Signing in on another device retrieves the profile and skips setup. Daily logs remain on each device and are separated by account.

The app needs the API server to create an account, sign in, and save profile changes. Run `npm run api` on the development computer and keep the phone on the same Wi-Fi. Expo Go uses the computer's LAN address automatically when started in LAN mode. If you use Expo's tunnel mode, set `EXPO_PUBLIC_API_URL=http://YOUR_COMPUTER_LAN_IP:8787` in the app's ignored `.env.local` and restart Expo. The API listens on all local interfaces by default; set `HOST=127.0.0.1` to restrict it to this computer. Use a trusted private network for local development. Deploy the API behind HTTPS before using real personal or health details outside local development. Back up the SQLite database to retain account data.

## AI meal estimates

The app asks AI to estimate nutrition from one meal description and an optional photo. The user reviews the approximate values and assumptions before saving. Breakfast, lunch, and dinner each have one entry per day; saving another replaces that meal. Snacks can be logged repeatedly. Meal time is recorded.

Run `npm run api` in a second terminal. With no API key, the server uses a local Ollama `qwen3:4b-instruct` model for **description-only** estimates. This model is installed on the development computer; on another computer, install Ollama and pull that model first. For photo analysis, copy `.env.example` to `.env` and set `OPENAI_API_KEY` on the server. The key is never placed in the Expo app. The API sends only the submitted meal description and photo to the AI provider, not the user's profile.

The browser preview calls `http://localhost:8787` by default. Expo Go in LAN mode uses the Metro computer's address for the API. For a tunnel connection or a separately hosted API, set `EXPO_PUBLIC_API_URL` in an ignored `.env.local` file for Expo, then restart the app.

AI nutrition figures are estimates. Photos cannot reveal exact portions, cooking oil, or hidden allergens. The app keeps the user's description and the model's assumptions with each saved meal.

## Suggested targets

Birth date determines age and updates automatically, including at midnight while the app is open. For adults aged 20 or older with enough information, the app estimates resting energy with the Mifflin–St Jeor equation and applies an activity factor. It then uses a modest goal adjustment: −300 kcal for weight loss, +200 kcal for weight gain, or no adjustment for maintenance. BMI is displayed as context, not used to calculate energy.

Protein starts at 0.8–1.6 g/kg depending on activity and goal. Water shows an approximate **beverage** starting point of 2.2 L or 3.0 L based on the selected equation reference; food contributes additional water. These are guides, not fixed needs. Automatic targets pause for users under 20, special dietary care, or weight-loss goals at a low BMI. The app does not prescribe targets for pregnancy, breastfeeding, or a medical condition needing a special diet.

## Data and checks

Logs are stored on the device with AsyncStorage, scoped by account. Profile details are stored on the account server and cached on the device. Meal photos are used only for the current estimate and are not saved with the meal. Run `npm test`, `npx expo lint`, and `npx tsc --noEmit` for checks.

## Android and iOS builds

The shared app targets both Android and iOS. Once signed in to an Expo account, use `npx eas-cli@latest build --platform all --profile preview` for installable test builds or `npx eas-cli@latest build --platform all --profile production` for store builds. EAS will ask for the Android package name, iOS bundle identifier, and signing credentials on first setup. The `preview` profile produces an Android APK and an internally distributed iOS build; the `production` profile produces an Android App Bundle and an iOS store build.
