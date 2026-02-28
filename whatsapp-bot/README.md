# WhatsApp Appointment Bot

A Node.js WhatsApp bot that answers client questions via FAQ matching and guides clients through a step-by-step appointment booking flow.

---

## Features

| Feature | Details |
|---|---|
| **FAQ answering** | Keyword-based answers for hours, location, pricing, payment, cancellation policy, and more |
| **Appointment booking** | Guided multi-step flow: service → date → time → confirmation |
| **Cancellation** | Cancel by booking ID |
| **Rescheduling** | Cancel old slot and pick a new one in one flow |
| **View bookings** | List upcoming appointments for a phone number |
| **Session management** | 30-minute inactivity timeout per user |
| **Persistence** | Appointments saved to a local JSON file |

---

## Prerequisites

- **Node.js ≥ 18**
- **Google Chrome or Chromium** (used by Puppeteer under the hood)
- A WhatsApp account to log the bot in with

---

## Installation

```bash
cd whatsapp-bot
npm install
```

> The first `npm install` will download Puppeteer and its bundled Chromium (~170 MB). This is normal.

---

## Configuration

Edit `src/config.js` to match your business:

```js
business: {
  name: "My Business",
  phone: "+1 (555) 000-0000",
  email: "info@mybusiness.com",
  address: "123 Main St, City, State",
  website: "https://mybusiness.com",
},

schedule: {
  workingDays: [1, 2, 3, 4, 5],   // Mon–Fri
  startHour: 9,
  endHour: 17,
  slotDurationMinutes: 60,
  bookingWindowDays: 30,
},

services: [
  { id: "consultation", label: "Free Consultation (30 min)", durationMinutes: 30 },
  { id: "standard",     label: "Standard Appointment (60 min)", durationMinutes: 60 },
  { id: "extended",     label: "Extended Session (90 min)", durationMinutes: 90 },
],
```

To add custom FAQ topics, edit `src/faqs.js` — add new entries to the `faqs` array with keywords and an answer.

---

## Running

```bash
npm start
```

On first run a QR code appears in the terminal. Scan it with the WhatsApp app on your phone (**Linked Devices → Link a Device**). The session is saved locally so you only need to scan once.

```
✅  My Business WhatsApp Bot is ready!
```

---

## Bot Commands

Clients can send these at any time:

| Message | Action |
|---|---|
| `HELLO` / `HI` / `START` / `MENU` | Show main menu |
| `BOOK` | Start appointment booking |
| `MY APPOINTMENTS` | List upcoming bookings |
| `CANCEL <ID>` | Cancel a booking by ID |
| `RESCHEDULE <ID>` | Reschedule a booking by ID |
| Any question | Matched against FAQ topics |

---

## Conversation Flow

```
Client: BOOK
Bot:    What is your full name?

Client: Jane Smith
Bot:    Choose a service: 1. Free Consultation  2. Standard  3. Extended

Client: 1
Bot:    Available dates: 1. Monday March 3  2. Tuesday March 4 ...

Client: 1
Bot:    Available times: 1. 9:00 AM  2. 10:00 AM ...

Client: 2
Bot:    Confirm? Name: Jane Smith | Service: Free Consultation | Date: ... | Time: 10:00 AM
        Reply YES or NO

Client: YES
Bot:    ✅ Booking Confirmed!
        Booking ID: A3B7F2C1
        ...
```

---

## File Structure

```
whatsapp-bot/
├── src/
│   ├── bot.js           # Entry point — WhatsApp client + message routing
│   ├── config.js        # Business & schedule configuration
│   ├── faqs.js          # FAQ keyword matching
│   ├── appointments.js  # Appointment CRUD + slot generation
│   └── sessions.js      # Per-user conversation state
├── data/
│   └── appointments.json  # Auto-created; persists bookings
├── package.json
└── .gitignore
```

---

## Deployment Tips

- **Keep the process running:** use `pm2 start src/bot.js --name whatsapp-bot` or a systemd service.
- **Chromium on servers:** pass `executablePath` in the Puppeteer config if Chrome isn't in the default location.
- **Multi-instance:** WhatsApp Web only allows one active session per phone number at a time.
- **Backups:** periodically back up `data/appointments.json` and `.wwebjs_auth/`.

---

## Extending the Bot

- **Database:** replace the JSON file in `appointments.js` with a real DB (SQLite, PostgreSQL, etc.).
- **Notifications:** add reminder messages by scheduling a cron job that reads upcoming appointments and sends messages via `client.sendMessage(phone, text)`.
- **AI answers:** replace or supplement `faqs.js` with a call to an LLM API for open-ended questions.
