# Mood

A minimal, non-verbal mood tracker.

- **Log:** drag the slider from red to green and tap ✓. Each entry is timestamped.
- **History:** a timeline chart (dots per entry plus a daily-average line), a calendar of daily averages, and a list of recent entries. Switch between 7 days, 30 days, 1 year or everything.

Data is stored only on your device, in the browser's `localStorage`. Nothing is sent anywhere.

## Run

It's a static site with no build step:

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

It is installable as a PWA ("Add to Home Screen") and works offline once loaded. To use it on your phone, host it anywhere static, e.g. GitHub Pages.
