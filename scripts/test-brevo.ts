import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testBrevo() {
    const BREVO_API_KEY = process.env.BREVO_API_KEY;
    console.log('API Key starts with:', BREVO_API_KEY ? BREVO_API_KEY.substring(0, 10) : 'MISSING');

    const payload = {
        sender: { name: 'CloseOS Support', email: 'support@closeos.fr' },
        to: [{ email: 'support@closeos.fr', name: 'Thomas' }],
        subject: 'Diagnostic Test from Server',
        htmlContent: '<p>If you see this, Brevo is working.</p>'
    };

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
            'accept': 'application/json',
            'api-key': BREVO_API_KEY || '',
            'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error('Brevo API error:', JSON.stringify(errorData, null, 2));
    } else {
        const data = await response.json();
        console.log('Brevo SUCCESS:', data);
    }
}
testBrevo();
