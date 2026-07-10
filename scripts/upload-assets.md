# Asset CDN Upload Guide

This guide details how to upload CoderCorps' static media assets from `/myassets` and `/mentors` to a cloud-based Content Delivery Network (CDN) like Cloudinary or Vercel Blob, freeing the git history and repository from storing large binary files.

---

## 🛠️ Step 1: Prepare the Folder Structure

When uploading to your CDN (e.g., Cloudinary media library or Vercel Blob store), maintain a clean directory prefix. This ensures the environment-configured base URL resolves correctly.

Organize the assets using the following structure:

```text
codercorps/
├── logo/
│   ├── logo.gif (from Coder-unscreen.gif)
│   ├── logo.png (from Coder__3_-removebg-preview.png)
│   └── logo-full.png (from Coder.png)
├── videos/
│   ├── intro.mp4 (from introcodercorps.mp4)
│   ├── track-ai.mp4
│   ├── track-web.mp4
│   ├── track-devops.mp4
│   ├── track-systems.mp4
│   ├── track-1.mp4
│   ├── track-2.mp4
│   ├── track-3.mp4
│   ├── track-4.mp4
│   ├── track-5.mp4
│   └── hud-logo.mp4
├── mentors/
│   ├── atul.png
│   ├── devansh.jpg
│   └── divakar.jpg
└── backgrounds/
    ├── hero-bg.jpg
    ├── circuit-blue.jpg
    ├── circuit-bg.jpg
    └── event-rpa.png
```

---

## ☁️ Option A: Uploading to Cloudinary (Free Tier)

Cloudinary is recommended for image optimization and auto-conversion of video formats.

1. **Sign Up:** Create a free account at [Cloudinary](https://cloudinary.com/).
2. **Access Media Library:** Navigate to the **Media Library** tab in the dashboard.
3. **Create Folders:** 
   - Create a root folder named `codercorps`.
   - Create subfolders matching the structure above (`logo`, `videos`, `mentors`, `backgrounds`).
4. **Upload Assets:** Drag and drop the corresponding optimized assets from `frontend/public/assets` and `/mentors` into their respective folders.
5. **CDN Base URL:** Your asset base URL will follow this pattern:
   ```text
   https://res.cloudinary.com/<your-cloud-name>/image/upload/codercorps/
   ```

---

## 💾 Option B: Uploading to Vercel Blob

If hosting on Vercel, Vercel Blob is a highly integrated, fast key-value store for static files.

1. **Enable Blob:** Go to your Vercel Project Dashboard → **Storage** tab → Select **Blob** and click **Create**.
2. **Upload Files:** Upload files through the Vercel Dashboard UI.
3. **Preserve folder pathing:** Since Vercel Blob uses flat keys, suffix the file names with folder paths to mock directory structures:
   - Name files as `codercorps/logo/logo.gif`, `codercorps/mentors/atul.png`, etc.
4. **CDN Base URL:** Copy the Vercel Blob store read URL prefix (e.g., `https://<hash>.public.blob.vercel-storage.com/codercorps/`).

---

## ⚙️ Step 3: Configure Frontend Environment

After uploading the assets, update the environment variable in your production deployment configuration or local `.env` file:

```env
NEXT_PUBLIC_ASSET_CDN_URL=https://res.cloudinary.com/<your-cloud-name>/image/upload/codercorps/
```

*If this environment variable is blank or undefined, the application will automatically fall back to local `/public/` assets, allowing seamless local development.*
