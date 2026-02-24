export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const { amount, payType } = req.body;
    const SB_BASE = "https://test.smartbee.co.il/api/v1";

    try {
        // 1. התחברות לקבלת טוקן
        const auth = await fetch(`${SB_BASE}/login/authenticate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                clientId: "b6116aee-37c0-4931-81f9-e153db4cc7e9",
                password: "QG90Dz9xcBjFWaU4U0kj"
            })
        });
        const { token } = await auth.json();

        // 2. יצירת החשבונית
        const uniqueId = "ART" + Date.now();
        const now = new Date().toISOString();

        const payload = {
            "providerUserToken": "459e7c93-2e05-402a-87ab-0d94b4cef027",
            "providerMsgId": uniqueId,
            "providerMsgReferenceId": "POS-" + uniqueId,
            "customer": {
                "name": "לקוח כללי",
                "email": "office@espressoart.co.il",
                "address": "כללי",
                "cityName": "תל אביב"
            },
            "docType": "InvoiceReceipt",
            "createDraftOnFailure": true,
            "currency": { "currencyType": "ILS", "rate": 0 },
            "documentItems": {
                "paymentItems": [{
                    "quantity": 1,
                    "pricePerUnit": parseFloat(amount),
                    "vatOption": "Include",
                    "description": "מכירה בקופה"
                }]
            },
            "receiptDetails": { "taxWithholding": 0 },
            "isSendOrigEng": false,
            "docDate": now
        };

        if (parseInt(payType) === 1) {
            payload.receiptDetails.cashItems = [{ sum: parseFloat(amount), date: now }];
        } else {
            payload.receiptDetails.otherPaymentItems = [{ sum: parseFloat(amount), date: now, description: "אשראי" }];
        }

        const sbResponse = await fetch(`${SB_BASE}/documents/create`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const result = await sbResponse.json();
        res.status(200).json(result);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
