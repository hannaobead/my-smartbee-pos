export default async function handler(req, res) {
    // הגדרות CORS בסיסיות
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const { amount, payType } = req.body;
        
        // פרטי זיהוי (ללא רווחים)
        const clientId = "b6116aee-37c0-4931-81f9-e153db4cc7e9";
        const password = "QG90Dz9xcBjFWaU4U0kj";
        const token = "459e7c93-2e05-402a-87ab-0d94b4cef027";

        // מבנה הנתונים לפי Swagger
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

        // שליחה לשרת האמיתי (Production)
        const response = await fetch('https://online.smartbee.co.il/api/v1/Documents/create', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': authHeader
            },
            body: JSON.stringify(payload)
        });

        // קבלת התשובה כטקסט קודם כל כדי למנוע קריסה של JSON.parse
        const responseText = await response.text();
        
        try {
            const data = JSON.parse(responseText);
            return res.status(response.status).json(data);
        } catch (e) {
            return res.status(response.status).json({
                isSuccess: false,
                message: "Raw response from SmartBee",
                raw: responseText.substring(0, 500)
            });
        }

    } catch (error) {
        return res.status(500).json({ 
            isSuccess: false, 
            message: "Proxy Error", 
            error: error.message 
        });
    }
}
