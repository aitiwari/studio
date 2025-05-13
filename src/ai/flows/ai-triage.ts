// This file is machine-generated - edit at your own risk.

'use server';

/**
 * @fileOverview This file defines a Genkit flow for intelligent symptom triage.
 *
 * The flow takes initial symptoms as input and asks relevant questions to determine the urgency of the situation.
 * It can also provide quick reply options for the user.
 *
 * @module ai/flows/ai-triage
 *
 * @typedef {import('genkit').Input} Input
 * @typedef {import('genkit').Output} Output
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TriageInputSchema = z.object({
  symptoms: z
    .string()
    .describe('The symptoms reported by the user, comma separated.'),
  previousResponses: z
    .string()
    .optional()
    .describe('The previous responses from the user, forming a conversation history.'),
});
export type TriageInput = z.infer<typeof TriageInputSchema>;

const TriageOutputSchema = z.object({
  nextQuestion: z.string().describe('The next relevant question to ask the user. This field is always required.'),
  quickReplies: z
    .array(z.string())
    .optional()
    .describe(
      'Optional array of 2-4 short strings for quick user responses. Omit or use empty array if not applicable to the question.'
    ),
  urgency: z
    .enum(['Urgent', 'Non-Urgent', 'Appointment Needed'])
    .describe('The assessed urgency. This field is always required.'),
  outcome: z
    .string()
    .describe(
      'Guidance for the user (e.g., seek immediate medical attention, schedule an appointment, monitor symptoms). This field is always required.'
    ),
});
export type TriageOutput = z.infer<typeof TriageOutputSchema>;

export async function intelligentTriage(input: TriageInput): Promise<TriageOutput> {
  return intelligentTriageFlow(input);
}

const triagePrompt = ai.definePrompt({
  name: 'triagePrompt',
  input: {
    schema: TriageInputSchema,
  },
  output: {
    schema: TriageOutputSchema,
  },
  prompt: `You are an AI-powered triage chatbot. Your goal is to ask relevant questions to understand the user's health situation and then provide an urgency assessment and an outcome.

User's initial symptom: {{{symptoms}}}

{{#if previousResponses}}
Conversation history:
{{{previousResponses}}}
{{/if}}

Based on the information provided, do the following:
1.  Ask the *next most relevant question* to help clarify the user's condition.
2.  If your question can be reasonably answered with simple choices, provide 2 to 4 short quick reply options (e.g., "Yes", "No", "Mild", "Severe"). These replies should be directly relevant to the question you are asking. If quick replies are not suitable for the question, omit the 'quickReplies' field or provide an empty array.
3.  Determine the urgency: 'Urgent', 'Non-Urgent', or 'Appointment Needed'.
4.  Provide a concise outcome message for the user, explaining the next steps based on the urgency.

Your response MUST be a single JSON object. The JSON object must conform to the following structure:
{
  "nextQuestion": "string (The next question for the user. This field is always required.)",
  "quickReplies": ["string", "..."] (Optional array of 2-4 short strings for quick user responses. Omit or use empty array if not applicable to the question.)",
  "urgency": "'Urgent' | 'Non-Urgent' | 'Appointment Needed' (The assessed urgency. This field is always required.)",
  "outcome": "string (Guidance for the user. This field is always required.)"
}

Focus on asking one clear question at a time. Do not ask multiple questions in \`nextQuestion\`.
Ensure the \`outcome\` is conclusive if the urgency is 'Urgent' or if you believe sufficient information has been gathered.
If more information is needed, the \`nextQuestion\` should aim to gather that information.
`,
});

const intelligentTriageFlow = ai.defineFlow(
  {
    name: 'intelligentTriageFlow',
    inputSchema: TriageInputSchema,
    outputSchema: TriageOutputSchema,
  },
  async input => {
    const {output} = await triagePrompt(input);
    // Ensure quickReplies is an array if present, or undefined otherwise.
    // Some models might return null for an optional array if not explicitly told to use empty array.
    if (output && output.quickReplies === null) {
      output.quickReplies = undefined;
    }
    return output!;
  }
);
