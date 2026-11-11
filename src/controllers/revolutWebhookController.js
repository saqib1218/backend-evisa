const RevolutService = require("../services/revolutService");
const { ApplicationService } = require("../services");

const RevolutWebhookController = {
  async handleWebhook(req, res) {
    const timestamp = req.headers["revolut-request-timestamp"];
    const signature = req.headers["revolut-signature"];

    try {
      // req.body must be the raw, unparsed request body (Buffer) for
      // signature verification to succeed.
      RevolutService.verifyWebhookSignature(req.body, timestamp, signature);
    } catch (err) {
      console.error("Revolut webhook signature verification failed:", err.message);
      return res.status(400).json({ error: "Invalid signature" });
    }

    let event;
    try {
      event = JSON.parse(req.body.toString("utf8"));
    } catch {
      return res.status(400).json({ error: "Invalid payload" });
    }

    const orderId = event?.order_id;
    if (!orderId) {
      return res.status(200).json({ received: true });
    }

    try {
      switch (event.event) {
        case "ORDER_COMPLETED": {
          // Never trust the webhook payload for amounts/state — fetch the
          // order from Revolut and verify it.
          const order = await RevolutService.retrieveOrder(orderId);
          await ApplicationService.confirmRevolutPayment(order);
          break;
        }
        case "ORDER_CANCELLED":
        case "ORDER_FAILED": {
          const order = await RevolutService.retrieveOrder(orderId);
          if (order?.state === "cancelled" || order?.state === "failed") {
            await ApplicationService.expirePendingApplication(order);
          }
          break;
        }
        default:
          // Unhandled event types are acknowledged but ignored
          break;
      }

      return res.status(200).json({ received: true });
    } catch (err) {
      console.error(`Revolut webhook: error processing event ${event.event}:`, err.message);
      // Return 500 so Revolut retries; the pending-record claim prevents
      // duplicate side effects on retry.
      return res.status(500).json({ error: "Failed to process event" });
    }
  },
};

module.exports = RevolutWebhookController;
