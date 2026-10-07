# Gym Buddy

An Expo and React Native prototype for tracking meals, workouts, water, weight, and goal progress.

## Preview

1. Install Node.js and run `npm install`.
2. Run `npm start` (or `npm run web` for a browser preview).
3. Scan the Expo QR code with Expo Go on a phone to test the native app and camera.

## AI meal estimates

The app asks AI to estimate nutrition from one meal description and an optional photo. The user reviews the approximate values and assumptions before saving. Breakfast, lunch, and dinner each have one entry per day; saving another replaces that meal. Snacks can be logged repeatedly. Meal time is recorded.

Run `npm run api` in a second terminal. With no API key, the server uses a local Ollama `qwen3:4b-instruct` model for **description-only** estimates. This model is installed on the development computer; on another computer, install Ollama and pull that model first. For photo analysis, copy `.env.example` to `.env` and set `OPENAI_API_KEY` on the server. The key is never placed in the Expo app. The API sends only the submitted meal description and photo to the AI provider, not the user's profile.

The browser preview calls `http://localhost:8787` by default. For Expo Go on a physical phone, set `HOST=0.0.0.0` in the API server's `.env` and `EXPO_PUBLIC_API_URL=http://YOUR_COMPUTER_LAN_IP:8787` in an ignored `.env.local` file for Expo, then restart both processes. Use this only on a trusted private network during development.

AI nutrition figures are estimates. Photos cannot reveal exact portions, cooking oil, or hidden allergens. The app keeps the user's description and the model's assumptions with each saved meal.

## Suggested targets

Birth date determines age and updates automatically, including at midnight while the app is open. For adults aged 20 or older with enough information, the app estimates resting energy with the Mifflin–St Jeor equation and applies an activity factor. It then uses a modest goal adjustment: −300 kcal for weight loss, +200 kcal for weight gain, or no adjustment for maintenance. BMI is displayed as context, not used to calculate energy.

Protein starts at 0.8–1.6 g/kg depending on activity and goal. Water shows an approximate **beverage** starting point of 2.2 L or 3.0 L based on the selected equation reference; food contributes additional water. These are guides, not fixed needs. Automatic targets pause for users under 20, special dietary care, or weight-loss goals at a low BMI. The app does not prescribe targets for pregnancy, breastfeeding, or a medical condition needing a special diet.

## Data and checks

Logs and profile data are stored on the device with AsyncStorage. Meal photos are used only for the current estimate and are not saved with the meal. Run `npm test` for the birthday, target, and meal-category rules; run `npx tsc --noEmit` for type checking.
