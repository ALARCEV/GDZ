type AuditPayload = Record<string, unknown>;

function writeAuditLog(event: string, payload: AuditPayload) {
  console.info(
    JSON.stringify({
      level: "info",
      channel: "audit",
      event,
      payload,
      timestamp: new Date().toISOString()
    })
  );
}

export const auditLogger = {
  capture(event: string, payload: AuditPayload) {
    writeAuditLog(`capture.${event}`, payload);
  },
  consent(event: string, payload: AuditPayload) {
    writeAuditLog(`consent.${event}`, payload);
  }
};
