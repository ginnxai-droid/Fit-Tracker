# Fit Tracker

**A personal fitness and nutrition tracker that turns a 12-week fat-loss plan into a daily checklist.**

Fit Tracker tells you what to do today (meals, workouts, walks), scores how well you followed the plan, tracks your progress, and suggests specific adjustments when results stall. It runs in the browser and ships with Android and iOS app shells.

> **Disclaimer:** Fit Tracker is a habit and progress tracker, not a medical device. It does not diagnose conditions or advise on medication. Please consult a doctor for medical decisions.

---

## Why it exists

Most people already know they should eat more protein and move more. What they lack is a simple, timed routine they can follow and check off. Fit Tracker converts general advice into daily actions and gives feedback based on what you actually did, not generic motivation.

It was designed around desk-job routines (long commutes, late dinners) and Indian eating habits (phulka, dal, curd, paneer, sprouts), with regional diet options.

## Features

- **Daily checklist:** time-blocked actions for meals, workouts, walks, sleep and water
- **Meal plans with protein tracking:** quantity-aware meals and substitutions
- **Workout plans:** strength, mobility and walking routines, with exercise illustrations
- **Progress analytics:** charts for weight, waist, steps, protein and workout completion, with a goal trajectory
- **100-point daily score:** a quick read on how well you followed the plan
- **Weekly and 30-day reviews:** a rule-based adjustment engine that checks compliance first, then recommends specific changes if you plateau
- **Personalised profile intake:** goals, diet type and region, restrictions, lifestyle and routine timings
- **Data export:** download your data as JSON
- **Reminders:** post-meal walk notifications on Android

## Screens

Dashboard · Today · Meals · Workout · Progress · Review

## Tech stack

| Layer | Technology |
|---|---|
| App | Vanilla JavaScript (ES modules), HTML, CSS |
| Charts | Chart.js with the annotation plugin |
| Icons | Lucide |
| Storage | Browser `localStorage` (no account or server database) |
| Android | Native shell project in `fit-tracker-android/` |
| iOS | Native shell project in `fit-tracker-ios/` |
| Testing | Puppeteer end-to-end suite (`e2e_qa_test.js`) |
| Tooling | Python scripts for asset sync and exercise-image generation |

## Project structure

```
.
├── index.html / index.css      # App shell and styles
├── app.js                      # UI logic and screens
├── data.js                     # Data layer, defaults, localStorage CRUD
├── scoring.js                  # Daily score and adjustment engine
├── charts.js                   # Chart.js rendering
├── lib/                        # Bundled Chart.js and Lucide
├── exercise-images/            # Exercise illustrations
├── fit-tracker-android/        # Android project
├── fit-tracker-ios/            # iOS project
├── sync_assets.py              # Copies web assets into Android/iOS projects
├── generate_exercise_images.py # Generates exercise images
├── e2e_qa_test.js              # End-to-end tests
├── fit_tracker_prd.md          # Product requirements document
└── docs/superpowers/           # Design specs and implementation plans
```

## Getting started

### Run the web app

The app uses ES modules, so serve it over HTTP rather than opening the file directly:

```bash
git clone https://github.com/GinnxAI/Fit-Tracker.git
cd Fit-Tracker
python3 -m http.server 8080
# or: npx serve -l 8080
```

Then open <http://127.0.0.1:8080>.

### Run the tests

```bash
npm install
# with the app being served on http://127.0.0.1:8080
node e2e_qa_test.js
```

### Build the mobile apps

After changing any web file, sync the assets into the mobile projects:

```bash
python3 sync_assets.py
```

- **Android:** open `fit-tracker-android/` in Android Studio and run.
- **iOS:** open `fit-tracker-ios/FitTracker.xcodeproj` in Xcode and run.

Prebuilt APKs are included in the repo root for quick testing.

## Privacy

Your logs and profile are stored locally in your browser or app via `localStorage`. There is no account system or server-side database. Optional location-based features may contact external services. Because the app can hold health-related information, avoid sharing exported data publicly.

## Roadmap

- [ ] Optional AI weekly coach that reviews logged data and suggests next-week corrections, within safety guardrails (no diagnosis, no medication advice)
- [ ] Natural-language meal logging with protein estimates
- [ ] More regional meal libraries and substitutions
- [ ] Wearable step sync and reminders
- [ ] Make the end-to-end tests portable across machines
- [ ] Screenshots and a hosted demo

## Contributing

This project is early-stage and contributions are welcome. Open an issue to discuss a bug or idea, or submit a pull request. Good first areas: meal data, translations, tests and documentation.

## License

MIT. See the `LICENSE` file.
