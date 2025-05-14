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
  categoryName: z
    .string()
    .optional()
    .describe('The category of health concern, e.g., Symptoms, Injury, Dental.'),
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
  prompt: `You are an AI-powered triage chatbot.
{{#if categoryName}}
You are assisting with a concern related to '{{categoryName}}'. The user's specific issue in this category is: '{{{symptoms}}}'.
Based on this '{{categoryName}}' issue, your goal is to ask relevant questions to understand the user's situation and then provide an urgency assessment and an outcome.
{{else}}
Your goal is to ask relevant questions to understand the user's health situation and then provide an urgency assessment and an outcome.
User's initial symptom: {{{symptoms}}}
{{/if}}

{{#if previousResponses}}
Conversation history:
{{{previousResponses}}}
{{/if}}

Based on the information provided, do the following:
1.  Ask the *next most relevant question* to help clarify the user's condition related to '{{{symptoms}}}'{{#if categoryName}} (within the '{{categoryName}}' context){{/if}}.
2.  You MUST provide 2 to 4 short quick reply options (e.g., "Yes", "No", "Mild", "Severe") that are directly relevant to the question you are asking. The 'quickReplies' field is always required.
3.  Determine the urgency: 'Urgent', 'Non-Urgent', 'Appointment Needed'.
4.  Provide a concise outcome message for the user, explaining the next steps based on the urgency.
    - If urgency is 'Urgent', the outcome should stress seeking immediate medical attention.
    - If urgency is 'Non-Urgent', the outcome should suggest monitoring or self-care.
    - If urgency is 'Appointment Needed':
        - The 'outcome' MUST contain detailed advice notes summarizing the assessment and providing actionable guidance based on the symptoms and conversation. This should explain why an appointment is recommended and what the user should do in the meantime or if their condition changes. For example: "Based on the information you provided about [briefly summarize key symptoms], we recommend scheduling an appointment with a healthcare professional for further evaluation. Detailed Advice:

*   **Reason for Appointment:** [Explain briefly based on symptoms - e.g., to get a proper diagnosis, rule out serious conditions, discuss treatment options].
*   **What to Do Now:** [Provide relevant self-care advice, e.g., rest, hydration, avoiding certain activities].
*   **When to Seek Urgent Care (Call 111 or go to A&E):** [List specific red flag symptoms that indicate a need for immediate medical attention].
*   **What to Expect:** [Briefly mention what might happen at an appointment].

 Please read this advice carefully." Do NOT ask for more information in the 'outcome'.
        - Your 'nextQuestion' MUST then be "Are you satisfied with this triage?".
        - Your 'quickReplies' MUST include "Yes", "No". If the user selects no, advise them to call 111.


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

{{#if previousResponses}}
{{else}}
Prioritize asking clarifying questions before suggesting 'Appointment Needed'.
{{/if}}

Ask at least one question with quick reply options to gather more information before determining the urgency.
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
