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

        // יצירת ה-Auth Header - ללא רווחים
        const authHeader = `Basic ${Buffer.from(`${clientId.trim()}:${password.trim()}`).toString('base64')}`;

        // בניית ה-Payload לפי התיעוד הרשמי (סוג 100 - חשבונית מס)
        const payload = {
            "documentType": 100, 
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

        const response = await fetch('https://test.smartbee.co.il/api/v1/Documents/create', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': authHeader
            },
            body: JSON.stringify(payload)
        });

        const responseText = await response.text();
        
        try {
            const data = JSON.parse(responseText);
            return res.status(response.status).json(data);
        } catch (e) {
            // אם קיבלנו HTML, זה כנראה חסימת IP או IIS Error
            return res.status(response.status).json({
                isSuccess: false,
                message: "שרת סמארטבי החזיר שגיאת מערכת (ייתכן חסימת IP)",
                status: response.status,
                details: responseText.substring(0, 300)
            });
        }

    } catch (error) {
        return res.status(500).json({ isSuccess: false, message: "Server Error", error: error.message });
    }
}
