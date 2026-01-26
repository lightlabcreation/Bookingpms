const axios = require('axios');
require('dotenv').config();

async function test() {
    const apiKey = process.env.CLOUDBEDS_API_KEY;
    const baseUrl = 'https://api.cloudbeds.com/api/v1.1';

    try {
        const res = await axios.get(`${baseUrl}/getHotelDetails`, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        console.log('Hotel Details:', JSON.stringify(res.data, null, 2));
    } catch (e) {
        console.error('Error:', e.response?.data || e.message);
    }
}

test();
