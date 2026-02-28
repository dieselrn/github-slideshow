/**
 * Bot configuration — edit these values to match your business.
 */
const config = {
  // Business details shown to clients
  business: {
    name: "My Business",
    phone: "+1 (555) 000-0000",
    email: "info@mybusiness.com",
    address: "123 Main St, City, State",
    website: "https://mybusiness.com",
  },

  // Available appointment slots (24-hour format)
  schedule: {
    // Days of the week available (0=Sun, 1=Mon, …, 6=Sat)
    workingDays: [1, 2, 3, 4, 5],
    startHour: 9,   // 09:00
    endHour: 17,    // 17:00
    slotDurationMinutes: 60,
    // How many days ahead clients can book
    bookingWindowDays: 30,
  },

  // Services / appointment types offered
  services: [
    { id: "consultation", label: "Free Consultation (30 min)", durationMinutes: 30 },
    { id: "standard",     label: "Standard Appointment (60 min)", durationMinutes: 60 },
    { id: "extended",     label: "Extended Session (90 min)", durationMinutes: 90 },
  ],

  // Path to the JSON file that persists appointments
  dataFile: "./data/appointments.json",

  // Session timeout in minutes (resets conversation state)
  sessionTimeoutMinutes: 30,
};

module.exports = config;
