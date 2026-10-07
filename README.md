# Gym Buddy

A mobile fitness companion built with Expo and React Native. This is the first working prototype.

## Run it

1. Install Node.js LTS and the Expo Go app on your phone.
2. Run `npm install` and then `npm start` in this folder.
3. Scan the QR code with Expo Go. Your phone and computer should be on the same network.

You can also run `npm run web` for a browser preview. Test the camera on a physical phone.

## What works today

- Log meals with manually entered calories, protein, carbs, fat, fibre and sugar.
- Take or choose a meal photo and add portion or ingredient notes while logging.
- Log workouts, water and weight; view daily totals and history.
- Set a goal, workout location, daily targets, allergies and concerns.
- View a simple gym or home workout starter structure.
- Save entries locally on the device with AsyncStorage.

## Planned next

1. Connect a food composition database and add search, serving sizes and barcode entry.
2. Build meal photo analysis that proposes foods and portions for user confirmation. Photos alone cannot reliably identify hidden ingredients or exact amounts.
3. Add an AI coach behind a server API so provider keys remain off the phone. Ground suggestions in the user's logged data, preferences and safety boundaries.
4. Add account sync, export and deletion controls, then test on Android and iOS devices.

The current photo is a temporary reference in the logging form and is not uploaded or stored with the saved meal. AI meal analysis and chat are not connected yet. The starter plan is general fitness information, not injury treatment or a medical prescription.
