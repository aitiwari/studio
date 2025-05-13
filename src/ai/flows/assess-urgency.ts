'use server';
/**
 * @fileOverview This file defines a Genkit flow for assessing the urgency of a user's health condition based on their symptoms and responses.
 *
 * - assessUrgency - A function that takes user input and returns an assessment of the urgency of their condition.
 * - AssessUrgencyInput - The input type for the assessUrgency function.
 * - AssessUrgencyOutput - The return type for the assessUrgency function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AssessUrgencyInputSchema = z.object({
  symptoms: z.string().describe('The symptoms described by the user.'),
  responses: z.string().describe('The user responses to questions.'),
});
export type AssessUrgencyInput = z.infer<typeof AssessUrgencyInputSchema>;

const AssessUrgencyOutputSchema = z.object({
  urgencyCategory: z
    .enum(['Urgent', 'Non-Urgent', 'Appointment Needed'])
    .describe("The urgency category of the user's condition."),
  rationale: z.string().describe('The rationale for the assigned urgency category.'),
});
export type AssessUrgencyOutput = z.infer<typeof AssessUrgencyOutputSchema>;

export async function assessUrgency(input: AssessUrgencyInput): Promise<AssessUrgencyOutput> {
  return assessUrgencyFlow(input);
}

const assessUrgencyPrompt = ai.definePrompt({
  name: 'assessUrgencyPrompt',
  input: {schema: AssessUrgencyInputSchema},
  output: {schema: AssessUrgencyOutputSchema},
  prompt: `You are an AI assistant designed to assess the urgency of a user's health condition.
  Based on the user's symptoms: {{{symptoms}}}
  and their responses to questions: {{{responses}}},
  determine the urgency category of their condition.
  The urgency category should be one of the following: Urgent, Non-Urgent, or Appointment Needed.
  Also provide a rationale for the assigned urgency category.
  Consider all information to choose the most appropiate category.
  `,
});

const assessUrgencyFlow = ai.defineFlow(
  {
    name: 'assessUrgencyFlow',
    inputSchema: AssessUrgencyInputSchema,
    outputSchema: AssessUrgencyOutputSchema,
  },
  async input => {
    const {output} = await assessUrgencyPrompt(input);
    return output!;
  }
);
