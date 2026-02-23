export default async function handler(req, res) {
    // 1. טיפול ב-CORS (מאפשר גישה מהדפדפן)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // 2. בדיקה שהגיעו נתונים
    const { amount, payType } = req.body;
    if (!amount) {
        return res.status(400).json({ isSuccess: false, message: "Amount is missing" });
    }

    try {
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

        // יצירת ה-Auth Header בצורה ידנית בטוחה
        const authBase64 = Buffer.from(`${clientId}:${password}`).toString('base64');

        const response = await fetch('https://test.smartbee.co.il/api/v1/Documents/create', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Basic ${authBase64}`
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        
        // החזרת התשובה מהשרת שלנו לדפדפן
        return res.status(200).json(result);

    } catch (error) {
        console.error("SmartBee Error:", error);
        return res.status(500).json({ isSuccess: false, message: "Internal Server Error", error: error.message });
    }
}
