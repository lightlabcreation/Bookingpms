const axios = require('axios');
require('dotenv').config();

async function checkDashboard() {
    const apiKey = process.env.CLOUDBEDS_API_KEY;
    const baseUrl = 'https://api.cloudbeds.com/api/v1.1';

    const startDate = '2026-01-26';
    const endDate = '2026-02-05';

    try {
        console.log(`Checking dashboard for ${startDate} to ${endDate}...`);
        const res = await axios.get(`${baseUrl}/getDashboard`, {
            params: { startDate, endDate },
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        console.log('API Response (keys):', Object.keys(res.data));
        if (res.data.data) {
            // Check for availability grid
            console.log('Sample data keys:', Object.keys(res.data.data));
        }
        console.log('Full Response:', JSON.stringify(res.data, null, 2));
    } catch (e) {
        console.error('Error:', e.response?.data || e.message);
    }
}

checkDashboard();
