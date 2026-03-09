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

function toIntInRange(value, fallback, min, max) {
    const parsed = Number.parseInt(String(value), 10);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(max, Math.max(min, parsed));
}

function isValidIsoDate(value) {
    if (!value || typeof value !== "string") return false;
    const d = new Date(value);
    return !Number.isNaN(d.getTime());
}

function isPosDocument(doc) {
    const title = (doc?.title || "").toUpperCase();
    const comments = (doc?.comments || "").toUpperCase();
    const customerName = (doc?.customer?.name || "").toUpperCase();
    const descriptions = (doc?.documentItems?.paymentItems || [])
        .map((item) => (item?.description || "").toUpperCase());

    return (
        title.includes("POS") ||
        comments.includes("SOURCE:POS") ||
        customerName === "GENERAL CUSTOMER" ||
        customerName === "לקוח כללי" ||
        descriptions.some((d) => d.includes("POS SALE") || d.includes("מכירה בקופה"))
    );
}

function toAmount(doc) {
    const items = doc?.documentItems?.paymentItems || [];
    const total = items.reduce((sum, item) => {
        const qty = Number(item?.quantity || 0);
        const price = Number(item?.pricePerUnit || 0);
        return sum + (Number.isFinite(qty) && Number.isFinite(price) ? qty * price : 0);
    }, 0);
    return Number(total.toFixed(2));
}

export default async function handler(req, res) {
    if (req.method !== "GET") return res.status(405).send("Method Not Allowed");

    if (!SMARTBEE_CLIENT_ID || !SMARTBEE_PASSWORD || !SMARTBEE_PROVIDER_USER_TOKEN) {
        return res.status(500).json({ error: "Missing Smartbee environment variables" });
    }

    const page = toIntInRange(req.query?.page, 1, 1, 100000);
    const amountPerPage = toIntInRange(req.query?.amountPerPage, 20, 1, 100);
    const fromDate = isValidIsoDate(req.query?.fromDate) ? req.query.fromDate : undefined;
    const toDate = isValidIsoDate(req.query?.toDate) ? req.query.toDate : undefined;

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

        const basePayload = {
            includeDeleted: false,
            providerUserToken: SMARTBEE_PROVIDER_USER_TOKEN,
            page,
            amountPerPage,
            sortingField: "docDate",
            sortDirection: "Descending"
        };
        if (fromDate) basePayload.fromDate = fromDate;
        if (toDate) basePayload.toDate = toDate;

        const payloadAttempts = [
            { ...basePayload, producibleDocumentType: "InvoiceReceipt" },
            { ...basePayload, docType: "InvoiceReceipt" },
            { ...basePayload }
        ];

        let result = null;
        let lastError = null;

        for (const payload of payloadAttempts) {
            const sbResponse = await fetch(`${SB_BASE}/documents/search`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${authData.token}`
                },
                body: JSON.stringify(payload)
            });
            const parsed = await safeJson(sbResponse);

            const hasResultPayload = !!parsed?.result;
            if (sbResponse.ok && hasResultPayload) {
                result = parsed;
                break;
            }

            lastError = {
                status: sbResponse.status || 502,
                resultCodeId: parsed?.resultCodeId,
                message: parsed?.message,
                details: parsed
            };
        }

        if (!result) {
            const statusCode = lastError?.resultCodeId === 94 ? 403 : (lastError?.status || 502);
            return res.status(statusCode).json({
                error: lastError?.message || "Smartbee documents search failed",
                resultCodeId: lastError?.resultCodeId,
                details: lastError?.details
            });
        }

        const items = result?.result?.items || [];
        const posItems = items
            .filter(isPosDocument)
            .map((doc) => ({
                id: doc.id || "",
                index: doc.index || "",
                docDate: doc.docDate || doc.creationDate || null,
                amount: toAmount(doc),
                docType: doc.docType || "",
                customerName: doc?.customer?.name || "",
                source: doc?.comments || doc?.title || ""
            }));

        return res.status(200).json({
            resultCodeId: result.resultCodeId || 0,
            totalItemCount: result?.result?.totalItemCount || 0,
            page: result?.result?.page || page,
            amountPerPage: result?.result?.amountPerPage || amountPerPage,
            items: posItems
        });
    } catch (error) {
        return res.status(500).json({ error: error.message || "Unexpected server error" });
    }
}
