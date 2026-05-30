import {
  HealthFacilityKind,
  HospitalType,
  IssueStatus,
  IssueType,
  PrismaClient,
  Severity,
} from "@prisma/client";
import { calculatePriorityScore } from "../src/lib/scoring/priority";
import { calculateRoadHealthScore } from "../src/lib/scoring/road-health";

const prisma = new PrismaClient();

const SEED_PREFIX = "[SEED]";

const WARDS = [
  { number: 1, name: "Hebbal", zone: "North", latitude: 13.0358, longitude: 77.597 },
  { number: 2, name: "Yelahanka", zone: "North", latitude: 13.1007, longitude: 77.5963 },
  { number: 3, name: "Malleswaram", zone: "Central", latitude: 13.0035, longitude: 77.5647 },
  { number: 4, name: "Rajajinagar", zone: "West", latitude: 12.9915, longitude: 77.5494 },
  { number: 5, name: "Vijayanagar", zone: "West", latitude: 12.9716, longitude: 77.5373 },
  { number: 6, name: "Basavanagudi", zone: "South", latitude: 12.942, longitude: 77.573 },
  { number: 7, name: "Jayanagar", zone: "South", latitude: 12.925, longitude: 77.5938 },
  { number: 8, name: "BTM Layout", zone: "South", latitude: 12.9166, longitude: 77.6101 },
  { number: 9, name: "Koramangala", zone: "South-East", latitude: 12.9279, longitude: 77.6271 },
  { number: 10, name: "Indiranagar", zone: "East", latitude: 12.9784, longitude: 77.6408 },
  { number: 11, name: "Whitefield", zone: "East", latitude: 12.9698, longitude: 77.7499 },
  { number: 12, name: "Mahadevapura", zone: "East", latitude: 12.9912, longitude: 77.6885 },
  { number: 13, name: "Shivajinagar", zone: "Central", latitude: 12.9855, longitude: 77.6033 },
  { number: 14, name: "Chamarajpet", zone: "Central", latitude: 12.9591, longitude: 77.566 },
  { number: 15, name: "Electronic City", zone: "South", latitude: 12.8399, longitude: 77.677 },
];

const ROADS = [
  { name: "MG Road Corridor", wardNumber: 13, lat1: 12.975, lng1: 77.6, lat2: 12.97, lng2: 77.62 },
  { name: "Outer Ring Road - Marathahalli", wardNumber: 12, lat1: 12.959, lng1: 77.7, lat2: 12.95, lng2: 77.72 },
  { name: "Koramangala 80 Feet Road", wardNumber: 9, lat1: 12.93, lng1: 77.62, lat2: 12.92, lng2: 77.64 },
  { name: "Jayanagar 4th Block Main", wardNumber: 7, lat1: 12.93, lng1: 77.59, lat2: 12.92, lng2: 77.6 },
  { name: "Whitefield Main Road", wardNumber: 11, lat1: 12.97, lng1: 77.75, lat2: 12.96, lng2: 77.77 },
  { name: "Hebbal Flyover Approach", wardNumber: 1, lat1: 13.04, lng1: 77.59, lat2: 13.03, lng2: 77.61 },
  { name: "Indiranagar 100 Feet Road", wardNumber: 10, lat1: 12.98, lng1: 77.64, lat2: 12.97, lng2: 77.66 },
  { name: "BTM 2nd Stage Ring", wardNumber: 8, lat1: 12.92, lng1: 77.61, lat2: 12.91, lng2: 77.63 },
  { name: "Hosur Road Stretch", wardNumber: 8, lat1: 12.915, lng1: 77.605, lat2: 12.908, lng2: 77.62 },
  { name: "Old Airport Road", wardNumber: 10, lat1: 12.955, lng1: 77.655, lat2: 12.948, lng2: 77.67 },
  { name: "Sarjapur Road", wardNumber: 12, lat1: 12.92, lng1: 77.665, lat2: 12.91, lng2: 77.685 },
  { name: "Bannerghatta Road", wardNumber: 14, lat1: 12.935, lng1: 77.575, lat2: 12.925, lng2: 77.59 },
];

