export const FAQ = [
  {
    id: "item-1",
    question: "What is NammaMarg?",
    answer:
      "NammaMarg is a civic road intelligence platform for Bengaluru. Citizens report potholes and other issues with AI, BBMP tracks resolution, and emergency routing helps ambulances avoid damaged roads.",
  },
  {
    id: "item-2",
    question: "Do I need an account to report issues?",
    answer:
      "Yes, a free citizen account lets you submit reports, track status, and earn reputation. Emergency green corridor routing works without login.",
  },
  {
    id: "item-3",
    question: "How does AI classification work?",
    answer:
      "When you upload a photo, our system detects issue type (pothole, garbage, waterlogging, etc.) and severity. We use computer vision and OpenAI as a fallback for accurate civic tagging.",
  },
  {
    id: "item-4",
    question: "What is the emergency green corridor?",
    answer:
      "It finds the safest ambulance route to nearby hospitals by scoring Mapbox driving paths against live pothole and hazard data from citizen reports — not just the fastest road.",
  },
  {
    id: "item-5",
    question: "How does duplicate detection work?",
    answer:
      "If another active report exists within about 50 meters of your issue, we merge your report into the existing one and increase its priority instead of creating clutter.",
  },
  {
    id: "item-6",
    question: "Can BBMP officials use this platform?",
    answer:
      "Yes. BBMP users get a dedicated console with ward-wise priority queues, analytics, contractor tools, and status management for reported issues.",
  },
  {
    id: "item-7",
    question: "How do I verify a fix?",
    answer:
      "Open a resolved issue from the map or your dashboard and submit a verification photo. AI compares before/after images to confirm the repair.",
  },
  {
    id: "item-8",
    question: "Which areas does NammaMarg cover?",
    answer:
      "The demo is focused on Bengaluru with ward-level data, seeded potholes, hospitals, and road health segments. The map and routing are optimized for the city.",
  },
];
