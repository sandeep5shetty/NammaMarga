import { IssueType, Severity } from "@prisma/client";
import { z } from "zod";
import {
  callOpenAIWithRetry,
  getOpenAIClient,
  parseJsonResponse,
} from "@/lib/ai/openai-client";

const severityResultSchema = z.object({
  severity: z.nativeEnum(Severity),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().min(10).max(500),
});

export async function detectSeverity(
  imageUrl: string,
  issueType: IssueType,
  description?: string,
): Promise<{ severity: Severity; confidence: number; reasoning: string }> {
  const openai = getOpenAIClient();

  const result = await callOpenAIWithRetry(async () => {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Assess severity of a ${issueType} civic issue in Bangalore.
Return JSON: { "severity": "LOW"|"MEDIUM"|"HIGH"|"CRITICAL", "confidence": 0-1, "reasoning": "..." }`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Assess severity.${description ? ` Context: ${description}` : ""}`,
            },
            { type: "image_url", image_url: { url: imageUrl, detail: "low" } },
          ],
        },
      ],
      max_tokens: 300,
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("Empty AI response");
    return parseJsonResponse<unknown>(content);
  });

  return severityResultSchema.parse(result);
}
