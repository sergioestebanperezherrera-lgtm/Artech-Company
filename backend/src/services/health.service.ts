export function getHealthStatus() {
  return {
    status: "ok",
    service: "artech-backend",
    timestamp: new Date().toISOString(),
  };
}
