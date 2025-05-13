
'use server';
import { intelligentTriage, TriageInput, TriageOutput } from '@/ai/flows/ai-triage';
import { bookAppointment, BookAppointmentInput, BookAppointmentOutput } from '@/ai/flows/book-appointment-flow';

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
    // Ensure the error response conforms to TriageOutput schema, especially quickReplies
    return {
      nextQuestion: "I'm sorry, but I encountered an issue processing your request. Please try again later or contact support if the problem persists.",
      quickReplies: ["Okay", "Try again later"], // Default quick replies on error
      urgency: "Non-Urgent", // Default to Non-Urgent on error to be safe
      outcome: "Could not complete triage due to a system error. Please seek advice from a healthcare professional if you have concerns."
    };
  }
}

export async function bookAppointmentAction(input: BookAppointmentInput): Promise<BookAppointmentOutput> {
  try {
    const response = await bookAppointment(input);
    return response;
  } catch (error) {
    console.error("Error calling book appointment flow:", error);
    return {
      confirmationMessage: "We encountered an error while trying to book your appointment. Please try again later.",
      appointmentDetails: {
        email: input.userEmail,
        status: 'Failed',
        notes: `Booking attempt failed due to a system error. Symptoms: ${input.symptoms}`,
      },
      emailSentStatus: "Not attempted due to booking error.",
    };
  }
}
