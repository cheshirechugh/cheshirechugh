# Mood

A minimal, non-verbal mood tracker.

- **Log:** drag the slider from red to green and tap ✓. Each entry is timestamped.
- **History:** a timeline chart (dots per entry plus a daily-average line), a calendar of daily averages, and a list of recent entries. Switch between 7 days, 30 days, 1 year or everything.

Data stays on your device. In the iPhone app it is kept in native storage; in a browser, in `localStorage`.

## Layout

- `www/` – the app itself (plain HTML/CSS/JS, no build step)
- `ios/` – native iPhone wrapper (Capacitor), opened in Xcode

## iPhone app

Needs a Mac with Xcode 16 or newer and Node.js.

```sh
npm install
npx cap sync ios      # copies www/ into the Xcode project
npx cap open ios      # opens Xcode
```

In Xcode:

1. Select the **App** target → **Signing & Capabilities** → choose your **Team** (a free personal Apple ID works). If Xcode says the bundle ID is taken, change it to something unique, e.g. `com.yourname.mood`.
2. Plug in your iPhone, select it as the run destination at the top, and press **Run** (⌘R).
3. First time only, on the iPhone: **Settings → General → VPN & Device Management** → trust your developer certificate. Also enable **Settings → Privacy & Security → Developer Mode** if asked.

With a free Apple ID the app expires after 7 days and must be re-run from Xcode; a paid Apple Developer account removes that limit and allows TestFlight / App Store.

After changing anything in `www/`, run `npx cap sync ios` again before building.

## Web version

```sh
npm run serve         # http://localhost:8000
```

It also works as an installable PWA when hosted on any static host (e.g. GitHub Pages, serving the `www/` folder).
