import config from "./config.js";

/**
 * FAQ entries.
 * Each entry has:
 *   keywords — array of lowercase words/phrases that trigger this answer
 *   answer   — the reply sent back to the client
 */
const faqs = [
  {
    keywords: ["hour", "hours", "open", "opening", "schedule", "time", "times", "when"],
    answer:
      `*Business Hours* 🕐\n` +
      `Monday – Friday: 9:00 AM – 5:00 PM\n` +
      `Saturday & Sunday: Closed\n\n` +
      `Reply *BOOK* at any time to schedule an appointment.`,
  },
  {
    keywords: ["location", "address", "where", "find us", "directions", "map"],
    answer:
      `*Our Location* 📍\n${config.business.address}\n\n` +
      `Need directions? Visit: ${config.business.website}`,
  },
  {
    keywords: ["price", "prices", "cost", "fee", "fees", "charge", "how much", "rate", "rates"],
    answer:
      `*Our Services & Pricing* 💰\n` +
      config.services
        .map((s) => `• ${s.label}`)
        .join("\n") +
      `\n\nContact us at ${config.business.email} for a custom quote.`,
  },
  {
    keywords: ["cancel", "cancellation", "reschedule", "change appointment", "change my appointment"],
    answer:
      `*Cancellations & Rescheduling* 📅\n` +
      `Please cancel or reschedule at least 24 hours in advance.\n\n` +
      `To cancel, reply *CANCEL* followed by your booking ID.\n` +
      `To reschedule, reply *RESCHEDULE* followed by your booking ID.`,
  },
  {
    keywords: ["contact", "email", "phone", "call", "reach", "support"],
    answer:
      `*Contact Us* 📞\n` +
      `📱 Phone: ${config.business.phone}\n` +
      `📧 Email: ${config.business.email}\n` +
      `🌐 Website: ${config.business.website}`,
  },
  {
    keywords: ["payment", "pay", "cash", "card", "credit", "debit", "online payment"],
    answer:
      `*Payment Methods* 💳\n` +
      `We accept:\n` +
      `• Credit / Debit Cards\n` +
      `• Cash\n` +
      `• Bank Transfer\n\n` +
      `Payment is due at the time of service.`,
  },
  {
    keywords: ["parking", "park", "parking lot"],
    answer:
      `*Parking* 🚗\n` +
      `Free parking is available in our lot at ${config.business.address}.\n` +
      `Street parking is also available nearby.`,
  },
];

/**
 * Try to match the user's message against the FAQ list.
 * Returns the answer string, or null if no match.
 */
export function findFaqAnswer(message) {
  const lower = message.toLowerCase();
  for (const faq of faqs) {
    if (faq.keywords.some((kw) => lower.includes(kw))) {
      return faq.answer;
    }
  }
  return null;
}