type HealthFacilitySeed = {
  name: string;
  type: HospitalType;
  kind: HealthFacilityKind;
  hasIcu: boolean;
  hasEmergency: boolean;
  hasBloodBank?: boolean;
  lat: number;
  lng: number;
  phone: string;
  address: string;
  briefInfo: string;
};

const HEALTH_FACILITIES: HealthFacilitySeed[] = [
  {
    name: "Manipal Hospital Old Airport Road",
    type: "MULTISPECIALTY" as const,
    kind: "HOSPITAL" as const,
    hasIcu: true,
    hasEmergency: true,
    lat: 12.958,
    lng: 77.649,
    phone: "080-2502-4444",
    address: "Old Airport Road, Bengaluru",
    briefInfo: "24/7 emergency, ICU, cardiac & neuro specialties. Major referral hospital.",
  },
  {
    name: "St. John's Medical College Hospital",
    type: "MULTISPECIALTY" as const,
    kind: "HOSPITAL" as const,
    hasIcu: true,
    hasEmergency: true,
    lat: 12.936,
    lng: 77.626,
    phone: "080-2206-5000",
    address: "Sarjapur Road, Bengaluru",
    briefInfo: "Teaching hospital with full emergency dept, trauma team, and blood bank.",
  },
  {
    name: "Columbia Asia Hospital Whitefield",
    type: "MULTISPECIALTY" as const,
    kind: "HOSPITAL" as const,
    hasIcu: true,
    hasEmergency: true,
    lat: 12.969,
    lng: 77.749,
    phone: "080-6660-6666",
    address: "Whitefield, Bengaluru",
    briefInfo: "Multispecialty ER, ICU beds, ambulance bay on ORR side.",
  },
  {
    name: "Victoria Hospital",
    type: "GENERAL" as const,
    kind: "HOSPITAL" as const,
    hasIcu: true,
    hasEmergency: true,
    lat: 12.959,
    lng: 77.573,
    phone: "080-2670-0810",
    address: "KR Market, Bengaluru",
    briefInfo: "Government tertiary hospital — high volume emergency, affordable care.",
  },
  {
    name: "Bowring & Lady Curzon Hospital",
    type: "GENERAL" as const,
    kind: "HOSPITAL" as const,
    hasIcu: false,
    hasEmergency: true,
    lat: 12.985,
    lng: 77.603,
    phone: "080-2559-1324",
    address: "Shivajinagar, Bengaluru",
    briefInfo: "Central Bengaluru emergency — good for quick stabilization.",
  },
  {
    name: "Narayana Health City",
    type: "TRAUMA" as const,
    kind: "TRAUMA_CENTER" as const,
    hasIcu: true,
    hasEmergency: true,
    lat: 12.878,
    lng: 77.645,
    phone: "080-6755-6755",
    address: "Bommasandra, Bengaluru",
    briefInfo: "Dedicated trauma & cardiac centre — best for critical accidents.",
  },
  {
    name: "Sakra World Hospital",
    type: "MULTISPECIALTY" as const,
    kind: "HOSPITAL" as const,
    hasIcu: true,
    hasEmergency: true,
    lat: 12.931,
    lng: 77.667,
    phone: "080-4968-4968",
    address: "Marathahalli, Bengaluru",
    briefInfo: "East Bengaluru ER with ICU, stroke unit, and helipad access.",
  },
  {
    name: "Apollo Hospitals Bannerghatta",
    type: "MULTISPECIALTY" as const,
    kind: "HOSPITAL" as const,
    hasIcu: true,
    hasEmergency: true,
    lat: 12.896,
    lng: 77.598,
    phone: "080-2630-4050",
    address: "Bannerghatta Road, Bengaluru",
    briefInfo: "South zone emergency — trauma, ICU, and specialist on-call.",
  },
  {
    name: "BBMP First Aid Post — Koramangala",
    type: "GENERAL" as const,
    kind: "FIRST_AID" as const,
    hasIcu: false,
    hasEmergency: true,
    lat: 12.928,
    lng: 77.628,
    phone: "080-2297-0000",
    address: "80 Feet Road, Koramangala",
    briefInfo: "Municipal first-aid — wound care, stabilization before hospital transfer.",
  },
  {
    name: "BBMP First Aid Post — Indiranagar",
    type: "GENERAL" as const,
    kind: "FIRST_AID" as const,
    hasIcu: false,
    hasEmergency: true,
    lat: 12.978,
    lng: 77.641,
    phone: "080-2297-0001",
    address: "100 Feet Road, Indiranagar",
    briefInfo: "Quick triage, bandaging, vitals — refer to hospital if critical.",
  },
  {
    name: "BBMP First Aid Post — MG Road",
    type: "GENERAL" as const,
    kind: "FIRST_AID" as const,
    hasIcu: false,
    hasEmergency: true,
    lat: 12.975,
    lng: 77.607,
    phone: "080-2297-0002",
    address: "MG Road, Bengaluru",
    briefInfo: "Central CBD first-aid — ideal for minor injuries & initial response.",
  },
  {
    name: "108 Ambulance First Response — Hebbal",
    type: "GENERAL" as const,
    kind: "FIRST_AID" as const,
    hasIcu: false,
    hasEmergency: true,
    lat: 13.035,
    lng: 77.595,
    phone: "108",
    address: "Hebbal flyover junction",
    briefInfo: "108 EMS staging point — oxygen, basic life support, hospital routing.",
  },
  {
    name: "ESIC Model Hospital — Yelahanka",
    type: "MULTISPECIALTY" as const,
    kind: "HOSPITAL" as const,
    hasIcu: true,
    hasEmergency: true,
    hasBloodBank: true,
    lat: 13.1002,
    lng: 77.5964,
    phone: "080-2856-0000",
    address: "Yelahanka, Bengaluru",
    briefInfo: "North corridor emergency — ICU, blood bank, trauma intake.",
  },
  {
    name: "Rotary Blood Bank — Yelahanka",
    type: "GENERAL" as const,
    kind: "BLOOD_BANK" as const,
    hasIcu: false,
    hasEmergency: false,
    hasBloodBank: true,
    lat: 13.098,
    lng: 77.592,
    phone: "080-2856-1010",
    address: "Yelahanka New Town, Bengaluru",
    briefInfo: "Blood components for north Bengaluru corridors & airport road.",
  },
  {
    name: "Apollo Pharmacy 24x7 — Yelahanka",
    type: "GENERAL" as const,
    kind: "PHARMACY" as const,
    hasIcu: false,
    hasEmergency: true,
    hasBloodBank: false,
    lat: 13.102,
    lng: 77.598,
    phone: "080-2856-2222",
    address: "Bellary Road, Yelahanka",
    briefInfo: "24/7 medicines & oxygen on NH-44 / airport access routes.",
  },
  {
    name: "Trauma Care Centre — Hosur Road",
    type: "TRAUMA" as const,
    kind: "TRAUMA_CENTER" as const,
    hasIcu: true,
    hasEmergency: true,
    lat: 12.912,
    lng: 77.601,
    phone: "080-4110-0000",
    address: "Hosur Road, Bengaluru",
    briefInfo: "Accident & trauma focus — ortho, neuro surgery on standby.",
  },
  {
    name: "Fortis Hospital Cunningham Road",
    type: "MULTISPECIALTY" as const,
    kind: "HOSPITAL" as const,
    hasIcu: true,
    hasEmergency: true,
    hasBloodBank: true,
    lat: 12.99,
    lng: 77.587,
    phone: "080-4199-0000",
    address: "Cunningham Road, Bengaluru",
    briefInfo: "Central emergency with ICU — good access from Shivajinagar & CBD.",
  },
  {
    name: "Indian Red Cross Blood Bank — Richmond Town",
    type: "GENERAL" as const,
    kind: "BLOOD_BANK" as const,
    hasIcu: false,
    hasEmergency: false,
    hasBloodBank: true,
    lat: 12.962,
    lng: 77.601,
    phone: "080-2222-4444",
    address: "Richmond Road, Bengaluru",
    briefInfo: "Whole blood, platelets & plasma — 24/7 collection on major corridors.",
  },
  {
    name: "Rashtrotthana Blood Centre — Jayanagar",
    type: "GENERAL" as const,
    kind: "BLOOD_BANK" as const,
    hasIcu: false,
    hasEmergency: false,
    hasBloodBank: true,
    lat: 12.925,
    lng: 77.583,
    phone: "080-2664-6666",
    address: "Jayanagar 4th Block, Bengaluru",
    briefInfo: "Voluntary blood donation & emergency release for hospitals.",
  },
  {
    name: "Lions Blood Bank — Victoria Hospital Campus",
    type: "GENERAL" as const,
    kind: "BLOOD_BANK" as const,
    hasIcu: false,
    hasEmergency: false,
    hasBloodBank: true,
    lat: 12.957,
    lng: 77.576,
    phone: "080-2670-0815",
    address: "KR Market, Bengaluru",
    briefInfo: "Attached to Victoria Hospital — rapid issue for trauma cases.",
  },
  {
    name: "Rotary Blood Bank — Indiranagar",
    type: "GENERAL" as const,
    kind: "BLOOD_BANK" as const,
    hasIcu: false,
    hasEmergency: false,
    hasBloodBank: true,
    lat: 12.971,
    lng: 77.638,
    phone: "080-2520-1010",
    address: "100 Feet Road, Indiranagar",
    briefInfo: "Component separation lab — along ORR & CBD access routes.",
  },
  {
    name: "Apollo Pharmacy 24x7 — Hosur Road",
    type: "GENERAL" as const,
    kind: "PHARMACY" as const,
    hasIcu: false,
    hasEmergency: true,
    hasBloodBank: false,
    lat: 12.918,
    lng: 77.608,
    phone: "080-4110-2222",
    address: "Hosur Road, Bengaluru",
    briefInfo: "Emergency medicines, oxygen cylinders & IV fluids on route.",
  },
  {
    name: "MedPlus Pharmacy — Koramangala",
    type: "GENERAL" as const,
    kind: "PHARMACY" as const,
    hasIcu: false,
    hasEmergency: true,
    hasBloodBank: false,
    lat: 12.935,
    lng: 77.624,
    phone: "080-2553-3333",
    address: "80 Feet Road, Koramangala",
    briefInfo: "24/7 pharmacy — trauma meds & first-aid supplies.",
  },
  {
    name: "Dr Lal PathLabs — Indiranagar",
    type: "GENERAL" as const,
    kind: "DIAGNOSTIC" as const,
    hasIcu: false,
    hasEmergency: true,
    hasBloodBank: false,
    lat: 12.98,
    lng: 77.644,
    phone: "080-4918-8888",
    address: "CMH Road, Indiranagar",
    briefInfo: "STAT labs — blood gas, cross-match support for ICU transfers.",
  },
  {
    name: "Thyrocare Collection Centre — BTM",
    type: "GENERAL" as const,
    kind: "DIAGNOSTIC" as const,
    hasIcu: false,
    hasEmergency: false,
    hasBloodBank: false,
    lat: 12.916,
    lng: 77.61,
    phone: "080-3090-0000",
    address: "BTM Layout, Bengaluru",
    briefInfo: "Rapid diagnostics on south corridor routes.",
  },
  {
    name: "City Clinic & ICU Step-down — Domlur",
    type: "GENERAL" as const,
    kind: "CLINIC" as const,
    hasIcu: true,
    hasEmergency: true,
    hasBloodBank: false,
    lat: 12.958,
    lng: 77.638,
    phone: "080-2535-7777",
    address: "Domlur, Bengaluru",
    briefInfo: "Intermediate ICU beds — stabilization before tertiary hospital.",
  },
  {
    name: "Express Care Clinic — MG Road",
    type: "GENERAL" as const,
    kind: "CLINIC" as const,
    hasIcu: false,
    hasEmergency: true,
    hasBloodBank: false,
    lat: 12.973,
    lng: 77.61,
    phone: "080-2558-9999",
    address: "MG Road, Bengaluru",
    briefInfo: "Walk-in emergency care & vitals on central routes.",
  },
];

