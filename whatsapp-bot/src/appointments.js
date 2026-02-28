import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dayjs from "dayjs";
import { v4 as uuidv4 } from "uuid";
import config from "./config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
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

export function availableSlotsForDate(dateStr) {
  const appointments = loadAppointments();
  const bookedTimes = appointments
    .filter((a) => a.date === dateStr && a.status !== "cancelled")
    .map((a) => a.time);

  return slotsForDate(dateStr)
    .map((s) => s.start.format("HH:mm"))
    .filter((t) => !bookedTimes.includes(t));
}

export function nextAvailableDays(count = 5) {
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

export function createAppointment({ phone, name, date, time, serviceId }) {
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

export function appointmentsByPhone(phone) {
  return loadAppointments().filter(
    (a) => a.phone === phone && a.status !== "cancelled"
  );
}

export function appointmentById(id) {
  return loadAppointments().find((a) => a.id === id.toUpperCase());
}

export function cancelAppointment(id) {
  const appointments = loadAppointments();
  const idx = appointments.findIndex((a) => a.id === id.toUpperCase());
  if (idx === -1) return null;
  appointments[idx].status = "cancelled";
  appointments[idx].cancelledAt = new Date().toISOString();
  saveAppointments(appointments);
  return appointments[idx];
}
