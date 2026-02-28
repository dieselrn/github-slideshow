import config from "./config.js";

/**
 * In-memory session store.
 * Sessions track multi-step conversation state per WhatsApp number.
 *
 * state values (conversation steps):
 *   idle            → waiting for the user to start
 *   book_name       → asked for client name
 *   book_service    → asked which service
 *   book_date       → asked which date
 *   book_time       → asked which time slot
 *   book_confirm    → asked to confirm booking
 *   cancel_id       → asked for booking ID to cancel
 *   reschedule_id   → asked for booking ID to reschedule
 */

const sessions = new Map();

export function getSession(phone) {
  const existing = sessions.get(phone);
  if (existing) {
    const ageMs = Date.now() - existing.updatedAt;
    if (ageMs > config.sessionTimeoutMinutes * 60 * 1000) {
      sessions.delete(phone);
      return _create(phone);
    }
    return existing;
  }
  return _create(phone);
}

function _create(phone) {
  const session = { phone, state: "idle", data: {}, updatedAt: Date.now() };
  sessions.set(phone, session);
  return session;
}

export function updateSession(phone, patch) {
  const session = getSession(phone);
  Object.assign(session, patch, { updatedAt: Date.now() });
  sessions.set(phone, session);
  return session;
}

export function resetSession(phone) {
  return _create(phone);
}