/** Wikimedia Commons — actual road potholes (not generic/stock mismatches). */
const WIKI = (path: string) => `https://upload.wikimedia.org/wikipedia/commons/${path}`;

const POTHOLE_IMAGES = [
  WIKI("a/a7/Potholes_on_asphalt_road_20171023.jpg"),
  WIKI("c/c7/Pothole_Big.jpg"),
  WIKI("b/bc/Pot_holes.jpg"),
  WIKI(
    "0/0f/Pot_Holes_and_Patch_Repairs_on_the_Roads%2C_Sheffield_-_geograph.org.uk_-_3807006.jpg",
  ),
  WIKI("f/f2/Portlandroadrut.jpg"),
  WIKI("4/4c/Bus_In_Hole_%28448614610%29.jpg"),
];

/** Road surface damage (not reused for POTHOLE-only reports). */
const ROAD_DAMAGE_IMAGES = [
  WIKI("f/f2/Portlandroadrut.jpg"),
  WIKI(
    "0/0f/Pot_Holes_and_Patch_Repairs_on_the_Roads%2C_Sheffield_-_geograph.org.uk_-_3807006.jpg",
  ),
  WIKI("d/d4/Parte_m%C3%ADnima_de_la_pista_deteriorada.jpg"),
];

/** Type-appropriate reference photos — never assign pothole photos to non-pothole types. */
const ISSUE_IMAGES_BY_TYPE: Partial<Record<IssueType, string[]>> = {
  POTHOLE: POTHOLE_IMAGES,
  ROAD_DAMAGE: ROAD_DAMAGE_IMAGES,
  GARBAGE: [
    WIKI("6/6e/Garbage_in_Dhaka.jpg"),
    WIKI("9/9c/Street_garbage_in_India.jpg"),
  ],
  STREETLIGHT: [
    WIKI("4/4c/Street_light_at_night.jpg"),
    WIKI("2/2e/Street_lamp.jpg"),
  ],
  WATERLOGGING: [
    WIKI("f/f7/FEMA_-_11519_-_Photograph_by_Dave_Saville_taken_on_09-26-2004_in_Florida.jpg"),
    WIKI("a/a1/Flood_damage_in_American_Fork_Canyon_June_2023.jpg"),
  ],
  SEWAGE: [
    WIKI("5/5a/Open_sewer_in_Dhaka.jpg"),
    WIKI("3/3e/Sewage_on_road.jpg"),
  ],
  FALLEN_TREE: [
    WIKI("4/4f/Fallen_tree_on_road.jpg"),
    WIKI("8/8d/Tree_fallen_on_road.jpg"),
  ],
  TRAFFIC_SIGNAL: [
    WIKI("6/6e/Traffic_lights_in_London.jpg"),
    WIKI("9/97/Traffic_signal.jpg"),
  ],
  WATER_LEAK: [
    WIKI("2/2f/Water_leaking_on_road.jpg"),
    WIKI("7/7a/Water_on_road.jpg"),
  ],
};

