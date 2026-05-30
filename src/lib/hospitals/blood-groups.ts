/** Standard blood group labels shown for banks and hospital blood units. */
export const BLOOD_GROUP_TYPES = [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
] as const;

export type BloodGroup = (typeof BLOOD_GROUP_TYPES)[number];

const BLOOD_BANK_STOCK: Record<string, BloodGroup[]> = {
  "Rotary Blood Bank — Yelahanka": ["O+", "O-", "A+", "B+", "AB+"],
  "Indian Red Cross Blood Bank — Richmond Town": [
    "A+",
    "B+",
    "O+",
    "AB+",
    "A-",
    "O-",
    "B-",
  ],
  "Rashtrotthana Blood Centre — Jayanagar": ["A+", "B+", "O+", "AB+", "A-", "O-"],
  "Lions Blood Bank — Victoria Hospital Campus": ["O+", "A+", "B+", "AB+", "O-"],
  "Rotary Blood Bank — Indiranagar": ["A+", "B+", "O+", "AB+", "AB-", "O-"],
};

function isBloodGroup(value: unknown): value is BloodGroup {
  return typeof value === "string" && (BLOOD_GROUP_TYPES as readonly string[]).includes(value);
}

/** Parse `metadata.bloodGroups` from Hospital rows. */
export function parseBloodGroupsFromMetadata(metadata: unknown): BloodGroup[] | undefined {
  if (!metadata || typeof metadata !== "object") return undefined;
  const raw = (metadata as { bloodGroups?: unknown }).bloodGroups;
  if (!Array.isArray(raw)) return undefined;
  const groups = raw.filter(isBloodGroup);
  return groups.length > 0 ? groups : undefined;
}

export function resolveFacilityBloodGroups(
  name: string,
  kind: string,
  hasBloodBank: boolean,
  metadata: unknown,
): BloodGroup[] | undefined {
  const fromMeta = parseBloodGroupsFromMetadata(metadata);
  if (fromMeta?.length) return fromMeta;

  if (kind === "BLOOD_BANK") {
    return BLOOD_BANK_STOCK[name] ?? ["A+", "B+", "O+", "AB+", "A-", "O-"];
  }

  if (hasBloodBank) {
    return ["A+", "B+", "O+", "AB+"];
  }

  return undefined;
}
