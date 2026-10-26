/**
 * TheGate Real-Time SSE Telemetry EventBus
 * Broadcasts live inference events to Pixel Office and Dashboard clients.
 */

const { EventEmitter } = require("events");

class TelemetryEventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(200);
    this.clients = new Set();
  }

  addClient(reply) {
    this.clients.add(reply);

    // Initial keepalive comment
    try {
      reply.raw.write(": connected to TheGate Real-Time Telemetry EventBus\n\n");
    } catch {}

    const remove = () => {
      this.clients.delete(reply);
    };

    reply.raw.on("close", remove);
    reply.raw.on("error", remove);
  }

  broadcast(eventType, data = {}) {
    const payload = JSON.stringify({
      event: eventType,
      timestamp: new Date().toISOString(),
      ...data,
    });
    const sseMessage = `event: ${eventType}\ndata: ${payload}\n\n`;

    for (const client of this.clients) {
      try {
        client.raw.write(sseMessage);
      } catch {
        this.clients.delete(client);
      }
    }
  }

  // Periodic heartbeat every 15s to keep connections alive
  startHeartbeat() {
    if (this._heartbeatInterval) return;
    this._heartbeatInterval = setInterval(() => {
      for (const client of this.clients) {
        try {
          client.raw.write(": ping\n\n");
        } catch {
          this.clients.delete(client);
        }
      }
    }, 15000);
    if (this._heartbeatInterval.unref) {
      this._heartbeatInterval.unref();
    }
  }
}

const eventBus = new TelemetryEventBus();
eventBus.startHeartbeat();

module.exports = eventBus;
