export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const { amount, payType } = req.body;
        const clientId = "b6116aee-37c0-4931-81f9-e153db4cc7e9";
        const password = "QG90Dz9xcBjFWaU4U0kj";
        const token = "459e7c93-2e05-402a-87ab-0d94b4cef027";

        const authHeader = `Basic ${Buffer.from(`${clientId}:${password}`).toString('base64')}`;
        
        // הכתובת המקורית של סמארטבי
        const targetUrl = 'https://online.smartbee.co.il/api/v1/Documents/create';
        
        // שימוש ב-Proxy ציבורי לבדיקה (זה עשוי לעקוף חסימת IP)
        const proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(targetUrl);

        const response = await fetch(proxyUrl, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': authHeader
            },
            body: JSON.stringify({
                "documentType": 320,
                "customerName": "לקוח כללי",
                "isTaxIncluded": true,
                "clientId": clientId,
                "providerUserToken": token,
                "items": [{ "description": "מכירה כללית", "unitPrice": Number(amount), "quantity": 1 }],
                "payments": [{ "paymentType": Number(payType), "amount": Number(amount), "date": new Date().toISOString().split('T')[0] }]
            })
        });

        const data = await response.json();
        return res.status(response.status).json(data);

    } catch (error) {
        return res.status(500).json({ 
            isSuccess: false, 
            message: "Proxy Error Failed", 
            error: error.message 
        });
    }
}
