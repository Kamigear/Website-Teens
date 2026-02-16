# VDR Teens - v1.0

VDR Teens is a Firebase-hosted web app for a youth Buddhist community. It includes member login, attendance using weekly tokens/QR, points tracking, event management, and admin data backup/import with Google Sheets.

## Features

- User authentication (Firebase Auth)
- User dashboard:
  - Submit attendance code
  - View points and attendance history
- Admin dashboard:
  - Manage users
  - Manage events
  - Generate fullscreen attendance token + QR
  - Manual attendance (admin can mark attendance without user phone)
  - Configure attendance points by time slots
  - Export/import data to Google Sheets via Google Apps Script
- SEO basics:
  - `sitemap.xml`, `robots.txt`, Open Graph tags
  - favicon and web manifest

## Tech Stack

- Frontend: HTML, CSS (Tooplate custom layer), Bootstrap utilities/components
- JavaScript: Vanilla JS modules
- Backend services: Firebase Auth + Firestore
- Hosting: Firebase Hosting
- External integration: Google Apps Script (for sheet backup/sync)

## Project Structure

- `public/` - static site files (HTML/CSS/JS/images)
- `public/js/firebase-config.js` - Firebase client config
- `public/js/dashboard.js` - core dashboard/admin logic
- `public/css/tooplate-gotto-job.css` - custom UI styling
- `public/site.webmanifest`, `public/sitemap.xml`, `public/robots.txt` - SEO/PWA basics
- `firebase.json` - Firebase Hosting config
- `.gemini/google-apps-script.js` - Apps Script source used for Sheets integration
