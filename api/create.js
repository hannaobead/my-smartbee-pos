export default async function handler(req, res) {
    // הגדרות CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const { amount, payType } = req.body;
        
        const clientId = "b6116aee-37c0-4931-81f9-e153db4cc7e9";
        const password = "QG90Dz9xcBjFWaU4U0kj";
        const token = "459e7c93-2e05-402a-87ab-0d94b4cef027";

        const payload = {
            "documentType": 320,
            "isTaxIncluded": true,
            "customerName": "לקוח כללי",
            "clientId": clientId,
            "providerUserToken": token,
            "items": [{ "description": "מכירה כללית", "unitPrice": Number(amount), "quantity": 1 }],
            "payments": [{ "paymentType": Number(payType), "amount": Number(amount), "date": new Date().toISOString().split('T')[0] }]
        };

        const authString = Buffer.from(`${clientId}:${password}`).toString('base64');

        const smartbeeResponse = await fetch('https://test.smartbee.co.il/api/v1/Documents/create', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Basic ${authString}`
            },
            body: JSON.stringify(payload)
        });

        // בדיקה אם התגובה היא בכלל JSON
        const contentType = smartbeeResponse.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            const result = await smartbeeResponse.json();
            return res.status(200).json(result);
        } else {
            const textError = await smartbeeResponse.text();
            return res.status(500).json({ isSuccess: false, message: "SmartBee returned non-JSON", details: textError });
        }

    } catch (error) {
        return res.status(500).json({ isSuccess: false, message: "Internal Exception", error: error.message });
    }
}
