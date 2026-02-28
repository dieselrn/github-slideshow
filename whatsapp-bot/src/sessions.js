const config = require("./config");

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

function getSession(phone) {
  const existing = sessions.get(phone);
  if (existing) {
    // Auto-expire sessions
    const ageMs = Date.now() - existing.updatedAt;
    if (ageMs > config.sessionTimeoutMinutes * 60 * 1000) {
      sessions.delete(phone);
      return createSession(phone);
    }
    return existing;
  }
  return createSession(phone);
}

function createSession(phone) {
  const session = { phone, state: "idle", data: {}, updatedAt: Date.now() };
  sessions.set(phone, session);
  return session;
}

function updateSession(phone, patch) {
  const session = getSession(phone);
  Object.assign(session, patch, { updatedAt: Date.now() });
  sessions.set(phone, session);
  return session;
}

function resetSession(phone) {
  return createSession(phone);
}

module.exports = { getSession, updateSession, resetSession };
