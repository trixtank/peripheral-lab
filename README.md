# Peripheral Lab

Peripheral Lab is a browser-based hardware testing app for checking common computer peripherals in one place.

It includes tests for:

- Microphone input
- Audio output and music playback
- Webcam preview
- Gamepad buttons, sticks, axes, and vibration
- Keyboard key detection
- Mouse buttons, wheel, and movement
- Internet speed sampling

## Features

- Light, dark, and system theme support
- Language selector
- Feedback popup with local text-file storage
- Real-time keyboard and mouse highlighting
- Gamepad visual tester with vibration controls
- Audio test tracks for bass balance, instrument separation, and soundstage
- Local speed test sampling for download and upload

## Tech Stack

- React
- Vite
- Lucide React icons
- Node.js static server with small API routes

## Run Locally

Install dependencies:

```bash
npm install
```

Start the Vite development server:

```bash
npm run dev
```

Or build and run the local production server:

```bash
npm run build
npm run serve
```

Then open:

```text
http://127.0.0.1:4173/
```

## Available Scripts

```bash
npm run dev
```

Starts the Vite development server.

```bash
npm run build
```

Builds the app into the `dist` folder.

```bash
npm run serve
```

Runs `server.cjs`, which serves the built app and handles local feedback and upload speed test requests.

## Notes

- Feedback is saved locally to `feedback.txt`.
- Browser permissions are required for microphone, webcam, audio device selection, and gamepad detection.
- Some browsers only expose certain audio devices after microphone or camera permission is granted.
- Gamepads usually appear after pressing a button on the controller.

## Deployment

This app can be hosted as a static React app, but the feedback and upload speed test endpoints need a small backend or serverless functions if hosted online.

Good hosting options include:

- Cloudflare Pages
- Vercel
- Netlify

For a simple first launch, deploy the Vite build output and then move the `server.cjs` API behavior into the hosting platform's serverless function format.
