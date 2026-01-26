const axios = require('axios');
require('dotenv').config();

async function findGrid() {
    const apiKey = process.env.CLOUDBEDS_API_KEY;
    const baseUrl = 'https://api.cloudbeds.com/api/v1.1';

    const endpoints = ['/getRoomsOccupancy', '/getInventory', '/getAvailabilityMatrix', '/getQuantityMatrix'];
    const startDate = '2026-01-26';
    const endDate = '2026-01-30';

    for (const endpoint of endpoints) {
        try {
            console.log(`Testing ${endpoint}...`);
            const res = await axios.get(`${baseUrl}${endpoint}`, {
                params: { startDate, endDate },
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });
            console.log(`Found! ${endpoint} works.`);
            process.exit(0);
        } catch (e) {
            console.log(`${endpoint} failed: ${e.response?.status || e.message}`);
        }
    }
}

findGrid();
