const readline = require("readline");
const https = require("https");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log("🚀 Calendly Integration Setup");
console.log("============================");
console.log("");

// Check environment variables
const requiredVars = ["CALENDLY_CLIENT_ID", "CALENDLY_CLIENT_SECRET"];

const missingVars = requiredVars.filter((varName) => !process.env[varName]);

if (missingVars.length > 0) {
  console.error("❌ Missing required environment variables:");
  missingVars.forEach((varName) => console.error(`   - ${varName}`));
  console.error("");
  console.error(
    "Please set these variables in your .env.local file and try again."
  );
  process.exit(1);
}

console.log("✅ Environment variables found");
console.log("");

async function testConnection() {
  return new Promise((resolve) => {
    console.log("🔍 Testing Calendly API connection...");

    // Test with access token if available
    const accessToken = process.env.CALENDLY_ACCESS_TOKEN;
    if (!accessToken) {
      console.log(
        "⚠️  No CALENDLY_ACCESS_TOKEN found. You may need to run the OAuth setup first."
      );
      resolve(false);
      return;
    }

    const options = {
      hostname: "api.calendly.com",
      port: 443,
      path: "/users/me",
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    };

    const req = https.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        if (res.statusCode === 200) {
          console.log("✅ Calendly API connection successful");
          resolve(true);
        } else {
          console.log("❌ Calendly API connection failed");
          console.log(`Status: ${res.statusCode}`);
          console.log(`Response: ${data}`);
          resolve(false);
        }
      });
    });

    req.on("error", (err) => {
      console.log("❌ Calendly API connection failed:", err.message);
      resolve(false);
    });

    req.end();
  });
}

async function listEventTypes() {
  return new Promise((resolve) => {
    const accessToken = process.env.CALENDLY_ACCESS_TOKEN;
    if (!accessToken) {
      console.log("⚠️  Skipping event types check - no access token");
      resolve([]);
      return;
    }

    console.log("📋 Fetching event types...");

    const options = {
      hostname: "api.calendly.com",
      port: 443,
      path: "/user_event_types",
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    };

    const req = https.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        if (res.statusCode === 200) {
          try {
            const response = JSON.parse(data);
            const eventTypes = response.collection || [];

            if (eventTypes.length > 0) {
              console.log("✅ Found event types:");
              eventTypes.forEach((et, index) => {
                console.log(`   ${index + 1}. ${et.name} (${et.slug})`);
              });
            } else {
              console.log("⚠️  No event types found");
            }

            resolve(eventTypes);
          } catch (err) {
            console.log("❌ Failed to parse event types response");
            resolve([]);
          }
        } else {
          console.log("❌ Failed to fetch event types");
          resolve([]);
        }
      });
    });

    req.on("error", (err) => {
      console.log("❌ Failed to fetch event types:", err.message);
      resolve([]);
    });

    req.end();
  });
}

async function checkWebhooks() {
  return new Promise((resolve) => {
    const accessToken = process.env.CALENDLY_ACCESS_TOKEN;
    if (!accessToken) {
      console.log("⚠️  Skipping webhooks check - no access token");
      resolve([]);
      return;
    }

    console.log("🔗 Checking existing webhooks...");

    const options = {
      hostname: "api.calendly.com",
      port: 443,
      path: "/webhook_subscriptions",
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    };

    const req = https.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        if (res.statusCode === 200) {
          try {
            const response = JSON.parse(data);
            const webhooks = response.collection || [];

            if (webhooks.length > 0) {
              console.log("✅ Found webhooks:");
              webhooks.forEach((webhook, index) => {
                console.log(
                  `   ${index + 1}. ${webhook.url} (${webhook.events.join(", ")})`
                );
              });
            } else {
              console.log("⚠️  No webhooks found");
            }

            resolve(webhooks);
          } catch (err) {
            console.log("❌ Failed to parse webhooks response");
            resolve([]);
          }
        } else {
          console.log("❌ Failed to fetch webhooks");
          resolve([]);
        }
      });
    });

    req.on("error", (err) => {
      console.log("❌ Failed to fetch webhooks:", err.message);
      resolve([]);
    });

    req.end();
  });
}

async function main() {
  try {
    // Test API connection
    const connectionOk = await testConnection();

    if (!connectionOk) {
      console.log("");
      console.log("💡 To fix connection issues:");
      console.log("1. Run: node scripts/setup-calendly-oauth.js");
      console.log("2. Follow the OAuth flow to get an access token");
      console.log("3. Add CALENDLY_ACCESS_TOKEN to your .env.local file");
      console.log("");
    }

    // List event types
    const eventTypes = await listEventTypes();

    if (eventTypes.length === 0) {
      console.log("");
      console.log("💡 To create event types:");
      console.log("1. Go to your Calendly dashboard");
      console.log("2. Create two event types:");
      console.log("   - Pre-test Genetic Counseling");
      console.log("   - Post-test Genetic Counseling");
      console.log("3. Note the slugs and add them to your .env.local file:");
      console.log("   CALENDLY_PRE_TEST_EVENT_SLUG=your-pre-test-slug");
      console.log("   CALENDLY_POST_TEST_EVENT_SLUG=your-post-test-slug");
      console.log("");
    }

    // Check webhooks
    const webhooks = await checkWebhooks();

    if (webhooks.length === 0) {
      console.log("");
      console.log("💡 To set up webhooks:");
      console.log("1. Set CALENDLY_WEBHOOK_URL in your .env.local file");
      console.log("2. Run: node scripts/setup-calendly-webhooks.js");
      console.log("");
    }

    console.log("🎉 Setup check complete!");
    console.log("");
    console.log("📝 Next steps:");
    console.log("1. Test the integration: GET /api/calendly/test");
    console.log("2. Try booking a session through the UI");
    console.log("3. Verify webhooks are working by checking the logs");
  } catch (error) {
    console.error("❌ Setup check failed:", error.message);
  } finally {
    rl.close();
  }
}

main();
