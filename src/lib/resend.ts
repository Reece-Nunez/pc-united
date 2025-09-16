import { Resend } from 'resend';

// Use server-side environment variable - this should only be used server-side
const apiKey = process.env.RESEND_API_KEY;

if (!apiKey) {
  console.error('Resend API key not found. Make sure RESEND_API_KEY is set in your environment variables.');
  throw new Error('Resend API key is required');
}

const resend = new Resend(apiKey);

export { resend };