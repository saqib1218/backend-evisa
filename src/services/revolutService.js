const crypto = require("crypto");
const config = require("../config");

const WEBHOOK_TOLERANCE_MS = 5 * 60 * 1000;

if (!config.revolut.secretKey) {
  console.warn("REVOLUT_SECRET_KEY not configured. Revolut payments will not work.");
}

function ensureConfigured() {
  if (!config.revolut.secretKey) {
    throw { status: 500, message: "Payment provider is not configured" };
  }
}

async function revolutRequest(method, path, body) {
  ensureConfigured();

  const res = await fetch(`${config.revolut.apiUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${config.revolut.secretKey}`,
      "Revolut-Api-Version": config.revolut.apiVersion,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const err = new Error(`Revolut API ${method} ${path} failed with ${res.status}: ${data?.message || text}`);
    err.status = res.status;
    err.response = data;
    throw err;
  }

  return data;
}

const RevolutService = {
  /**
   * Creates a Revolut order for the given pending application and returns
   * the order object (including `id` and `checkout_url`).
   */
  async createOrder({ pendingApplicationId, amountInSmallestUnit, currency, description, customerEmail }) {
    return revolutRequest("POST", "/api/orders", {
      amount: amountInSmallestUnit,
      currency: currency.toUpperCase(),
      description,
      customer: customerEmail ? { email: customerEmail } : undefined,
      merchant_order_data: { reference: pendingApplicationId },
      metadata: { pendingApplicationId },
      redirect_url: `${config.frontendUrl}/payment/success?session_id=${pendingApplicationId}`,
      expire_pending_after: "PT30M",
    });
  },

  async retrieveOrder(orderId) {
    return revolutRequest("GET", `/api/orders/${encodeURIComponent(orderId)}`);
  },

  /**
   * Verifies a Revolut webhook using the raw request body and the
   * Revolut-Request-Timestamp / Revolut-Signature headers.
   * Throws if the signature or timestamp is invalid.
   */
  verifyWebhookSignature(rawBody, timestamp, signatureHeader) {
    if (!config.revolut.webhookSigningSecret) {
      throw new Error("Webhook signing secret is not configured");
    }
    if (!timestamp || !signatureHeader) {
      throw new Error("Missing Revolut signature headers");
    }

    const ts = Number(timestamp);
    if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > WEBHOOK_TOLERANCE_MS) {
      throw new Error("Webhook timestamp outside tolerance");
    }

    const payload = Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : String(rawBody);
    const expected = "v1=" + crypto
      .createHmac("sha256", config.revolut.webhookSigningSecret)
      .update(`v1.${timestamp}.${payload}`)
      .digest("hex");
    const expectedBuf = Buffer.from(expected);

    const valid = signatureHeader
      .split(",")
      .map((s) => s.trim())
      .some((sig) => {
        const sigBuf = Buffer.from(sig);
        return sigBuf.length === expectedBuf.length && crypto.timingSafeEqual(sigBuf, expectedBuf);
      });

    if (!valid) {
      throw new Error("Invalid Revolut webhook signature");
    }
  },
};

module.exports = RevolutService;
