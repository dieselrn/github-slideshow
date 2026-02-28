const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const dayjs  = require("dayjs");

const config      = require("./config");
const { findFaqAnswer } = require("./faqs");
const sessions    = require("./sessions");
const appts       = require("./appointments");

// ── WhatsApp client ────────────────────────────────────────────────────────

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  },
});

client.on("qr", (qr) => {
  console.log("\nScan the QR code below with WhatsApp to log in:\n");
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log(`\n✅  ${config.business.name} WhatsApp Bot is ready!\n`);
});

client.on("auth_failure", () => {
  console.error("❌  Authentication failed. Delete the .wwebjs_auth folder and try again.");
  process.exit(1);
});

// ── Message handler ────────────────────────────────────────────────────────

client.on("message", async (msg) => {
  // Ignore group messages and status updates
  if (msg.isGroupMsg || msg.type !== "chat") return;

  const phone   = msg.from;          // e.g. "15550001234@c.us"
  const text    = msg.body.trim();
  const session = sessions.getSession(phone);

  try {
    const reply = await handleMessage(phone, text, session);
    if (reply) await msg.reply(reply);
  } catch (err) {
    console.error("Error handling message:", err);
    await msg.reply("⚠️  Something went wrong. Please try again or contact us directly.");
  }
});

// ── Core conversation handler ──────────────────────────────────────────────

async function handleMessage(phone, text, session) {
  const upper = text.toUpperCase();

  // ── Global commands (work from any state) ──────────────────────────────
  if (upper === "HELP" || upper === "HI" || upper === "HELLO" || upper === "START" || upper === "MENU") {
    sessions.resetSession(phone);
    return menuMessage();
  }

  if (upper === "BOOK") {
    sessions.updateSession(phone, { state: "book_name", data: {} });
    return (
      `📅 *Book an Appointment*\n\n` +
      `Let's get you scheduled! First, what is your full name?`
    );
  }

  if (upper.startsWith("CANCEL")) {
    const parts = upper.split(/\s+/);
    if (parts.length === 2) {
      return handleCancelById(phone, parts[1]);
    }
    sessions.updateSession(phone, { state: "cancel_id", data: {} });
    return `🗑️ *Cancel Appointment*\n\nPlease enter your booking ID (e.g. *AB12CD34*):`;
  }

  if (upper.startsWith("RESCHEDULE")) {
    const parts = upper.split(/\s+/);
    if (parts.length === 2) {
      return handleRescheduleStart(phone, parts[1]);
    }
    sessions.updateSession(phone, { state: "reschedule_id", data: {} });
    return `🔄 *Reschedule Appointment*\n\nPlease enter your booking ID to reschedule:`;
  }

  if (upper === "MY APPOINTMENTS" || upper === "APPOINTMENTS" || upper === "MY BOOKINGS") {
    return listMyAppointments(phone);
  }

  // ── State machine ──────────────────────────────────────────────────────
  switch (session.state) {
    case "book_name":
      return handleBookName(phone, text);

    case "book_service":
      return handleBookService(phone, text);

    case "book_date":
      return handleBookDate(phone, text);

    case "book_time":
      return handleBookTime(phone, text);

    case "book_confirm":
      return handleBookConfirm(phone, upper);

    case "cancel_id":
      return handleCancelById(phone, text);

    case "reschedule_id":
      return handleRescheduleStart(phone, text);

    // idle / unknown state
    default: {
      // Try FAQ matching first
      const faqAnswer = findFaqAnswer(text);
      if (faqAnswer) return faqAnswer;

      // Fall back to the main menu hint
      return (
        `I'm not sure I understand. Here's what I can help with:\n\n` +
        menuMessage()
      );
    }
  }
}

// ── Booking flow ───────────────────────────────────────────────────────────

function handleBookName(phone, name) {
  if (name.length < 2) return "Please enter your full name (at least 2 characters).";
  sessions.updateSession(phone, { state: "book_service", data: { name } });

  const serviceList = config.services
    .map((s, i) => `*${i + 1}.* ${s.label}`)
    .join("\n");

  return (
    `Nice to meet you, *${name}*! 👋\n\n` +
    `Please choose a service:\n\n${serviceList}\n\n` +
    `Reply with the number (e.g. *1*)`
  );
}

