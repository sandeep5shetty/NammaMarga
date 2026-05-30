import type { IssueType, Severity } from "@prisma/client";

export type RoboflowDetection = {
  className: string;
  confidence: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
};

const CLASS_TO_ISSUE: Record<string, IssueType> = {
  pothole: "POTHOLE",
  "potholes": "POTHOLE",
  garbage: "GARBAGE",
  trash: "GARBAGE",
  streetlight: "STREETLIGHT",
  "broken streetlight": "STREETLIGHT",
  "road damage": "ROAD_DAMAGE",
  crack: "ROAD_DAMAGE",
  waterlogging: "WATERLOGGING",
  flood: "WATERLOGGING",
};

function confidenceToSeverity(confidence: number): Severity {
  if (confidence >= 0.85) return "CRITICAL";
  if (confidence >= 0.7) return "HIGH";
  if (confidence >= 0.5) return "MEDIUM";
  return "LOW";
}

export async function detectWithRoboflow(imageUrl: string): Promise<{
  detections: RoboflowDetection[];
  primaryType: IssueType;
  severity: Severity;
  confidence: number;
  raw: unknown;
} | null> {
  const apiKey = process.env.ROBOFLOW_API_KEY;
  const modelId = process.env.ROBOFLOW_MODEL_ID;
  const modelVersion = process.env.ROBOFLOW_MODEL_VERSION ?? "1";

  if (!apiKey || !modelId) return null;

  const endpoint = `https://detect.roboflow.com/${modelId}/${modelVersion}?api_key=${apiKey}&image=${encodeURIComponent(imageUrl)}`;

  const res = await fetch(endpoint, { method: "POST" });
  if (!res.ok) {
    console.warn("[Roboflow] API error", await res.text());
    return null;
  }

  const raw = await res.json();
  const predictions = (raw.predictions ?? raw.results ?? []) as Array<{
    class?: string;
    class_name?: string;
    confidence?: number;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  }>;

  const detections: RoboflowDetection[] = predictions.map((p) => ({
    className: (p.class ?? p.class_name ?? "unknown").toLowerCase(),
    confidence: p.confidence ?? 0,
    x: p.x,
    y: p.y,
    width: p.width,
    height: p.height,
  }));

  if (!detections.length) return null;

  const best = detections.reduce((a, b) => (a.confidence > b.confidence ? a : b));
  const primaryType =
    CLASS_TO_ISSUE[best.className] ??
    Object.entries(CLASS_TO_ISSUE).find(([k]) => best.className.includes(k))?.[1] ??
    "OTHER";

  return {
    detections,
    primaryType,
    severity: confidenceToSeverity(best.confidence),
    confidence: best.confidence,
    raw,
  };
}