function imageForIssueType(type: IssueType): string {
  const pool = ISSUE_IMAGES_BY_TYPE[type];
  if (pool?.length) return pick(pool);
  if (type === "POTHOLE") return pick(POTHOLE_IMAGES);
  return pick(ROAD_DAMAGE_IMAGES);
}

const STREET_NAMES = [
  "1st Cross", "2nd Main", "3rd Block", "Ring Road stretch", "Flyover approach",
  "Market Road", "Bus stop junction", "Metro pillar zone", "School zone", "Hospital road",
  "Service lane", "Underpass exit", "Bridge approach", "Layout entrance", "Industrial road",
];

const POTHOLE_TITLES = [
  "Deep pothole causing traffic slowdown",
  "Large pothole — vehicles swerving dangerously",
  "Pothole cluster after recent rains",
  "Sharp-edged pothole damaging two-wheelers",
  "Water-filled pothole — hidden hazard",
  "Pothole at speed breaker junction",
  "Road crater near bus stop",
  "Multiple potholes in 50m stretch",
  "Pothole near school crossing",
  "Severe road depression / pothole",
];

const SEVERITIES: Severity[] = ["LOW", "MEDIUM", "MEDIUM", "HIGH", "HIGH", "CRITICAL"];

const SEED_STATUS_POOL: IssueStatus[] = [
  "REPORTED",
  "REPORTED",
  "ACKNOWLEDGED",
  "ACKNOWLEDGED",
  "IN_PROGRESS",
  "IN_PROGRESS",
  "IN_PROGRESS",
  "RESOLVED",
  "RESOLVED",
  "VERIFIED",
];

