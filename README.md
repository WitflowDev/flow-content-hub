# Flow Content Hub — Front-End Prototype V2

A self-contained interactive front-end for the Flow Content Hub, refined from the approved UI direction.

## What changed in V2

- Real Flow Productions logo included in the interface (`assets/flow-logo-black.png` / `flow-logo-white.png`), plus the source asset used to prepare the UI versions.
- Reworked spacing, typography, cards, filters, hierarchy and responsive behaviour.
- Replaced the low-resolution demo thumbnails with a new high-resolution, consistently art-directed visual set.
- Rebuilt every tutorial animation as a crisp 960×540 looping GIF that mirrors the platform UI.
- Added static tutorial poster frames for reduced-motion users.
- Added multi-select + bulk actions in My Content.
- Added grid/list view switching, richer search/filter states and dismissible contextual help.
- Added richer Collections, Mini Content Map and Asset Detail experiences.
- Added a larger quick-guide viewer/modal.
- Refined the subtle Flow service prompts and Talk to Flow drawer.
- Added a lightweight Flow Admin demo screen.
- Added an actual sample collection ZIP download.
- Improved tablet and mobile layouts.

## How to run

### Windows
Double-click `START_DEMO_WINDOWS.bat`.

### macOS / Linux
Run:

```bash
./START_DEMO_MAC_LINUX.sh
```

Then open `http://localhost:8080`.

You can also open `index.html` directly, but a small local server is recommended for the most consistent browser behaviour.

## Demo login

Any email/password works.

Suggested values:
- Email: `ricardo@demo.flow`
- Password: `flowdemo`

## Main screens

- Login
- First-login onboarding
- Home dashboard
- My Content library
- Search, filters, selection and bulk actions
- Collections overview
- Collection detail + Mini Content Map
- Asset / video detail
- Tips & Guides + animated tutorial viewer
- Notifications
- Talk to Flow service drawer
- Profile & preferences
- Flow Admin demo
- Responsive tablet/mobile states

## Important

This remains a **front-end prototype**. The interface is interactive, but authentication, tenant isolation, cloud storage, uploads, databases, email notifications and real client permissions still need a production backend.
