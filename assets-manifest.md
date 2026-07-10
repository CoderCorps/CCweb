# Assets Manifest

This file lists the raw media files located in the `/myassets` and `/mentors` directories, their sizes, and which page/component references them.

## 👥 /mentors
These files represent the core team/mentor profile images. They are currently copied under `frontend/public/assets/mentors/` (and now temporarily moved to `frontend/public/mentors/`).

| File Name | Size (Bytes) | Referencing Frontend Page / Component |
| :--- | :--- | :--- |
| `atul.png` | 700,290 | `frontend/src/app/(marketing)/mentors/page.tsx` |
| `devansh.jpg` | 48,647 | `frontend/src/app/(marketing)/mentors/page.tsx` |
| `divakar.jpg` | 135,177 | `frontend/src/app/(marketing)/mentors/page.tsx` |

---

## 🎨 /myassets
These are raw assets, background images, animated gifs, and course videos before optimization or placement into the app's `public/assets/` directory.

### 🎥 Videos (`/myassets/Videos`)
These video assets are used for background animations, course tracks, and brand intro loops.

| Raw Source Name | Destination Asset | Size (Bytes) | Referencing Frontend Page / Component |
| :--- | :--- | :--- | :--- |
| `introcodercorps.mp4` | `intro.mp4` | 1,561,539 | `frontend/src/app/(marketing)/page.tsx` |
| `Futuristic HUD Logo_free.mp4` | `track-ai.mp4` / `hud-logo.mp4` | 993,288 | `frontend/src/app/(marketing)/academy/page.tsx` |
| `Abstract Modularity Logo_free.mp4` | `track-web.mp4` | 2,699,513 | `frontend/src/app/(marketing)/academy/page.tsx` |
| `Computer System Logo Reveal_free.mp4` | `track-devops.mp4` | 3,034,728 | `frontend/src/app/(marketing)/academy/page.tsx` |
| `Blazing Cube Logo_free.mp4` | `track-systems.mp4` | 1,047,216 | `frontend/src/app/(marketing)/academy/page.tsx` |
| `2D Hyper Pinpoint Logo_free.mp4` | `track-1.mp4` | 879,628 | `frontend/src/app/(marketing)/academy/page.tsx` |
| `Epic Sphere Eruption Logo_free.mp4` | `track-2.mp4` | 856,576 | `frontend/src/app/(marketing)/academy/page.tsx` |
| `Tech Revamp Logo_free.mp4` | `track-3.mp4` | 2,079,233 | `frontend/src/app/(marketing)/academy/page.tsx` |
| `Luminous Neon Logo_free.mp4` | `track-4.mp4` | 536,733 | `frontend/src/app/(marketing)/academy/page.tsx` |
| `Igniting Logo Reveal_free.mp4` | `track-5.mp4` | 819,399 | `frontend/src/app/(marketing)/academy/page.tsx` |
| `mutant.mp4` | *(Unused)* | 1,357,564 | None |
| Other raw stock reveal video files (24 files) | *(Unused)* | Various | None |

### 🖼️ Logos (`/myassets/Logo`)
Brand logo assets.

| Raw Source Name | Destination Asset | Size (Bytes) | Referencing Frontend Page / Component |
| :--- | :--- | :--- | :--- |
| `Coder-unscreen.gif` | `logo.gif` | 2,075,480 | `login/page.tsx`, `signup/page.tsx`, `(marketing)/layout.tsx`, `(marketing)/page.tsx`, `(platform)/layout.tsx` |
| `Coder.png` | `logo-full.png` | 163,934 | None |
| `Coder__3_-removebg-preview.png` | `logo.png` | 75,931 | None |
| Other design logo files (11 files) | *(Unused)* | Various | None |

### 🌄 Background & Event Images (`/myassets/Assets/jpg` & `/myassets/Assets/gif`)
Key visual design images for backgrounds and tracks.

| Raw Source Name | Destination Asset | Size (Bytes) | Referencing Frontend Page / Component |
| :--- | :--- | :--- | :--- |
| `wallpaperflare.com_wallpaper.jpg` | `hero-bg.jpg` | 1,770,316 | `frontend/src/app/(marketing)/page.tsx` |
| `1638902.jpg` | `circuit-blue.jpg` | 297,062 | `frontend/src/app/(marketing)/page.tsx` |
| `Untitled design (1).jpg` | `circuit-bg.jpg` | 203,629 | `frontend/src/app/(marketing)/page.tsx` |
| `Day 1  29Jan2022 Day 2  (4).png` | `event-rpa.png` | 391,147 | `frontend/src/app/(marketing)/page.tsx` |
| Other assets (approx. 60+ unused files) | *(Unused)* | Various | None |

### 🏅 Badges (`/myassets/Badges`)
Icons/badges intended for achievement credentials.

* **Summary:** `/myassets/Badges/` contains 116 files (e.g. `OIP (12).jfif` to `OIP (63).jfif`, along with transparent PNG templates).
* **Reference status:** Currently, these are not directly imported or referenced by hardcoded routes in the frontend layout. They are designed for dynamic rendering as course or certification badges.
