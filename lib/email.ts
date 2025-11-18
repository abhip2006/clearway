// Resend Email Client
// Transactional email service configuration

import { Resend } from 'resend';

export const resend = new Resend(process.env.RESEND_API_KEY);
