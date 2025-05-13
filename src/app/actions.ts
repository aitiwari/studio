'use server';
import { intelligentTriage, TriageInput, TriageOutput } from '@/ai/flows/ai-triage';

export async function getAiTriageResponse(symptom: string, previousResponses?: string): Promise<TriageOutput> {
  try {
    const input: TriageInput = { symptoms: symptom };
    if (previousResponses && previousResponses.trim() !== "") {
      input.previousResponses = previousResponses;
    }
    const response = await intelligentTriage(input);
    return response;
  } catch (error) {
    console.error("Error calling AI triage flow:", error);
    return {
      nextQuestion: "I'm sorry, but I encountered an issue processing your request. Please try again later or contact support if the problem persists.",
      urgency: "Non-Urgent", // Default to Non-Urgent on error to be safe
      outcome: "Could not complete triage due to a system error. Please seek advice from a healthcare professional if you have concerns."
    };
  }
}
