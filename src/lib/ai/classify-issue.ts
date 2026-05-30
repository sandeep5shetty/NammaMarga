import {
  classificationResponseSchema,
} from "@/lib/ai/schemas";
import {
  callOpenAIWithRetry,
  getOpenAIClient,
  parseJsonResponse,
} from "@/lib/ai/openai-client";
import { getReportableTypeListText } from "@/lib/issues/reportable-types";
import type { IssueClassificationResult } from "@/types/civic";

const SYSTEM_PROMPT = `You are NammaMarga AI, a civic infrastructure analyst for Bangalore (BBMP).
Analyze photos ONLY for reportable public infrastructure issues.

Reportable categories (you MUST use one of these exact type values when isCivicIssue is true):
- POTHOLE
- GARBAGE
- SEWAGE
- WATER_LEAK
- WATERLOGGING
- STREETLIGHT
- ROAD_DAMAGE
- TRAFFIC_SIGNAL
- FALLEN_TREE

If the image is NOT a clear civic infrastructure problem in one of those categories (e.g. people, animals, vehicles only, interiors, documents, unrelated objects, or unclear photo), set isCivicIssue to false and explain why in reason. Do NOT use type OTHER.

Respond ONLY with valid JSON in ONE of these shapes:

Accepted:
{
  "isCivicIssue": true,
  "type": "POTHOLE",
  "severity": "LOW"|"MEDIUM"|"HIGH"|"CRITICAL",
  "confidence": 0.0-1.0,
  "title": "short title",
  "summary": "brief description",
  "reasoning": "why you classified this way"
}

Rejected:
{
  "isCivicIssue": false,
  "reason": "why this cannot be reported",
  "summary": "optional short note"
}`;

export async function classifyIssue(
  imageUrl: string,
  description?: string,
): Promise<IssueClassificationResult> {
  const openai = getOpenAIClient();

  const result = await callOpenAIWithRetry(async () => {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Classify this civic infrastructure issue for Bangalore. Allowed types: ${getReportableTypeListText()}.${description ? ` Citizen description: ${description}` : ""}`,
            },
            { type: "image_url", image_url: { url: imageUrl, detail: "low" } },
          ],
        },
      ],
      max_tokens: 500,
      temperature: 0.2,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("Empty AI response");
    return parseJsonResponse<unknown>(content);
  });

  const parsed = classificationResponseSchema.parse(result);

  if (!parsed.isCivicIssue) {
    return {
      accepted: false,
      reason: parsed.reason,
      summary: parsed.summary,
    };
  }

  return {
    accepted: true,
    type: parsed.type,
    severity: parsed.severity,
    confidence: parsed.confidence,
    title: parsed.title,
    summary: parsed.summary,
    reasoning: parsed.reasoning,
  };
}
