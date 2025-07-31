const https = require("https");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Configuration
const WEBHOOK_URL =
  process.env.CALENDLY_WEBHOOK_URL ||
  "https://your-domain.com/api/webhooks/calendly";

console.log("🚀 Calendly Webhook Setup");
console.log("========================");
console.log(`Webhook URL: ${WEBHOOK_URL}`);
console.log("");

// Function to get access token from database
async function getAccessToken() {
  try {
    const tokenRecord = await prisma.calendlyToken.findFirst({
      orderBy: { createdAt: "desc" },
    });

    if (tokenRecord && tokenRecord.expiresAt > new Date()) {
      return tokenRecord.accessToken;
    }
  } catch (error) {
    console.error("Error getting stored token:", error);
  }

  // Fallback to environment variable
  const token = process.env.CALENDLY_ACCESS_TOKEN;
  if (!token) {
    throw new Error(
      "No valid Calendly access token found. Please authenticate first."
    );
  }
  return token;
}

// Function to make API requests
function makeApiRequest(endpoint, method = "GET", data = null) {
  return new Promise(async (resolve, reject) => {
    const token = await getAccessToken();

    const options = {
      hostname: "api.calendly.com",
      port: 443,
      path: endpoint,
      method: method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    };

    let postData = null;
    if (data) {
      postData = JSON.stringify(data, null, 2);
      options.headers["Content-Length"] = Buffer.byteLength(postData);
      console.log("--- Payload being sent to Calendly ---");
      console.log(postData);
      console.log("--------------------------------------");
    }

    const req = https.request(options, (res) => {
      let responseData = "";

      res.on("data", (chunk) => {
        responseData += chunk;
      });

      res.on("end", () => {
        console.log("--- Calendly API Response ---");
        console.log(responseData);
        console.log("-----------------------------");
        try {
          const response = JSON.parse(responseData);

          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(response);
          } else {
            reject(
              new Error(
                `API error ${res.statusCode}: ${response.message || responseData}`
              )
            );
          }
        } catch (err) {
          reject(
            new Error(
              `Failed to parse response: ${err.message}\nRaw response: ${responseData}`
            )
          );
        }
      });
    });

    req.on("error", (err) => {
      reject(new Error(`Request failed: ${err.message}`));
    });

    if (postData) {
      req.write(postData);
    }

    req.end();
  });
}

// Fetch the current user's organization URI
async function getCurrentOrganizationUri() {
  try {
    console.log("🔎 Fetching current user and organization URI...");
    const response = await makeApiRequest("/users/me");
    if (response.resource && response.resource.current_organization) {
      console.log(
        `Current organization URI: ${response.resource.current_organization}`
      );
      return response.resource.current_organization;
    } else {
      throw new Error("No organization found for current user");
    }
  } catch (error) {
    console.error("❌ Failed to get organization URI:", error.message);
    throw error;
  }
}

// List existing webhooks
async function listWebhooks() {
  try {
    console.log("📋 Listing existing webhooks...");

    // Get organization URI first
    const organizationUri = await getCurrentOrganizationUri();

    // List webhooks for the organization and scope
    const response = await makeApiRequest(
      `/webhook_subscriptions?organization=${encodeURIComponent(organizationUri)}&scope=organization`
    );

    if (response.collection && response.collection.length > 0) {
      console.log("Found existing webhooks:");
      response.collection.forEach((webhook, index) => {
        console.log(
          `   ${index + 1}. ${webhook.url} (${webhook.events.join(", ")})`
        );
      });
      return response.collection;
    } else {
      console.log("No existing webhooks found");
      return [];
    }
  } catch (error) {
    console.error("❌ Failed to list webhooks:", error.message);
    throw error;
  }
}

// Create a new webhook
async function createWebhook(url, events, organizationUri) {
  try {
    console.log("🔗 Creating new webhook...");

    const webhookData = {
      url: url,
      events: events,
      organization: organizationUri,
      scope: "organization",
    };

    console.log(`Using webhook URL: ${url}`);
    console.log(`Using organization URI: ${organizationUri}`);
    console.log(`Using scope: organization`);

    const response = await makeApiRequest(
      "/webhook_subscriptions",
      "POST",
      webhookData
    );

    console.log("✅ Webhook created successfully!");
    console.log(`Webhook ID: ${response.resource.uri}`);
    console.log("Full webhook response:");
    console.log(JSON.stringify(response.resource, null, 2));

    // Check for signing key in different possible locations
    const signingKey =
      response.resource.signing_key ||
      response.resource.webhook_secret ||
      response.resource.secret ||
      response.signing_key ||
      response.webhook_secret ||
      response.secret;

    if (signingKey) {
      console.log(`Signing Key: ${signingKey}`);
      console.log("");
      console.log("📝 Add this signing key to your .env.local file:");
      console.log(`CALENDLY_WEBHOOK_SIGNING_KEY=${signingKey}`);
    } else {
      console.log("⚠️  No signing key found in response. You may need to:");
      console.log("1. Check the Calendly Developer Portal for the signing key");
      console.log("2. Or use a different method to retrieve the signing key");
      console.log("3. Or the webhook may not require signature verification");
    }
    console.log("");

    return response.resource;
  } catch (error) {
    console.error("❌ Failed to create webhook:", error.message);
    throw error;
  }
}

// Main function
async function setupWebhooks() {
  try {
    // List existing webhooks
    const existingWebhooks = await listWebhooks();

    // Check if webhook already exists for our URL
    const existingWebhook = existingWebhooks.find(
      (webhook) => webhook.url === WEBHOOK_URL
    );

    if (existingWebhook) {
      console.log("⚠️  Webhook already exists for this URL.");
      console.log("Existing webhook details:");
      console.log(`URL: ${existingWebhook.url}`);
      console.log(`Events: ${existingWebhook.events.join(", ")}`);
      console.log(`Signing Key: ${existingWebhook.signing_key}`);
      console.log("");
      console.log("📝 Add this signing key to your .env.local file:");
      console.log(
        `CALENDLY_WEBHOOK_SIGNING_KEY=${existingWebhook.signing_key}`
      );
      console.log("");
      return;
    }

    // Get the current user's organization URI
    const organizationUri = await getCurrentOrganizationUri();

    // Create new webhook
    const events = ["invitee.created", "invitee.canceled"];
    const newWebhook = await createWebhook(
      WEBHOOK_URL,
      events,
      organizationUri
    );

    console.log("📝 Add this signing key to your .env.local file:");
    console.log(`CALENDLY_WEBHOOK_SIGNING_KEY=${newWebhook.signing_key}`);
    console.log("");
    console.log("🎉 Webhook setup complete!");
  } catch (error) {
    console.error("❌ Setup failed:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

setupWebhooks();
