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

        // שינוי קטן בכתובת: הוספת / בסוף ושימוש ב-https תקין
        const smartbeeUrl = 'https://test.smartbee.co.il/api/v1/Documents/create';

        const smartbeeResponse = await fetch(smartbeeUrl, {
            method: 'POST',
            headers: { 
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Basic ${authString}`
            },
            body: JSON.stringify(payload)
        });

        const status = smartbeeResponse.status;
        const contentType = smartbeeResponse.headers.get("content-type");

        if (contentType && contentType.includes("application/json")) {
            const result = await smartbeeResponse.json();
            return res.status(status).json(result);
        } else {
            // אם קיבלנו HTML, ננסה להבין מה כתוב שם (למשל "401 Unauthorized")
            const htmlError = await smartbeeResponse.text();
            return res.status(status).json({ 
                isSuccess: false, 
                message: `Server returned status ${status}`,
                details: htmlError.substring(0, 200) // לוקח רק את ההתחלה של השגיאה
            });
        }

    } catch (error) {
        return res.status(500).json({ isSuccess: false, message: "Server Exception", error: error.message });
    }
}
