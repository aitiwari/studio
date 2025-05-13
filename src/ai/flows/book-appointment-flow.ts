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
  conversationSummary: z.string().optional().describe('A summary of the conversation leading to the booking (complete trial details).'),
  preferredDate: z.string().optional().describe('User preferred date for the appointment, if any.'),
});
export type BookAppointmentInput = z.infer<typeof BookAppointmentInputSchema>;

const BookAppointmentOutputSchema = z.object({
  confirmationMessage: z.string().describe('A message confirming the appointment booking. It should acknowledge the request, state that following the acknowledgement the appointment is tentatively scheduled, and detail the email confirmation status.'),
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
  output: { 
    schema: z.object({
      internalConfirmationMessage: z.string().describe("A brief acknowledgement of the booking request. This should NOT include the simulated date or email details, as those will be added by the flow."),
      simulatedBookedDate: z.string().describe("The simulated date for the appointment, e.g., 'YYYY-MM-DD' or 'next Tuesday'."),
      emailSubject: z.string().describe("Subject line for the confirmation email."),
      emailBody: z.string().describe("HTML body for the confirmation email, including all trial details."),
    })
  },
  tools: [sendEmailTool],
  system: `You are an appointment booking assistant. Your task is to process an appointment request, generate a confirmation message, and prepare details for a confirmation email.
The user's email is {{userEmail}}.
Symptoms reported: "{{symptoms}}".
{{#if conversationSummary}}Complete conversation history (trial details): "{{conversationSummary}}"{{/if}}
{{#if preferredDate}}Preferred date: "{{preferredDate}}"{{/if}}

Follow these steps meticulously:
1.  Acknowledge the booking request briefly. This will be the 'internalConfirmationMessage'. It should *not* include the simulated date or email details. Example: "Okay, I'm processing your appointment request."
2.  Simulate a booking date for 'simulatedBookedDate'. If a preferred date is given, try to use it or a date close to it. Otherwise, pick a date a few days from now (e.g., 'three days from now', 'next Wednesday').
3.  Compose a concise and informative subject line for the confirmation email (e.g., "Your HealthAssist Appointment Confirmation").
4.  Compose the HTML body for the confirmation email. The email MUST include:
    *   The simulated booked date.
    *   A clear summary of the user's reported symptoms: "{{symptoms}}".
    *   The complete conversation history (these are the trial details). If a conversation summary is provided ({{{conversationSummary}}}), include it fully. If not, state 'No prior conversation details provided.'.
    *   Any relevant next steps or advice for the user.
5.  Crucially, you MUST then use the 'sendEmailTool' to send this confirmation email. Provide the user's email ({{userEmail}}), the subject line you composed, and the HTML body you composed as input to the tool.
`,
  prompt: `Process appointment for {{userEmail}} with symptoms: "{{symptoms}}".
{{#if conversationSummary}}Trial details to include in email: "{{conversationSummary}}"{{/if}}
{{#if preferredDate}}Attempt to book for preferred date: {{preferredDate}}.{{/if}}
Generate booking acknowledgement, simulated date, and email content. Then, you absolutely MUST use the sendEmailTool to dispatch the email.
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

    const emailToolCallRequest = llmResponse.requests?.find(req => req.toolRequest?.toolName === 'sendEmailTool');

    if (emailToolCallRequest) {
        const emailToolResponse = llmResponse.toolResponses?.find(tr => tr.ref === emailToolCallRequest.ref && tr.toolName === 'sendEmailTool');

        if (emailToolResponse && emailToolResponse.parts && emailToolResponse.parts[0]?.toolResponse) {
             try {
                const toolOutput = emailToolResponse.parts[0].toolResponse.response;
                // Attempt to parse with schema directly. If it's already an object, it should pass.
                // If it's a string, Zod parse will fail, then we try JSON.parse.
                try {
                    emailSendAttemptResult = SendEmailOutputSchema.parse(toolOutput);
                } catch (directParseError) {
                    // If direct parsing failed, and it's a string, try JSON.parse
                    if (typeof toolOutput === 'string') {
                        emailSendAttemptResult = SendEmailOutputSchema.parse(JSON.parse(toolOutput));
                    } else {
                        // If not a string and direct parse failed, then it's an unknown format or schema mismatch.
                        console.error("Email tool output was not a string and direct schema parse failed:", directParseError);
                        throw directParseError; // Re-throw if not a string or JSON.parse also fails
                    }
                }
            } catch(e) {
                 console.error("Error processing email tool response:", e);
                 emailSendAttemptResult = { status: 'Failed', message: 'Could not parse email tool response or response did not match schema.' };
            }
        } else {
            emailSendAttemptResult = { status: 'Failed', message: 'LLM requested email tool, but no valid response part found or response malformed.' };
        }
    } else {
        emailSendAttemptResult = { status: 'Failed', message: 'Email tool was not called by the LLM. The email was not sent.' };
    }

    const emailStatusText = emailSendAttemptResult.status === 'Sent' 
        ? 'has been sent' 
        : `attempt was made (Status: ${emailSendAttemptResult.status}, Message: ${emailSendAttemptResult.message})`;

    const finalConfirmationMessage = `${internalConfirmationMessage} Following that, your appointment is tentatively scheduled for ${simulatedBookedDate}. A confirmation email ${emailStatusText}.`;

    return {
      confirmationMessage: finalConfirmationMessage,
      appointmentDetails: {
        email: input.userEmail,
        status: 'Simulated', 
        bookedDate: simulatedBookedDate,
        notes: `Appointment for symptoms: ${input.symptoms}. Conversation (trial details): ${input.conversationSummary || 'N/A'}`,
      },
      emailSentStatus: `${emailSendAttemptResult.status} - ${emailSendAttemptResult.message}`,
    };
  }
);

