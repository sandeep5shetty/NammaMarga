import { summarySchema } from "@/lib/ai/schemas";
import {
  callOpenAIWithRetry,
  getOpenAIClient,
  parseJsonResponse,
} from "@/lib/ai/openai-client";
import type { IssueSummary } from "@/types/civic";

interface SummaryInput {
  issues: Array<{
    type: string;
    severity: string;
    status: string;
    ward?: string;
    title: string;
  }>;
  period?: string;
  wardName?: string;
}

export async function generateIssueSummary(
  input: SummaryInput,
): Promise<IssueSummary> {
  const openai = getOpenAIClient();

  const issueList = input.issues
    .slice(0, 30)
    .map(
      (i, idx) =>
        `${idx + 1}. [${i.severity}] ${i.type} - ${i.title} (${i.status})${i.ward ? ` Ward: ${i.ward}` : ""}`,
    )
    .join("\n");

  const result = await callOpenAIWithRetry(async () => {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Generate executive civic infrastructure summaries for BBMP Bangalore.
Return JSON: { "summary": "...", "keyPoints": ["..."], "recommendedAction": "...", "estimatedResolutionDays": number }`,
        },
        {
          role: "user",
          content: `Summarize ${input.issues.length} civic issues${input.wardName ? ` in ${input.wardName}` : ""}${input.period ? ` for the past ${input.period}` : ""}:\n\n${issueList}`,
        },
      ],
      max_tokens: 600,
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("Empty AI response");
    return parseJsonResponse<unknown>(content);
  });

  return summarySchema.parse(result);
}
