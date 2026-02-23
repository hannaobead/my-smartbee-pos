export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const { amount, payType } = req.body;
        
        // הגדרת המשתנים בצורה נקייה
        const clientId = "b6116aee-37c0-4931-81f9-e153db4cc7e9".trim();
        const password = "QG90Dz9xcBjFWaU4U0kj".trim();
        const token = "459e7c93-2e05-402a-87ab-0d94b4cef027".trim();

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

        // יצירת ה-Header בצורה מפורשת
        const credentials = `${clientId}:${password}`;
        const authHeader = `Basic ${Buffer.from(credentials).toString('base64')}`;

        const response = await fetch('https://test.smartbee.co.il/api/v1/Documents/create', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': authHeader
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        // אם עדיין יש שגיאת אימות, נחזיר את הפירוט המלא מסמארטבי
        return res.status(response.status).json(data);

    } catch (error) {
        return res.status(500).json({ isSuccess: false, message: error.message });
    }
}
