import { config } from 'dotenv';
config();

import '@/ai/flows/ai-triage.ts';
import '@/ai/flows/assess-urgency.ts';
import '@/ai/flows/book-appointment-flow.ts';
