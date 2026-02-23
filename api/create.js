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

        // הוספת סימן / בסוף הכתובת - לעיתים קריטי בשרתי IIS (כמו של סמארטבי)
        const url = 'https://online.smartbee.co.il/api/v1/Documents/create';

        const response = await fetch(url, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': authHeader,
                'User-Agent': 'Vercel-Serverless-Function' // הוספת זהות לשרת
            },
            body: JSON.stringify({
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
            })
        });

        const responseText = await response.text();
        
        try {
            const data = JSON.parse(responseText);
            return res.status(response.status).json(data);
        } catch (e) {
            return res.status(response.status).json({
                isSuccess: false,
                message: "Non-JSON response received",
                raw: responseText.substring(0, 200)
            });
        }

    } catch (error) {
        // כאן אנחנו מדפיסים את השגיאה האמיתית לתוך ה-JSON כדי שנוכל לראות אותה בדפדפן
        return res.status(500).json({ 
            isSuccess: false, 
            message: "Proxy Error", 
            errorType: error.name,
            errorMessage: error.message 
        });
    }
}
