export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { amount, payType } = req.body;

        const payload = {
            "documentType": 320,
            "isTaxIncluded": true,
            "customerName": "לקוח כללי",
            "clientId": "b6116aee-37c0-4931-81f9-e153db4cc7e9",
            "providerUserToken": "459e7c93-2e05-402a-87ab-0d94b4cef027",
            "items": [{ "description": "מכירה כללית", "unitPrice": amount, "quantity": 1 }],
            "payments": [{ "paymentType": payType, "amount": amount, "date": new Date().toISOString().split('T')[0] }]
        };

        const authHeader = 'Basic ' + Buffer.from("b6116aee-37c0-4931-81f9-e153db4cc7e9:QG90Dz9xcBjFWaU4U0kj").toString('base64');

        const response = await fetch('https://test.smartbee.co.il/api/v1/Documents/create', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': authHeader
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        return res.status(200).json(result);

    } catch (error) {
        return res.status(500).json({ isSuccess: false, message: error.message });
    }
}
