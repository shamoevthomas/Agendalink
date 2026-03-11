import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { sendEmail } from '../src/lib/brevo';

async function testEmail() {
    try {
        console.log('Sending test email via Brevo...');
        const result = await sendEmail({
            to: [{ email: 'shamoevthomas@gmail.com', name: 'Thomas' }],
            subject: 'Test AgendaLink Direct',
            htmlContent: '<h1>Test</h1><p>This is a test from the diagnostic script.</p>'
        });
        console.log('Success:', result);
    } catch (e) {
        console.error('Failed to send:', e);
    }
}
testEmail();
