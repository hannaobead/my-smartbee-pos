const SB_BASE = process.env.SMARTBEE_BASE_URL || "https://test.smartbee.co.il/api/v1";
const SMARTBEE_CLIENT_ID = process.env.SMARTBEE_CLIENT_ID;
const SMARTBEE_PASSWORD = process.env.SMARTBEE_PASSWORD;
const SMARTBEE_PROVIDER_USER_TOKEN = process.env.SMARTBEE_PROVIDER_USER_TOKEN;

async function safeJson(response) {
    const text = await response.text();
    try {
        return text ? JSON.parse(text) : {};
    } catch {
        return { message: text || "Invalid JSON response" };
    }
}

export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

    if (!SMARTBEE_CLIENT_ID || !SMARTBEE_PASSWORD || !SMARTBEE_PROVIDER_USER_TOKEN) {
        return res.status(500).json({ error: "Missing Smartbee environment variables" });
    }

    const { amount, payType } = req.body || {};
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ error: "Invalid amount" });
    }

    try {
        const auth = await fetch(`${SB_BASE}/login/authenticate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                clientId: SMARTBEE_CLIENT_ID,
                password: SMARTBEE_PASSWORD
            })
        });

        const authData = await safeJson(auth);
        if (!auth.ok || !authData.token) {
            return res.status(auth.status || 502).json({
                error: authData.message || "Smartbee authentication failed"
            });
        }

        const token = authData.token;
        const uniqueId = `ART${Date.now()}`;
        const now = new Date().toISOString();
        const paymentType = Number(payType) === 1 ? 1 : 2;

        const payload = {
            providerUserToken: SMARTBEE_PROVIDER_USER_TOKEN,
            providerMsgId: uniqueId,
            providerMsgReferenceId: `POS-${uniqueId}`,
            customer: {
                name: "General Customer",
                email: "office@espressoart.co.il",
                address: "General",
                cityName: "Tel Aviv"
            },
            docType: "InvoiceReceipt",
            createDraftOnFailure: true,
            currency: { currencyType: "ILS", rate: 0 },
            documentItems: {
                paymentItems: [{
                    quantity: 1,
                    pricePerUnit: parsedAmount,
                    vatOption: "Include",
                    description: "POS Sale"
                }]
            },
            receiptDetails: { taxWithholding: 0 },
            isSendOrigEng: false,
            docDate: now
        };

        if (paymentType === 1) {
            payload.receiptDetails.cashItems = [{ sum: parsedAmount, date: now }];
        } else {
            payload.receiptDetails.otherPaymentItems = [{ sum: parsedAmount, date: now, description: "Card" }];
        }

        const sbResponse = await fetch(`${SB_BASE}/documents/create`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const result = await safeJson(sbResponse);
        if (!sbResponse.ok) {
            return res.status(sbResponse.status || 502).json({
                error: result.message || "Smartbee document create failed",
                details: result
            });
        }

        return res.status(200).json(result);
    } catch (error) {
        return res.status(500).json({ error: error.message || "Unexpected server error" });
    }
}
