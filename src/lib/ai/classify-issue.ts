import { classificationSchema } from "@/lib/ai/schemas";
import {
  callOpenAIWithRetry,
  getOpenAIClient,
  parseJsonResponse,
} from "@/lib/ai/openai-client";
import type { IssueClassification } from "@/types/civic";

const SYSTEM_PROMPT = `You are NammaMarg AI, a civic infrastructure analyst for Bangalore (BBMP).
Analyze civic issue photos and classify them accurately.
Respond ONLY with valid JSON matching this schema:
{
  "type": "POTHOLE"|"GARBAGE"|"SEWAGE"|"WATER_LEAK"|"STREETLIGHT"|"ROAD_DAMAGE"|"TRAFFIC_SIGNAL"|"FALLEN_TREE"|"OTHER",
  "severity": "LOW"|"MEDIUM"|"HIGH"|"CRITICAL",
  "confidence": 0.0-1.0,
  "title": "short title",
  "summary": "brief description",
  "reasoning": "why you classified this way"
}`;

export async function classifyIssue(
  imageUrl: string,
  description?: string,
): Promise<IssueClassification> {
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
              text: `Classify this civic infrastructure issue.${description ? ` Citizen description: ${description}` : ""}`,
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

  return classificationSchema.parse(result);
}
