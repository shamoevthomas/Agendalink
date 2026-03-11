const BREVO_API_KEY = process.env.BREVO_API_KEY || '';

export async function sendEmail({
    to,
    subject,
    htmlContent,
    sender = { name: 'AgendaLink', email: 'notifications@agendalink.fr' }
}: {
    to: { email: string; name?: string }[];
    subject: string;
    htmlContent: string;
    sender?: { name: string; email: string };
}) {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
            'accept': 'application/json',
            'api-key': BREVO_API_KEY,
            'content-type': 'application/json',
        },
        body: JSON.stringify({
            sender,
            to,
            subject,
            htmlContent,
        }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error('Brevo API error:', errorData);
        throw new Error(`Failed to send email: ${response.statusText}`);
    }

    return await response.json();
}
