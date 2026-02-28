const fs   = require("fs");
const path = require("path");
const dayjs = require("dayjs");
const { v4: uuidv4 } = require("uuid");
const config = require("./config");

const dataPath = path.resolve(__dirname, "..", config.dataFile);

// ── Persistence helpers ────────────────────────────────────────────────────

function loadAppointments() {
  try {
    if (!fs.existsSync(dataPath)) return [];
    return JSON.parse(fs.readFileSync(dataPath, "utf8"));
  } catch {
    return [];
  }
}

function saveAppointments(appointments) {
  fs.mkdirSync(path.dirname(dataPath), { recursive: true });
  fs.writeFileSync(dataPath, JSON.stringify(appointments, null, 2));
}

// ── Slot generation ────────────────────────────────────────────────────────

/**
 * Build all possible time slots for a given date string ("YYYY-MM-DD").
 * Returns an array of { start: dayjs, end: dayjs } objects.
 */
function slotsForDate(dateStr) {
  const { startHour, endHour, slotDurationMinutes } = config.schedule;
  const slots = [];
  let cursor = dayjs(`${dateStr}T${String(startHour).padStart(2, "0")}:00`);
  const close = dayjs(`${dateStr}T${String(endHour).padStart(2, "0")}:00`);

  while (cursor.isBefore(close) || cursor.isSame(close)) {
    const end = cursor.add(slotDurationMinutes, "minute");
    if (end.isAfter(close)) break;
    slots.push({ start: cursor, end });
    cursor = cursor.add(slotDurationMinutes, "minute");
  }
  return slots;
}

/**
 * Returns available (unbooked) slot strings for a date, e.g. ["09:00", "10:00", …].
 */
function availableSlotsForDate(dateStr) {
  const appointments = loadAppointments();
  const bookedTimes = appointments
    .filter((a) => a.date === dateStr && a.status !== "cancelled")
    .map((a) => a.time);

  return slotsForDate(dateStr)
    .map((s) => s.start.format("HH:mm"))
    .filter((t) => !bookedTimes.includes(t));
}

/**
 * Returns the next N working days starting from tomorrow.
 */
function nextAvailableDays(count = 5) {
  const { workingDays, bookingWindowDays } = config.schedule;
  const days = [];
  let cursor = dayjs().add(1, "day");
  const limit = dayjs().add(bookingWindowDays, "day");

  while (days.length < count && cursor.isBefore(limit)) {
    if (workingDays.includes(cursor.day())) {
      const dateStr = cursor.format("YYYY-MM-DD");
      const slots = availableSlotsForDate(dateStr);
      if (slots.length > 0) days.push(dateStr);
    }
    cursor = cursor.add(1, "day");
  }
  return days;
}

// ── CRUD ───────────────────────────────────────────────────────────────────

/**
 * Create a new appointment. Returns the saved appointment object.
 */
function createAppointment({ phone, name, date, time, serviceId }) {
  const appointments = loadAppointments();
  const service = config.services.find((s) => s.id === serviceId);

  const appointment = {
    id: uuidv4().slice(0, 8).toUpperCase(),
    phone,
    name,
    date,
    time,
    serviceId,
    serviceLabel: service ? service.label : serviceId,
    status: "confirmed",
    createdAt: new Date().toISOString(),
  };

  appointments.push(appointment);
  saveAppointments(appointments);
  return appointment;
}

/**
 * Find appointments by phone number.
 */
function appointmentsByPhone(phone) {
  return loadAppointments().filter(
    (a) => a.phone === phone && a.status !== "cancelled"
  );
}

/**
 * Find a single appointment by ID.
 */
function appointmentById(id) {
  return loadAppointments().find((a) => a.id === id.toUpperCase());
}

/**
 * Cancel an appointment by ID. Returns the updated record or null.
 */
function cancelAppointment(id) {
  const appointments = loadAppointments();
  const idx = appointments.findIndex((a) => a.id === id.toUpperCase());
  if (idx === -1) return null;
  appointments[idx].status = "cancelled";
  appointments[idx].cancelledAt = new Date().toISOString();
  saveAppointments(appointments);
  return appointments[idx];
}

module.exports = {
  availableSlotsForDate,
  nextAvailableDays,
  createAppointment,
  appointmentsByPhone,
  appointmentById,
  cancelAppointment,
};