function hoursAfter(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

async function backfillSeedLifecycle(
  issueId: string,
  status: IssueStatus,
  createdAt: Date,
  contractorIds: string[],
) {
  await prisma.issueStatusHistory.create({
    data: {
      issueId,
      toStatus: "REPORTED",
      createdAt,
      note: "Citizen report submitted",
    },
  });

  let at = createdAt;

  if (["ACKNOWLEDGED", "IN_PROGRESS", "RESOLVED", "VERIFIED"].includes(status)) {
    at = hoursAfter(at, 4 + Math.random() * 20);
    await prisma.issueStatusHistory.create({
      data: {
        issueId,
        fromStatus: "REPORTED",
        toStatus: "ACKNOWLEDGED",
        createdAt: at,
        note: "BBMP ward office acknowledged the report",
      },
    });
    await prisma.activityLog.create({
      data: {
        issueId,
        action: "STATUS_CHANGED",
        details: "Status changed to ACKNOWLEDGED",
      },
    });
  }

  if (["IN_PROGRESS", "RESOLVED", "VERIFIED"].includes(status) && contractorIds.length > 0) {
    at = hoursAfter(at, 8 + Math.random() * 36);
    const contractorId = pick(contractorIds);
    const contractor = await prisma.contractor.findUnique({ where: { id: contractorId } });
    await prisma.issue.update({
      where: { id: issueId },
      data: { contractorId },
    });
    await prisma.issueStatusHistory.create({
      data: {
        issueId,
        fromStatus: "ACKNOWLEDGED",
        toStatus: "IN_PROGRESS",
        createdAt: at,
        note: contractor
          ? `Contractor assigned: ${contractor.name}`
          : "Contractor assigned — repair started",
      },
    });
    await prisma.activityLog.create({
      data: {
        issueId,
        action: "CONTRACTOR_ASSIGNED",
        details: contractor ? `${contractor.name} assigned` : "Contractor assigned",
      },
    });
  }

  if (["RESOLVED", "VERIFIED"].includes(status)) {
    at = hoursAfter(at, 24 + Math.random() * 72);
    await prisma.issueStatusHistory.create({
      data: {
        issueId,
        fromStatus: "IN_PROGRESS",
        toStatus: "RESOLVED",
        createdAt: at,
        note: "Contractor marked the repair complete",
      },
    });
    await prisma.activityLog.create({
      data: {
        issueId,
        action: "STATUS_CHANGED",
        details: "Status changed to RESOLVED",
      },
    });
  }

  if (status === "VERIFIED") {
    at = hoursAfter(at, 12 + Math.random() * 48);
    await prisma.issueStatusHistory.create({
      data: {
        issueId,
        fromStatus: "RESOLVED",
        toStatus: "VERIFIED",
        createdAt: at,
        note: "Community verification complete",
      },
    });
  }
}

const OTHER_TYPES: Array<{ type: IssueType; severity: Severity; title: string }> = [
  { type: "GARBAGE", severity: "HIGH", title: "Garbage pile blocking footpath" },
  { type: "STREETLIGHT", severity: "MEDIUM", title: "Broken streetlight — dark stretch" },
  { type: "WATERLOGGING", severity: "HIGH", title: "Waterlogging after rain" },
  { type: "ROAD_DAMAGE", severity: "CRITICAL", title: "Road surface cracked badly" },
  { type: "SEWAGE", severity: "HIGH", title: "Open sewage on road edge" },
  { type: "FALLEN_TREE", severity: "CRITICAL", title: "Fallen tree blocking lane" },
  { type: "TRAFFIC_SIGNAL", severity: "MEDIUM", title: "Traffic signal not working" },
  { type: "WATER_LEAK", severity: "MEDIUM", title: "Water pipeline leak on road" },
];

/** Hotspot wards get extra pothole density */
const HOTSPOT_WARDS = new Set([1, 8, 9, 10, 11, 12, 13]);

function jitter(lat: number, lng: number, radiusKm = 0.045) {
  const degLat = radiusKm / 111;
  const degLng = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));
  return {
    lat: lat + (Math.random() - 0.5) * 2 * degLat,
    lng: lng + (Math.random() - 0.5) * 2 * degLng,
  };
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomVotes(severity: Severity): number {
  const base = severity === "CRITICAL" ? 8 : severity === "HIGH" ? 4 : 1;
  return base + Math.floor(Math.random() * 20);
}

