'use server';
/**
 * @fileOverview Defines a Genkit flow for booking a medical appointment.
 * This flow takes user details and symptoms, simulates booking an appointment,
 * and uses a tool to send a confirmation email.
 *
 * - bookAppointment - The exported async function to trigger the flow.
 * - BookAppointmentInputSchema - Zod schema for the input of the flow.
 * - BookAppointmentOutputSchema - Zod schema for the output of the flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { sendEmailTool, SendEmailOutputSchema, type SendEmailOutput } from '@/ai/tools/send-email-tool'; 

const BookAppointmentInputSchema = z.object({
  userEmail: z.string().email().describe('The email address of the user booking the appointment.'),
  symptoms: z.string().describe('A summary of the symptoms reported by the user.'),
  conversationSummary: z.string().optional().describe('A summary of the conversation leading to the booking.'),
  preferredDate: z.string().optional().describe('User preferred date for the appointment, if any.'),
});
export type BookAppointmentInput = z.infer<typeof BookAppointmentInputSchema>;

const BookAppointmentOutputSchema = z.object({
  confirmationMessage: z.string().describe('A message confirming the appointment booking status.'),
  appointmentDetails: z.object({
    email: z.string().email().describe('User email for the appointment.'),
    status: z.enum(['Booked', 'Pending', 'Failed', 'Simulated']).describe('Status of the appointment booking.'),
    bookedDate: z.string().optional().describe('The date the appointment was booked for (simulated).'),
    notes: z.string().optional().describe('Any notes or details about the booking.'),
  }),
  emailSentStatus: z.string().optional().describe('Status of the confirmation email sending attempt.'),
});
export type BookAppointmentOutput = z.infer<typeof BookAppointmentOutputSchema>;


export async function bookAppointment(input: BookAppointmentInput): Promise<BookAppointmentOutput> {
  return bookAppointmentFlow(input);
}

const bookingPrompt = ai.definePrompt({
  name: 'bookingPrompt',
  input: { schema: BookAppointmentInputSchema },
  // The output of this specific prompt is just for internal processing before constructing the final flow output
  output: { 
    schema: z.object({
      internalConfirmationMessage: z.string(),
      simulatedBookedDate: z.string(),
      emailSubject: z.string(),
      emailBody: z.string(),
    })
  },
  tools: [sendEmailTool],
  system: `You are an appointment booking assistant. Your task is to process an appointment request, generate a confirmation message, and prepare details for a confirmation email.
The user's email is {{userEmail}}.
Symptoms reported: "{{symptoms}}".
{{#if conversationSummary}}Conversation context: "{{conversationSummary}}"{{/if}}
{{#if preferredDate}}Preferred date: "{{preferredDate}}"{{/if}}

1.  Acknowledge the booking request.
2.  Simulate a booking date. If a preferred date is given, try to use it or a date close to it. Otherwise, pick a date a few days from now.
3.  Generate a friendly internal confirmation message that will be part of the user-facing confirmation.
4.  Compose a subject line for a confirmation email.
5.  Compose the HTML body for the confirmation email. The email should include the booked date, a summary of symptoms, and any next steps.
6.  You MUST call the 'sendEmailTool' to send this confirmation email to the user.
`,
  prompt: `Process appointment for {{userEmail}} with symptoms: "{{symptoms}}".
{{#if preferredDate}}Attempt to book for preferred date: {{preferredDate}}.{{/if}}
Generate booking details and email content. Then, use the sendEmailTool.
  `,
});


const bookAppointmentFlow = ai.defineFlow(
  {
    name: 'bookAppointmentFlow',
    inputSchema: BookAppointmentInputSchema,
    outputSchema: BookAppointmentOutputSchema,
  },
  async (input: BookAppointmentInput): Promise<BookAppointmentOutput> => {
    const llmResponse = await bookingPrompt(input);
    
    const promptOutput = llmResponse.output;

    if (!promptOutput) {
      return {
        confirmationMessage: 'There was an issue processing your booking request. No details generated.',
        appointmentDetails: {
          email: input.userEmail,
          status: 'Failed',
          notes: 'LLM did not return expected output for booking details.',
        },
         emailSentStatus: "Not attempted due to internal error."
      };
    }
    
    const { internalConfirmationMessage, simulatedBookedDate, emailSubject, emailBody } = promptOutput;

    let emailSendAttemptResult: SendEmailOutput = { status: 'Failed', message: 'Email not attempted by LLM or tool call failed.' };

    // Check if the tool was called and what its output was
    const toolCalls = llmResponse.toolCalls;
    const emailToolCallRequest = llmResponse.requests?.find(req => req.toolRequest?.toolName === 'sendEmailTool');


    if (emailToolCallRequest) {
        // Find the corresponding tool response
        const emailToolResponse = llmResponse.toolResponses?.find(tr => tr.ref === emailToolCallRequest.ref && tr.toolName === 'sendEmailTool');

        if (emailToolResponse && emailToolResponse.parts) {
             try {
                // Assuming the first part contains the JSON output from the tool
                // The tool output schema is SendEmailOutputSchema
                const parsedOutput = SendEmailOutputSchema.parse(JSON.parse(emailToolResponse.parts[0].toolResponse.response as string));
                emailSendAttemptResult = parsedOutput;
            } catch(e) {
                 console.error("Error parsing email tool response:", e);
                 emailSendAttemptResult = { status: 'Failed', message: 'Could not parse email tool response or response did not match schema.' };
            }
        } else {
            emailSendAttemptResult = { status: 'Failed', message: 'LLM requested email tool, but no response found or response malformed.' };
        }
    } else {
        // LLM did not decide to call the tool
        emailSendAttemptResult = { status: 'Failed', message: 'Email tool was not called by the LLM.' };
    }


    // Construct the final output
    const finalConfirmationMessage = `${internalConfirmationMessage} Your appointment is tentatively scheduled for ${simulatedBookedDate}. A confirmation email ${emailSendAttemptResult.status === 'Sent' ? 'has been sent' : 'attempt has been processed'}.`;

    return {
      confirmationMessage: finalConfirmationMessage,
      appointmentDetails: {
        email: input.userEmail,
        status: 'Simulated', // Or 'Booked' if simulation is successful
        bookedDate: simulatedBookedDate,
        notes: `Appointment for symptoms: ${input.symptoms}. Conversation: ${input.conversationSummary || 'N/A'}`,
      },
      emailSentStatus: `${emailSendAttemptResult.status} - ${emailSendAttemptResult.message}`,
    };
  }
);
