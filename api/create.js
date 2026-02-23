export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const { amount, payType } = req.body;
        const clientId = "b6116aee-37c0-4931-81f9-e153db4cc7e9";
        const password = "QG90Dz9xcBjFWaU4U0kj";
        const providerUserToken = "459e7c93-2e05-402a-87ab-0d94b4cef027";

        // שלב 1: אימות (Authentication) לפי ה-Swagger
        const authString = Buffer.from(`${clientId}:${password}`).toString('base64');
        
        // שלב 2: יצירת המסמך
        const payload = {
            "documentType": 320,
            "customerName": "לקוח כללי",
            "isTaxIncluded": true,
            "clientId": clientId,
            "providerUserToken": providerUserToken,
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

        const response = await fetch('https://test.smartbee.co.il/api/v1/Documents/create', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Basic ${authString}`
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        // החזרת התוצאה למשתמש
        if (response.ok) {
            return res.status(200).json(result);
        } else {
            return res.status(response.status).json({
                isSuccess: false,
                message: "שגיאה מסמארטבי",
                debug: result
            });
        }

    } catch (error) {
        // כאן אנחנו תופסים את הקריסה שגרמה ל-500
        return res.status(500).json({ 
            isSuccess: false, 
            message: "Server Crash", 
            error: error.message 
        });
    }
}
