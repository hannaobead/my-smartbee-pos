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
        descriptions.some((d) => d.includes("POS SALE"))
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

    const page = Math.max(1, Number(req.query?.page || 1));
    const amountPerPage = Math.min(100, Math.max(1, Number(req.query?.amountPerPage || 20)));
    const fromDate = req.query?.fromDate;
    const toDate = req.query?.toDate;

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

        const payload = {
            providerUserToken: SMARTBEE_PROVIDER_USER_TOKEN,
            page,
            amountPerPage,
            sortingField: "docDate",
            sortDirection: "Descending"
        };
        if (fromDate) payload.fromDate = fromDate;
        if (toDate) payload.toDate = toDate;

        const sbResponse = await fetch(`${SB_BASE}/documents/search`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${authData.token}`
            },
            body: JSON.stringify(payload)
        });
        const result = await safeJson(sbResponse);

        if (!sbResponse.ok) {
            return res.status(sbResponse.status || 502).json({
                error: result.message || "Smartbee documents search failed",
                resultCodeId: result.resultCodeId,
                details: result
            });
        }
        if (result.resultCodeId && result.resultCodeId >= 90) {
            const statusCode = result.resultCodeId === 94 ? 403 : 502;
            return res.status(statusCode).json({
                error: result.message || "Smartbee documents search failed",
                resultCodeId: result.resultCodeId,
                details: result
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
