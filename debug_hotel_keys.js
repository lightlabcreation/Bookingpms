const axios = require('axios');
require('dotenv').config();

async function test() {
    const apiKey = process.env.CLOUDBEDS_API_KEY;
    const baseUrl = 'https://api.cloudbeds.com/api/v1.1';

    try {
        const res = await axios.get(`${baseUrl}/getHotelDetails`, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        const d = res.data.data || res.data;
        console.log('ID:', d.propertyID);
        console.log('Name:', d.propertyName);
        console.log('Slug:', d.propertySlug);
        console.log('Keys:', Object.keys(d).filter(k => k.toLowerCase().includes('id') || k.toLowerCase().includes('slug') || k.toLowerCase().includes('code')));
    } catch (e) {
        console.error('Error:', e.response?.data || e.message);
    }
}

test();
