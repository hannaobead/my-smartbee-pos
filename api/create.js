const SB_BASE = process.env.SMARTBEE_BASE_URL || "https://test.smartbee.co.il/api/v1";
const SMARTBEE_CLIENT_ID = process.env.SMARTBEE_CLIENT_ID;
const SMARTBEE_PASSWORD = process.env.SMARTBEE_PASSWORD;
const SMARTBEE_PROVIDER_USER_TOKEN = process.env.SMARTBEE_PROVIDER_USER_TOKEN;
const AUTH_TIMEOUT_MS = 8000;
const CREATE_TIMEOUT_MS = 12000;
const SEARCH_TIMEOUT_MS = 3500;

async function safeJson(response) {
    const text = await response.text();
    try {
        return text ? JSON.parse(text) : {};
    } catch {
        return { message: text || "Invalid JSON response" };
    }
}

async function fetchWithTimeout(url, options, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}

async function resolveDocumentIndex({ token, uniqueId, nowIso, amount }) {
    const fromDate = new Date(Date.parse(nowIso) - 1000 * 60 * 15).toISOString();
    const payload = {
        producibleDocumentType: "InvoiceReceipt",
        includeDeleted: false,
        providerUserToken: SMARTBEE_PROVIDER_USER_TOKEN,
        page: 1,
        amountPerPage: 50,
        sortingField: "docDate",
        sortDirection: "Descending",
        fromDate,
        toDate: new Date().toISOString()
    };

    const searchResp = await fetchWithTimeout(`${SB_BASE}/documents/search`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
    }, SEARCH_TIMEOUT_MS);
    const searchData = await safeJson(searchResp);
    const items = searchData?.result?.items || [];

    const matched = items.find((doc) => {
        const comments = String(doc?.comments || "");
        if (!comments.includes(uniqueId)) return false;

        const totalPaid = Number(doc?.receiptDetails?.totalPaid || 0);
        const totalInvoice = Number(doc?.invoiceDetails?.total || 0);
        const docTotal = Number.isFinite(totalPaid) && totalPaid > 0 ? totalPaid : totalInvoice;
        return Number.isFinite(docTotal) && Math.abs(docTotal - amount) < 0.02;
    });

    return matched?.index || null;
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
        const auth = await fetchWithTimeout(`${SB_BASE}/login/authenticate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                clientId: SMARTBEE_CLIENT_ID,
                password: SMARTBEE_PASSWORD
            })
        }, AUTH_TIMEOUT_MS);

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
            title: "POS",
            comments: `SOURCE:POS|${uniqueId}`,
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

        const sbResponse = await fetchWithTimeout(`${SB_BASE}/documents/create`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        }, CREATE_TIMEOUT_MS);

        const result = await safeJson(sbResponse);
        if (!sbResponse.ok) {
            return res.status(sbResponse.status || 502).json({
                error: result.message || "Smartbee document create failed",
                details: result
            });
        }
        let resolvedIndex = null;
        if (result?.result && typeof result.result === "object" && Number.isFinite(Number(result.result.index))) {
            resolvedIndex = Number(result.result.index);
        } else if (Number.isFinite(Number(result?.result))) {
            resolvedIndex = Number(result.result);
        } else if (result?.resultCodeId === 101 || result?.resultCodeId === 102) {
            try {
                resolvedIndex = await resolveDocumentIndex({
                    token,
                    uniqueId,
                    nowIso: now,
                    amount: parsedAmount
                });
            } catch {
                resolvedIndex = null;
            }
        }

        return res.status(200).json({
            ...result,
            result: {
                raw: result?.result ?? null,
                index: resolvedIndex
            }
        });
    } catch (error) {
        return res.status(500).json({ error: error.message || "Unexpected server error" });
    }
}