async function main() {
  console.log("Clearing previous seed issues...");
  await prisma.issueStatusHistory.deleteMany({
    where: { issue: { title: { startsWith: SEED_PREFIX } } },
  });
  await prisma.issueDetection.deleteMany({
    where: { issue: { title: { startsWith: SEED_PREFIX } } },
  });
  await prisma.issue.deleteMany({ where: { title: { startsWith: SEED_PREFIX } } });

  const wardMap = new Map<number, string>();

  for (const ward of WARDS) {
    const w = await prisma.ward.upsert({
      where: { number: ward.number },
      update: { name: ward.name, zone: ward.zone, latitude: ward.latitude, longitude: ward.longitude },
      create: ward,
    });
    wardMap.set(ward.number, w.id);
  }

  for (const road of ROADS) {
    const wardId = wardMap.get(road.wardNumber);
    const existing = await prisma.roadSegment.findFirst({ where: { name: road.name } });
    if (!existing) {
      await prisma.roadSegment.create({
        data: {
          name: road.name,
          wardId,
          latitudeStart: road.lat1,
          longitudeStart: road.lng1,
          latitudeEnd: road.lat2,
          longitudeEnd: road.lng2,
          healthScore: 100,
        },
      });
    }
  }

  for (const h of HEALTH_FACILITIES) {
    const existing = await prisma.hospital.findFirst({ where: { name: h.name } });
    const data = {
      type: h.type,
      kind: h.kind,
      hasIcu: h.hasIcu,
      hasEmergency: h.hasEmergency,
      hasBloodBank: h.hasBloodBank ?? h.kind === "BLOOD_BANK",
      phone: h.phone,
      address: h.address,
      briefInfo: h.briefInfo,
      latitude: h.lat,
      longitude: h.lng,
      open247: true,
    };
    if (existing) {
      await prisma.hospital.update({ where: { id: existing.id }, data });
    } else {
      await prisma.hospital.create({ data: { name: h.name, ...data } });
    }
  }

  const contractors = [
    { name: "Raj Infrastructure", company: "Raj Infra Pvt Ltd", email: "raj@infra.com", rating: 4.5, completedJobs: 42 },
    { name: "Green City Works", company: "Green City Works", email: "contact@greencity.in", rating: 4.2, completedJobs: 38 },
    { name: "Bangalore Roads Co", company: "BRC Solutions", email: "info@brc.in", rating: 3.9, completedJobs: 27 },
  ];

  for (const c of contractors) {
    const existing = await prisma.contractor.findFirst({ where: { email: c.email } });
    if (!existing) await prisma.contractor.create({ data: c });
  }

  let demoUser = await prisma.user.findFirst({ where: { email: "demo@nammamarga.in" } });
  if (!demoUser) {
    demoUser = await prisma.user.create({
      data: {
        name: "Demo Citizen",
        email: "demo@nammamarga.in",
        role: "CITIZEN",
        reputation: 450,
        wardId: wardMap.get(9),
      },
    });
  }

  const roads = await prisma.roadSegment.findMany();
  const roadsByWard = new Map<string, string>();
  for (const r of roads) {
    if (r.wardId) roadsByWard.set(r.wardId, r.id);
  }

  const contractorIds = (await prisma.contractor.findMany({ select: { id: true } })).map(
    (c) => c.id,
  );

  let potholeCount = 0;
  let otherCount = 0;

  for (const ward of WARDS) {
    const wardId = wardMap.get(ward.number)!;
    const roadSegmentId = roadsByWard.get(wardId);
    const baseCount = HOTSPOT_WARDS.has(ward.number) ? 14 : 9;
    const count = baseCount + Math.floor(Math.random() * 6);

    for (let i = 0; i < count; i++) {
      const { lat, lng } = jitter(ward.latitude, ward.longitude, HOTSPOT_WARDS.has(ward.number) ? 0.055 : 0.04);
      const severity = pick(SEVERITIES);
      const status = pick(SEED_STATUS_POOL);
      const street = pick(STREET_NAMES);
      const title = `${SEED_PREFIX} ${pick(POTHOLE_TITLES)} — ${ward.name} ${street}`;
      const createdAt = new Date(Date.now() - Math.random() * 21 * 24 * 60 * 60 * 1000);
      const votes = randomVotes(severity);
      const resolvedAt =
        status === "RESOLVED" || status === "VERIFIED"
          ? hoursAfter(createdAt, 48 + Math.random() * 120)
          : undefined;

      const issue = await prisma.issue.create({
        data: {
          title,
          description: `Citizen-reported pothole on ${street}, Ward ${ward.number} (${ward.name}). AI confidence 0.82.`,
          type: "POTHOLE",
          severity,
          status,
          confidence: 0.75 + Math.random() * 0.2,
          imageUrl: imageForIssueType("POTHOLE"),
          latitude: lat,
          longitude: lng,
          address: `${street}, ${ward.name}, Bengaluru`,
          wardId,
          roadSegmentId,
          reporterId: demoUser.id,
          voteCount: votes,
          priorityScore: calculatePriorityScore({ severity, voteCount: votes, createdAt }),
          createdAt,
          resolvedAt,
        },
      });
      await backfillSeedLifecycle(issue.id, status, createdAt, contractorIds);
      potholeCount++;
    }
  }

  for (const ward of WARDS) {
    const wardId = wardMap.get(ward.number)!;
    const roadSegmentId = roadsByWard.get(wardId);
    const other = OTHER_TYPES[ward.number % OTHER_TYPES.length];
    const { lat, lng } = jitter(ward.latitude, ward.longitude);
    const createdAt = new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000);
    const votes = randomVotes(other.severity);
    const status = pick(SEED_STATUS_POOL);
    const resolvedAt =
      status === "RESOLVED" || status === "VERIFIED"
        ? hoursAfter(createdAt, 48 + Math.random() * 96)
        : undefined;

    const issue = await prisma.issue.create({
      data: {
        title: `${SEED_PREFIX} ${other.title} — ${ward.name}`,
        description: `Additional civic issue for demo analytics.`,
        type: other.type,
        severity: other.severity,
        status,
        confidence: 0.8,
        imageUrl: imageForIssueType(other.type),
        latitude: lat,
        longitude: lng,
        address: `${ward.name}, Bengaluru`,
        wardId,
        roadSegmentId,
        reporterId: demoUser.id,
        voteCount: votes,
        priorityScore: calculatePriorityScore({ severity: other.severity, voteCount: votes, createdAt }),
        createdAt,
        resolvedAt,
      },
    });
    await backfillSeedLifecycle(issue.id, status, createdAt, contractorIds);
    otherCount++;
  }

  for (const road of roads) {
    const issues = await prisma.issue.findMany({
      where: { roadSegmentId: road.id },
      select: { severity: true, status: true, createdAt: true, resolvedAt: true },
    });
    if (issues.length) {
      await prisma.roadSegment.update({
        where: { id: road.id },
        data: {
          healthScore: calculateRoadHealthScore(issues),
          lastScoredAt: new Date(),
        },
      });
    }
  }

  const total = await prisma.issue.count({ where: { title: { startsWith: SEED_PREFIX } } });
  const potholes = await prisma.issue.count({
    where: { title: { startsWith: SEED_PREFIX }, type: "POTHOLE" },
  });

  console.log(`NammaMarga seed complete:`);
  console.log(`  - ${potholeCount} potholes created (${potholes} total potholes in DB)`);
  console.log(`  - ${otherCount} other civic issues`);
  console.log(`  - ${total} total seed issues`);
  console.log(`  - ${roads.length} road segments, ${HEALTH_FACILITIES.length} health facilities`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
