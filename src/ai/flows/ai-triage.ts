// This file is machine-generated - edit at your own risk.

'use server';

/**
 * @fileOverview This file defines a Genkit flow for intelligent symptom triage.
 *
 * The flow takes initial symptoms as input and asks relevant questions to determine the urgency of the situation.
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
    .describe('The previous responses from the user.'),
});
export type TriageInput = z.infer<typeof TriageInputSchema>;

const TriageOutputSchema = z.object({
  nextQuestion: z.string().describe('The next relevant question to ask the user.'),
  urgency: z
    .enum(['Urgent', 'Non-Urgent', 'Appointment Needed'])
    .describe('The urgency of the situation based on the symptoms and answers.'),
  outcome: z
    .string()
    .describe(
      'The final outcome and guidance for the user (e.g., seek immediate medical attention, schedule an appointment, monitor symptoms).'      
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

  The user has reported the following symptoms: {{{symptoms}}}

  {% if previousResponses %}
  Based on the user's previous responses:
  {{previousResponses}}
  {% endif %}

  Ask a relevant question to further triage the user's symptoms.

  Also, determine the urgency of the situation and the appropriate outcome for the user.
  The urgency can be 'Urgent', 'Non-Urgent', or 'Appointment Needed'.
  The outcome should provide clear guidance to the user based on the urgency.
  Output the response in JSON format using the following schema:
  ${JSON.stringify(TriageOutputSchema.describe(''))}
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
