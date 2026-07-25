# HireFlow Browser Extension

Save jobs, analyze matches, and generate cover letters from any job site directly into HireFlow.

## Installation

### Development

```bash
cd apps/browser-extension
npm install
npm run build
```

### Load in Chrome

1. Open `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the `apps/browser-extension/dist/` folder

### Load in Edge

1. Open `edge://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `apps/browser-extension/dist/` folder

## Supported Websites

| Website | Detection | Auto-detect |
|---------|-----------|-------------|
| LinkedIn Jobs | ✅ | Title, company, location, salary |
| Indeed | ✅ | Title, company, location |
| Glassdoor | ✅ | Title, company, location |
| Greenhouse | ✅ | Title, company, location |
| Lever | ✅ | Title, company, location |
| Ashby | ✅ | Title, company |
| Wellfound | ✅ | Title, company |
| RemoteOK | ✅ | Title, company, salary |
| Remotive | ✅ | Title, company |

## Features

### One-Click Job Save
- Auto-detects job details on supported sites
- Floating "Save to HireFlow" button appears on job pages
- Prevents duplicate saves
- Works offline (queues and syncs later)

### Resume Match Analysis
- Uses your saved resume to analyze match percentage
- Shows missing skills and suggested improvements

### Cover Letter Generation
- AI-powered cover letter from job description
- Copy to clipboard or save to HireFlow

### Duplicate Detection
- Checks URL, company, and title before saving
- Never creates duplicates

### Context Menu
- Right-click anywhere → "Save to HireFlow"
- Quick access to HireFlow Dashboard

### Offline Support
- Queues actions when offline
- Automatically syncs when connection returns

## Authentication

1. Click "Sign In" in the popup
2. Complete login on HireFlow
3. Extension receives secure session token
4. Tokens are stored locally and refreshed

## Building for Production

```bash
npm run build
```

The `dist/` folder contains the production build.

### Chrome Web Store

1. Zip the `dist/` folder
2. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
3. Upload the zip
4. Fill in store listing
5. Submit for review

### Microsoft Edge Add-ons

1. Zip the `dist/` folder
2. Go to [Microsoft Partner Center](https://partner.microsoft.com/dashboard/microsoftedge/store/publish/overview)
3. Upload the zip
4. Fill in store listing
5. Submit for review

## Architecture

```
src/
├── background/
│   └── service-worker.ts    # Background tasks, messaging, context menus
├── content/
│   ├── index.ts             # Floating action button, popup injection
│   └── detectors/
│       └── index.ts         # Job detection for each website
├── popup/
│   ├── Popup.tsx            # Main popup UI
│   ├── index.html           # Popup entry point
│   └── main.tsx             # React entry
└── shared/
    ├── types.ts             # TypeScript interfaces
    └── api.ts               # API client, auth, offline queue
```

## Privacy

- Only runs on supported job websites
- Stores only short-lived auth tokens locally
- No tracking or analytics
- All job data goes through HireFlow's authenticated API
- Never exposes API keys

## Adding Support for New Websites

1. Open `src/content/detectors/index.ts`
2. Add a new detector:
```ts
{
  id: "newsite",
  name: "NewSite",
  patterns: [/newsite\.com/i],
  detect() {
    const title = document.querySelector("h1")?.textContent ?? "";
    const company = document.querySelector(".company")?.textContent ?? "";
    // ... extract other fields
    return { title, company, ... };
  },
}
```
3. Add the URL to `manifest.json` host_permissions and content_scripts matches
4. Rebuild
