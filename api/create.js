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

        const authHeader = `Basic ${Buffer.from(`${clientId}:${password}`).toString('base64')}`;

        const response = await fetch('https://online.smartbee.co.il/api/v1/Documents/create', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': authHeader
            },
            body: JSON.stringify(payload)
        });

        // בדיקה אם חזר JSON או טקסט אחר
        const contentType = response.headers.get("content-type");
        let result;
        
        if (contentType && contentType.includes("application/json")) {
            result = await response.json();
        } else {
            const rawText = await response.text();
            return res.status(response.status).json({
                isSuccess: false,
                message: "SmartBee returned non-JSON response",
                status: response.status,
                raw: rawText.substring(0, 200)
            });
        }

        return res.status(response.status).json(result);

    } catch (error) {
        return res.status(500).json({ 
            isSuccess: false, 
            message: "Internal Server Error", 
            error: error.message 
        });
    }
}