function handleBookService(phone, text) {
  const idx = parseInt(text, 10) - 1;
  if (isNaN(idx) || idx < 0 || idx >= config.services.length) {
    return `Please reply with a number between 1 and ${config.services.length}.`;
  }

  const service = config.services[idx];
  const days    = appts.nextAvailableDays(7);

  if (days.length === 0) {
    sessions.resetSession(phone);
    return (
      `Sorry, there are no available slots in the next ${config.schedule.bookingWindowDays} days.\n` +
      `Please contact us at ${config.business.phone} to arrange an alternative.`
    );
  }

  sessions.updateSession(phone, {
    state: "book_date",
    data: { ...sessions.getSession(phone).data, serviceId: service.id, availableDays: days },
  });

  const dayList = days.map((d, i) => `*${i + 1}.* ${formatDate(d)}`).join("\n");

  return (
    `Great choice! *${service.label}* ✅\n\n` +
    `Available dates:\n\n${dayList}\n\n` +
    `Reply with the number of your preferred date.`
  );
}

function handleBookDate(phone, text) {
  const session = sessions.getSession(phone);
  const days    = session.data.availableDays || [];
  const idx     = parseInt(text, 10) - 1;

  if (isNaN(idx) || idx < 0 || idx >= days.length) {
    return `Please reply with a number between 1 and ${days.length}.`;
  }

  const date  = days[idx];
  const slots = appts.availableSlotsForDate(date);

  if (slots.length === 0) {
    return `Sorry, no slots are available on ${formatDate(date)} anymore. Please choose another date.`;
  }

  sessions.updateSession(phone, {
    state: "book_time",
    data: { ...session.data, date, availableSlots: slots },
  });

  const slotList = slots.map((t, i) => `*${i + 1}.* ${formatTime(t)}`).join("\n");

  return (
    `📅 *${formatDate(date)}*\n\nAvailable times:\n\n${slotList}\n\n` +
    `Reply with the number of your preferred time.`
  );
}

function handleBookTime(phone, text) {
  const session = sessions.getSession(phone);
  const slots   = session.data.availableSlots || [];
  const idx     = parseInt(text, 10) - 1;

  if (isNaN(idx) || idx < 0 || idx >= slots.length) {
    return `Please reply with a number between 1 and ${slots.length}.`;
  }

  const time    = slots[idx];
  const service = config.services.find((s) => s.id === session.data.serviceId);

  sessions.updateSession(phone, {
    state: "book_confirm",
    data: { ...session.data, time },
  });

  return (
    `*Please confirm your booking:* ✍️\n\n` +
    `👤 Name:    ${session.data.name}\n` +
    `🛎️  Service: ${service ? service.label : session.data.serviceId}\n` +
    `📅 Date:    ${formatDate(session.data.date)}\n` +
    `🕐 Time:    ${formatTime(time)}\n\n` +
    `Reply *YES* to confirm or *NO* to cancel.`
  );
}

function handleBookConfirm(phone, upper) {
  if (upper === "NO") {
    sessions.resetSession(phone);
    return `Booking cancelled. Reply *BOOK* to start again or *HELP* for the menu.`;
  }

  if (upper !== "YES") {
    return `Please reply *YES* to confirm or *NO* to cancel.`;
  }

  const session = sessions.getSession(phone);
  const { name, serviceId, date, time } = session.data;

  const appointment = appts.createAppointment({
    phone: phone.replace("@c.us", ""),
    name,
    date,
    time,
    serviceId,
  });

  sessions.resetSession(phone);

  return (
    `✅ *Booking Confirmed!*\n\n` +
    `📋 Booking ID: *${appointment.id}*\n` +
    `👤 Name:       ${appointment.name}\n` +
    `🛎️  Service:    ${appointment.serviceLabel}\n` +
    `📅 Date:       ${formatDate(appointment.date)}\n` +
    `🕐 Time:       ${formatTime(appointment.time)}\n\n` +
    `Save your Booking ID — you'll need it to cancel or reschedule.\n\n` +
    `We look forward to seeing you! 🎉\n` +
    `Questions? Contact us at ${config.business.phone}`
  );
}

