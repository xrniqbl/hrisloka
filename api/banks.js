export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const apiKey = process.env.BANK_VALIDATION_API_KEY || '';
        const response = await fetch('https://use.api.co.id/validation/bank/available', {
            method: 'GET',
            headers: { 'x-api-co-id': apiKey },
        });

        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error) {
        res.status(500).json({ is_success: false, message: error.message });
    }
}
