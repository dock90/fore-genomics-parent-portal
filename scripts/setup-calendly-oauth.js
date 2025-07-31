const readline = require("readline");
const https = require("https");
const http = require("http");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Configuration
const CLIENT_ID = process.env.CALENDLY_CLIENT_ID;
const CLIENT_SECRET = process.env.CALENDLY_CLIENT_SECRET;
const REDIRECT_URI = "http://localhost:3000/api/calendly/oauth/callback";

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error(
    "❌ CALENDLY_CLIENT_ID and CALENDLY_CLIENT_SECRET must be set in environment variables"
  );
  process.exit(1);
}

console.log("🚀 Calendly OAuth2 Setup");
console.log("========================");
console.log(`Client ID: ${CLIENT_ID}`);
console.log(`Redirect URI: ${REDIRECT_URI}`);
console.log("");

// Step 1: Generate authorization URL
const authUrl = `https://auth.calendly.com/oauth/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;

console.log("📋 Step 1: Authorization");
console.log("Open this URL in your browser:");
console.log(authUrl);
console.log("");

// Step 2: Start local server to receive callback
console.log("📡 Step 2: Starting local server to receive callback...");

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:3000`);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    console.error(`❌ Authorization failed: ${error}`);
    res.writeHead(400, { "Content-Type": "text/html" });
    res.end(
      "<h1>Authorization Failed</h1><p>Check the console for details.</p>"
    );
    server.close();
    rl.close();
    return;
  }

  if (code) {
    console.log("✅ Authorization code received");
    console.log("🔄 Exchanging code for access token...");

    // Exchange code for access token
    exchangeCodeForToken(code)
      .then((tokenData) => {
        console.log("✅ Access token received!");
        console.log("");
        console.log("📝 Add these to your .env.local file:");
        console.log(`CALENDLY_ACCESS_TOKEN=${tokenData.access_token}`);
        console.log(
          `CALENDLY_TOKEN_EXPIRES_AT=${new Date(Date.now() + tokenData.expires_in * 1000).toISOString()}`
        );
        console.log("");
        console.log(
          "🔧 You may also want to set up token refresh for production use."
        );

        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(
          "<h1>✅ Authorization Successful!</h1><p>Check the console for your access token.</p>"
        );
      })
      .catch((err) => {
        console.error("❌ Failed to exchange code for token:", err.message);
        res.writeHead(500, { "Content-Type": "text/html" });
        res.end(
          "<h1>❌ Token Exchange Failed</h1><p>Check the console for details.</p>"
        );
      })
      .finally(() => {
        server.close();
        rl.close();
      });
  } else {
    res.writeHead(400, { "Content-Type": "text/html" });
    res.end("<h1>Invalid Request</h1><p>No authorization code received.</p>");
  }
});

server.listen(3000, () => {
  console.log("🌐 Local server running on http://localhost:3000");
  console.log("⏳ Waiting for authorization callback...");
  console.log("");
});

function exchangeCodeForToken(code) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code: code,
      grant_type: "authorization_code",
      redirect_uri: REDIRECT_URI,
    });

    const options = {
      hostname: "auth.calendly.com",
      port: 443,
      path: "/oauth/token",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        try {
          const response = JSON.parse(data);

          if (res.statusCode === 200) {
            resolve(response);
          } else {
            reject(
              new Error(
                `Token exchange failed: ${response.error || "Unknown error"}`
              )
            );
          }
        } catch (err) {
          reject(new Error(`Failed to parse response: ${err.message}`));
        }
      });
    });

    req.on("error", (err) => {
      reject(new Error(`Request failed: ${err.message}`));
    });

    req.write(postData);
    req.end();
  });
}

// Handle cleanup
process.on("SIGINT", () => {
  console.log("\n👋 Setup cancelled");
  server.close();
  rl.close();
  process.exit(0);
});
