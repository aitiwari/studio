
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
  conversationSummary: z.string().optional().describe('A summary of the conversation leading to the booking (complete trial details). This may contain user preferences for date/time.'),
  preferredDate: z.string().optional().describe('User explicitly stated preferred date for the appointment, if any. This takes precedence over preferences found in conversationSummary for the date component.'),
});
export type BookAppointmentInput = z.infer<typeof BookAppointmentInputSchema>;

const BookAppointmentOutputSchema = z.object({
  confirmationMessage: z.string().describe('A message confirming the appointment booking. It should acknowledge the request, state that following the acknowledgement the appointment is tentatively scheduled, and detail the email confirmation status.'),
  appointmentDetails: z.object({
    email: z.string().email().describe('User email for the appointment.'),
    status: z.enum(['Booked', 'Pending', 'Failed', 'Simulated']).describe('Status of the appointment booking.'),
    bookedDateTime: z.string().optional().describe('The date and time the appointment was booked for (simulated), e.g., "YYYY-MM-DD at HH:MM AM/PM".'),
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
      internalConfirmationMessage: z.string().describe("A brief acknowledgement of the booking request. This should NOT include the simulated date/time or email details, as those will be added by the flow."),
      simulatedDateTime: z.string().describe("The simulated date and time for the appointment, e.g., 'YYYY-MM-DD at HH:MM AM/PM' or 'next Tuesday at 3:00 PM'. This field is always required."),
      emailSubject: z.string().describe("Subject line for the confirmation email."),
      emailBody: z.string().describe("HTML body for the confirmation email, including all trial details and the full simulatedDateTime."),
    })
  },
  tools: [sendEmailTool],
  system: `You are an expert AI appointment booking assistant.
User's email: {{userEmail}}
Symptoms: "{{symptoms}}"
{{#if preferredDate}}User's explicit preferred date: "{{preferredDate}}". Prioritize this for the date.{{/if}}
{{#if conversationSummary}}Full conversation (trial details): "{{conversationSummary}}". Review for date/time preferences if 'preferredDate' is not set.{{/if}}

Your task is to:
1.  Create an 'internalConfirmationMessage' (e.g., "Processing your request.").
2.  Determine a 'simulatedDateTime' for the appointment (e.g., 'YYYY-MM-DD at HH:MM AM/PM' or 'next Tuesday at 3:00 PM'). Use 'preferredDate' if available, then check 'conversationSummary' for any mentioned preferences, otherwise pick a slot a few days out (e.g., 'next Wednesday at 10:00 AM').
3.  Craft an 'emailSubject' (e.g., "Your HealthAssist Appointment Confirmation").
4.  Compose an 'emailBody' (HTML). This body MUST include:
    - The full 'simulatedDateTime' you determined.
    - A clear summary of the user's reported symptoms: "{{symptoms}}".
    - The complete conversation history (these are the trial details). If a 'conversationSummary' is provided ({{{conversationSummary}}}), include it fully. If not, state 'No prior conversation details provided.'.
    - Any relevant next steps or advice for the user.
5.  After defining these four values, you MUST respond with a JSON object containing these four fields: 'internalConfirmationMessage', 'simulatedDateTime', 'emailSubject', 'emailBody'.

THEN, AS THE IMMEDIATE NEXT AND ABSOLUTELY FINAL STEP in your process, YOU MUST use the 'sendEmailTool'. Provide the '{{userEmail}}', the 'emailSubject' you just composed, and the 'emailBody' you just composed as input to this tool. This tool call is mandatory to complete the booking process and send the confirmation. DO NOT FORGET THIS STEP.
`,
  prompt: `Process the appointment request based on the system instructions. Generate the acknowledgement, simulated date/time, and email content. Critically, ensure you then call the sendEmailTool with the generated email details. This is the final and most important action.
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
        confirmationMessage: 'There was an issue processing your booking request. No details generated from AI.',
        appointmentDetails: {
          email: input.userEmail,
          status: 'Failed',
          notes: 'LLM did not return expected output for booking details.',
        },
         emailSentStatus: "Not attempted due to internal AI error."
      };
    }
    
    const { internalConfirmationMessage, simulatedDateTime, emailSubject, emailBody } = promptOutput;

    let emailSendAttemptResult: SendEmailOutput = { status: 'Failed', message: 'Email tool was not invoked by the LLM or an unexpected error occurred before tool call.' };

    const emailToolCallRequest = llmResponse.requests?.find(req => req.toolRequest?.toolName === 'sendEmailTool');

    if (emailToolCallRequest) {
        const emailToolResponse = llmResponse.toolResponses?.find(tr => tr.ref === emailToolCallRequest.ref && tr.toolName === 'sendEmailTool');

        if (emailToolResponse && emailToolResponse.parts && emailToolResponse.parts[0]?.toolResponse) {
             try {
                const toolOutput = emailToolResponse.parts[0].toolResponse.response;
                // The tool should directly return an object matching SendEmailOutputSchema
                emailSendAttemptResult = SendEmailOutputSchema.parse(toolOutput);
            } catch(e: any) {
                 console.error("Error processing/parsing email tool response:", e);
                 // Try to get a meaningful error message
                 let errorMessage = 'Could not parse email tool response or response did not match schema.';
                 if (e instanceof z.ZodError) {
                    errorMessage = `Email tool response Zod parsing error: ${e.errors.map(err => `${err.path.join('.')} - ${err.message}`).join(', ')}`;
                 } else if (e.message) {
                    errorMessage = e.message;
                 }
                 emailSendAttemptResult = { status: 'Failed', message: errorMessage };
            }
        } else {
            emailSendAttemptResult = { status: 'Failed', message: 'LLM requested email tool, but no valid response part found or response malformed.' };
        }
    } else {
        // This is the case where the LLM did not even attempt to call the tool
        emailSendAttemptResult = { status: 'Failed', message: 'Critical: Email tool was not called by the LLM. The email was not sent.' };
    }

    const emailStatusText = emailSendAttemptResult.status === 'Sent' 
        ? `has been sent to ${input.userEmail}`
        : `attempt was made (Status: ${emailSendAttemptResult.status}, Message: ${emailSendAttemptResult.message})`;

    const finalConfirmationMessage = `${internalConfirmationMessage} Following that, your appointment is tentatively scheduled for ${simulatedDateTime}. A confirmation email ${emailStatusText}.`;

    return {
      confirmationMessage: finalConfirmationMessage,
      appointmentDetails: {
        email: input.userEmail,
        status: 'Simulated', 
        bookedDateTime: simulatedDateTime,
        notes: `Appointment for symptoms: ${input.symptoms}. Conversation (trial details): ${input.conversationSummary || 'N/A'}`,
      },
      emailSentStatus: `${emailSendAttemptResult.status} - ${emailSendAttemptResult.message}`,
    };
  }
);

