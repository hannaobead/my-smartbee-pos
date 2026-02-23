export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    try {
        const { amount, payType } = req.body;
        const clientId = "b6116aee-37c0-4931-81f9-e153db4cc7e9";
        const password = "QG90Dz9xcBjFWaU4U0kj";
        const token = "459e7c93-2e05-402a-87ab-0d94b4cef027";

        const payload = {
            "documentType": 320,
            "customerName": "לקוח כללי",
            "isTaxIncluded": true,
            "clientId": clientId,
            "providerUserToken": token,
            "items": [{
                "description": "מכירה כללית",
                "unitPrice": Number(amount),
                "quantity": 1
            }],
            "payments": [{
                "paymentType": Number(payType),
                "amount": Number(amount),
                "date": new Date().toISOString().split('T')[0]
            }]
        };

        const authString = Buffer.from(`${clientId}:${password}`).toString('base64');

        const response = await fetch('https://test.smartbee.co.il/api/v1/Documents/create', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Basic ${authString}`
            },
            body: JSON.stringify(payload)
        });

        // כאן התיקון הקריטי: בודקים אם חזר JSON לפני שמפענחים
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            const data = await response.json();
            return res.status(response.status).json(data);
        } else {
            const errorText = await response.text();
            return res.status(response.status).json({
                isSuccess: false,
                message: "SmartBee returned HTML/Error",
                status: response.status,
                details: errorText.substring(0, 300)
            });
        }
    } catch (err) {
        return res.status(500).json({ isSuccess: false, error: err.message });
    }
}
