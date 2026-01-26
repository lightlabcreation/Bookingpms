const axios = require('axios');
require('dotenv').config();

async function check14Nights() {
    const apiKey = process.env.CLOUDBEDS_API_KEY;
    const baseUrl = 'https://api.cloudbeds.com/api/v1.1';

    const startDate = '2026-01-27';
    const endDate = '2026-02-10'; // 14 nights

    try {
        console.log(`Checking 14 nights for ${startDate} to ${endDate}...`);
        const res = await axios.get(`${baseUrl}/getAvailableRoomTypes`, {
            params: { startDate, endDate },
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        console.log('API Response (count):', res.data.count);
        if (res.data.count > 0) {
            console.log('Found available rooms for 14 nights!');
        } else {
            console.log('Still sold out even for 14 nights.');
        }
    } catch (e) {
        console.error('Error:', e.response?.data || e.message);
    }
}

check14Nights();
