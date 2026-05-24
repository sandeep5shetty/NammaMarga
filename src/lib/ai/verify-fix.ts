import { IssueType } from "@prisma/client";
import { verificationSchema } from "@/lib/ai/schemas";
import {
  callOpenAIWithRetry,
  getOpenAIClient,
  parseJsonResponse,
} from "@/lib/ai/openai-client";
import type { FixVerification } from "@/types/civic";

export async function verifyFix(
  beforeImageUrl: string,
  afterImageUrl: string,
  issueType: IssueType,
  description?: string,
): Promise<FixVerification> {
  const openai = getOpenAIClient();

  const result = await callOpenAIWithRetry(async () => {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You verify civic infrastructure fixes for Bangalore BBMP.
Compare BEFORE and AFTER images for a ${issueType} issue.
Return JSON: { "verified": boolean, "confidence": 0-1, "reasoning": "...", "improvements": ["..."] }`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Verify if this ${issueType} issue has been properly fixed.${description ? ` Original: ${description}` : ""}`,
            },
            {
              type: "image_url",
              image_url: { url: beforeImageUrl, detail: "low" },
            },
            {
              type: "image_url",
              image_url: { url: afterImageUrl, detail: "low" },
            },
          ],
        },
      ],
      max_tokens: 500,
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("Empty AI response");
    return parseJsonResponse<unknown>(content);
  });

  return verificationSchema.parse(result);
}
