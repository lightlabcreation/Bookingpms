const axios = require('axios');
require('dotenv').config();

async function checkMatrix() {
    const apiKey = process.env.CLOUDBEDS_API_KEY;
    const baseUrl = 'https://api.cloudbeds.com/api/v1.1';

    const startDate = '2026-01-26';
    const endDate = '2026-02-05';

    try {
        console.log(`Checking availability (POST) for ${startDate} to ${endDate}...`);
        const res = await axios.post(`${baseUrl}/getAvailability`, {
            startDate,
            endDate
        }, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        console.log('API Response:', JSON.stringify(res.data, null, 2));
    } catch (e) {
        console.error('Error:', e.response?.data || e.message);
    }
}

checkMatrix();
