// This file is machine-generated - edit at your own risk.

'use server';

/**
 * @fileOverview This file defines a Genkit flow for intelligent symptom triage.
 *
 * The flow takes initial symptoms as input and asks relevant questions to determine the urgency of the situation.
 * It must always provide quick reply options for the user.
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
    .min(2, "Must provide at least 2 quick replies.")
    .max(4, "Must provide no more than 4 quick replies.")
    .describe(
      'Required array of 2-4 short strings for quick user responses. These should be directly relevant to the question asked.'
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
2.  You MUST provide 2 to 4 short quick reply options (e.g., "Yes", "No", "Mild", "Severe") that are directly relevant to the question you are asking. The 'quickReplies' field is always required.
3.  Determine the urgency: 'Urgent', 'Non-Urgent', or 'Appointment Needed'.
4.  Provide a concise outcome message for the user, explaining the next steps based on the urgency.
    - If urgency is 'Urgent', the outcome should stress seeking immediate medical attention.
    - If urgency is 'Non-Urgent', the outcome should suggest monitoring or self-care.
    - If urgency is 'Appointment Needed':
        - The 'outcome' MUST be a concise statement explaining *why* an appointment is recommended based on the conversation so far, and that this is the current assessment. For example: "Based on your reported severe and constant pain, an appointment is recommended for further evaluation." or "Given the duration of your symptoms, scheduling an appointment would be a good next step." Do NOT ask for more information in the 'outcome' if an appointment is already being recommended.
        - Your 'nextQuestion' MUST then be "Would you like assistance with scheduling an appointment, or would you prefer to manage this yourself?".
        - Your 'quickReplies' MUST include "Help schedule appointment", "I'll manage it myself". You can add one more relevant option if appropriate, like "Tell me more about why".


Your response MUST be a single JSON object. The JSON object must conform to the following structure:
{
  "nextQuestion": "string (The next question for the user. This field is always required.)",
  "quickReplies": ["string", "string", "..."] (Required array of 2-4 short strings for quick user responses, directly relevant to the nextQuestion.)",
  "urgency": "'Urgent' | 'Non-Urgent' | 'Appointment Needed' (The assessed urgency. This field is always required.)",
  "outcome": "string (Guidance for the user. This field is always required.)"
}

Focus on asking one clear question at a time. Do not ask multiple questions in \`nextQuestion\`.
Ensure the \`outcome\` is conclusive if the urgency is 'Urgent' or if you believe sufficient information has been gathered (especially for 'Appointment Needed' case).
If more information is needed for 'Non-Urgent' cases, the \`nextQuestion\` should aim to gather that information, and you must still provide relevant quick replies.
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
    return output!;
  }
);