// ── Cancel / reschedule ────────────────────────────────────────────────────

function handleCancelById(phone, id) {
  const appointment = appts.appointmentById(id);

  if (!appointment) {
    sessions.resetSession(phone);
    return `❌ No appointment found with ID *${id.toUpperCase()}*. Please check and try again.`;
  }

  if (appointment.status === "cancelled") {
    sessions.resetSession(phone);
    return `This appointment (*${id.toUpperCase()}*) has already been cancelled.`;
  }

  appts.cancelAppointment(id);
  sessions.resetSession(phone);

  return (
    `✅ *Appointment Cancelled*\n\n` +
    `ID: *${appointment.id}*\n` +
    `${formatDate(appointment.date)} at ${formatTime(appointment.time)}\n\n` +
    `Reply *BOOK* to schedule a new appointment.`
  );
}

function handleRescheduleStart(phone, id) {
  const appointment = appts.appointmentById(id);

  if (!appointment) {
    sessions.resetSession(phone);
    return `❌ No appointment found with ID *${id.toUpperCase()}*.`;
  }

  if (appointment.status === "cancelled") {
    sessions.resetSession(phone);
    return `Appointment *${id.toUpperCase()}* is already cancelled and cannot be rescheduled.`;
  }

  // Cancel old booking, then start a fresh book flow with the same name + service
  appts.cancelAppointment(id);

  const days = appts.nextAvailableDays(7);

  if (days.length === 0) {
    sessions.resetSession(phone);
    return `Sorry, no available slots right now. Contact us at ${config.business.phone}.`;
  }

  sessions.updateSession(phone, {
    state: "book_date",
    data: {
      name: appointment.name,
      serviceId: appointment.serviceId,
      availableDays: days,
      rescheduledFrom: appointment.id,
    },
  });

  const dayList = days.map((d, i) => `*${i + 1}.* ${formatDate(d)}`).join("\n");

  return (
    `🔄 *Rescheduling* ${appointment.serviceLabel}\n\n` +
    `Old appointment cancelled. Choose a new date:\n\n${dayList}\n\n` +
    `Reply with a number.`
  );
}

// ── My appointments ────────────────────────────────────────────────────────

function listMyAppointments(phone) {
  const list = appts.appointmentsByPhone(phone.replace("@c.us", ""));

  if (list.length === 0) {
    return `You have no upcoming appointments.\n\nReply *BOOK* to schedule one.`;
  }

  const upcoming = list
    .filter((a) => dayjs(`${a.date}T${a.time}`).isAfter(dayjs()))
    .sort((a, b) => (`${a.date}T${a.time}` > `${b.date}T${b.time}` ? 1 : -1));

  if (upcoming.length === 0) {
    return `You have no upcoming appointments.\n\nReply *BOOK* to schedule a new one.`;
  }

  const lines = upcoming.map(
    (a) =>
      `📋 *${a.id}* — ${a.serviceLabel}\n` +
      `   ${formatDate(a.date)} at ${formatTime(a.time)}`
  );

  return (
    `*Your Upcoming Appointments:*\n\n` +
    lines.join("\n\n") +
    `\n\nTo cancel: reply *CANCEL <ID>*\nTo reschedule: reply *RESCHEDULE <ID>*`
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function menuMessage() {
  return (
    `👋 Welcome to *${config.business.name}*!\n\n` +
    `What can I help you with today?\n\n` +
    `📅 *BOOK* — Schedule an appointment\n` +
    `🗓️  *MY APPOINTMENTS* — View your bookings\n` +
    `🗑️  *CANCEL <ID>* — Cancel a booking\n` +
    `🔄 *RESCHEDULE <ID>* — Reschedule a booking\n\n` +
    `Or just ask me anything! e.g.\n` +
    `_"What are your hours?"_\n` +
    `_"Where are you located?"_\n` +
    `_"How much does it cost?"_`
  );
}

function formatDate(dateStr) {
  return dayjs(dateStr).format("dddd, MMMM D, YYYY");
}

function formatTime(timeStr) {
  return dayjs(`2000-01-01T${timeStr}`).format("h:mm A");
}

// ── Start ──────────────────────────────────────────────────────────────────

client.initialize();
