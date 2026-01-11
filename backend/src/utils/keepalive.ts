/**
 * Health Check Keepalive Script
 * Prevents Render instance from sleeping by pinging health endpoint every 14 minutes
 */

const HEALTH_CHECK_INTERVAL = 14 * 60 * 1000; // 14 minutes
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

async function checkHealth(retryCount = 0) {
  try {
    const apiUrl = process.env.HEALTH_CHECK_URL || "http://localhost:3001";
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${apiUrl}/health`, {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      console.log(`[${new Date().toISOString()}] Health check passed`, data);
      return true;
    } else {
      throw new Error(`Health check returned ${response.status}`);
    }
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Health check failed (attempt ${retryCount + 1}/${MAX_RETRIES}):`,
      error instanceof Error ? error.message : error
    );

    if (retryCount < MAX_RETRIES - 1) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
      return checkHealth(retryCount + 1);
    }
    return false;
  }
}

function startKeepalive() {
  console.log(
    `Starting keepalive health checks every ${HEALTH_CHECK_INTERVAL / 1000 / 60} minutes`
  );

  // Run immediately
  checkHealth();

  // Run periodically
  setInterval(checkHealth, HEALTH_CHECK_INTERVAL);
}

// Export for use in server
export { startKeepalive };

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startKeepalive();
}
