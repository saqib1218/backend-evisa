// SSE Manager - maintains active client connections and broadcasts notifications
const clients = new Map();

const SSEManager = {
  addClient(clientId, res) {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    // Send initial heartbeat
    res.write(`data: ${JSON.stringify({ type: "connected" })}\n\n`);

    clients.set(clientId, res);

    res.on("close", () => {
      clients.delete(clientId);
    });
  },

  broadcast(notification) {
    const data = JSON.stringify({ type: "notification", data: notification });
    for (const [clientId, res] of clients.entries()) {
      try {
        res.write(`data: ${data}\n\n`);
      } catch (err) {
        clients.delete(clientId);
      }
    }
  },

  getClientCount() {
    return clients.size;
  },
};

module.exports = SSEManager;
