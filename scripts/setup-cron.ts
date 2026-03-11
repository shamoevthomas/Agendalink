import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const API_KEY = process.env.CRON_JOB_API_KEY;
const CRON_SECRET = process.env.CRON_SECRET;
const APP_URL = 'https://agendalink.vercel.app'; // Production URL

async function setupCron() {
    if (!API_KEY || !CRON_SECRET) {
        console.error('Missing CRON_JOB_API_KEY or CRON_SECRET in .env.local');
        process.exit(1);
    }

    console.log('Creating cron job on cron-job.org...');

    const jobData = {
        job: {
            url: `${APP_URL}/api/cron/reminders`,
            enabled: true,
            saveResponses: true,
            schedule: {
                timezone: 'Europe/Paris',
                expiresAt: 0,
                hours: [-1],
                mdays: [-1],
                minutes: [0, 10, 20, 30, 40, 50], // Every 10 minutes
                months: [-1],
                wdays: [-1]
            },
            extendedData: {
                headers: {
                    'Authorization': `Bearer ${CRON_SECRET}`
                }
            }
        }
    };

    try {
        const response = await fetch('https://api.cron-job.org/jobs', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify(jobData)
        });

        const data = await response.json();

        if (response.ok) {
            console.log('✅ Cron job created successfully!');
            console.log('Job ID:', data.jobId);
        } else {
            console.error('❌ Failed to create cron job:', data);
        }
    } catch (error) {
        console.error('Error during API call:', error);
    }
}

setupCron();
