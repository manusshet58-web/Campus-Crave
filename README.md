# Campus Crave — Skip the Queue

A mobile-first college canteen pre-order and self-pickup demo. The visual direction is a cinematic, story-led landing page with scroll reveals, layered scenes, parallax accents, and a responsive food menu.

## Features in this demo

- Responsive student-facing landing page and menu
- Animated scrolling sections, reveal-on-scroll effects, ticker, parallax hero/interlude, and interactive food cards
- Search, category filter, veg/in-stock filter controls
- Cart quantity controls and live subtotal
- Pickup date/time, demo checkout, unique order number, and printable receipt
- Admin/staff demo view for orders, status updates, menu and stock management
- SQLite persistence through Express API
- Light/dark theme toggle
- Self-pickup only — no delivery flow

## Run locally

1. Install Node.js 20 or newer.
2. Extract this folder.
3. Open a terminal in the project folder.
4. Run:

   ```bash
   npm install
   npm start
   ```

5. Open `http://localhost:3000` in a browser.

## Mobile access

The app is responsive and can be opened in a mobile browser when hosted. For testing on the same Wi-Fi, run the server on a computer and open that computer's local network IP with port `3000` on the phone. To access it from anywhere, deploy it to a hosting service that supports Node.js and persistent storage.

## Important demo limitations

- The Student/Admin switch is a presentation demo, not secure authentication.
- Test UPI/Card is simulated only. No real payment is processed.
- The admin dashboard and order flow are starter functionality, not a production canteen system.
- Real deployment needs secure authentication, role-based authorization, server validation, HTTPS, database backups, and a suitable persistent hosting/database setup.
- Food photography uses remote image URLs; an internet connection is needed for those images. Emoji fallbacks are included.
