import { z } from "zod";

export const MatchSchema = z.object({
    contactId: z.string().nullable(),
    companyId: z.string().nullable(),
    dealId: z.string().nullable(),
    confidence: z.number().min(0).max(1),
    rationale: z.string(),
});

export type MatchResult = z.infer<typeof MatchSchema>;

export function buildMatchPrompt(noteSummary: string, candidates: any) {
    return `
You are a strict RevOps data-matching assistant. 
Your job is to match a meeting note to the correct existing CRM Deal from the Candidates list.

RULES:
1. ONLY use IDs explicitly provided in the Candidates list.
2. If no candidate deal matches the meeting context, return null for dealId.
3. Your confidence score must be a float between 0.0 and 1.0.

EXAMPLE:
Note: "Spoke with Sarah about the Q3 Enterprise rollout."
Candidates: [{"dealId": "123", "name": "Q3 Enterprise License"}, {"dealId": "456", "name": "Q1 Pilot"}]
Output: { "contactId": "789", "companyId": "012", "dealId": "123", "confidence": 0.95, "rationale": "Direct mention of Q3 Enterprise." }

ACTUAL TASK:
Meeting note: ${noteSummary}
Candidates: ${JSON.stringify(candidates)}
`;
}

export async function generateMatch(prompt: string): Promise<MatchResult> {
    let attempts = 0;
    while (attempts < 3) {
        try {
            const jsonText = await fetchFromGemini(prompt); 
            const parsed = JSON.parse(jsonText);
            
            return MatchSchema.parse(parsed); 
        } catch (error) {
            attempts++;
            console.warn(`[AI Adapter] Parsing failed. Retrying... (${attempts}/3)`);
            if (attempts === 3) throw new Error("AI failed to return valid JSON.");
        }
    }
    throw new Error("Unexpected AI failure");
}