const https = require('https');

// Configuration
const ACCESS_TOKEN = process.env.CALENDLY_ACCESS_TOKEN;
const WEBHOOK_URL = process.env.CALENDLY_WEBHOOK_URL || 'https://your-domain.com/api/webhooks/calendly';

if (!ACCESS_TOKEN) {
  console.error('❌ CALENDLY_ACCESS_TOKEN must be set in environment variables');
  process.exit(1);
}

console.log('🚀 Calendly Webhook Setup');
console.log('========================');
console.log(`Webhook URL: ${WEBHOOK_URL}`);
console.log('');

// Function to make API requests
function makeApiRequest(endpoint, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.calendly.com',
      port: 443,
      path: endpoint,
      method: method,
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      }
    };

    let postData = null;
    if (data) {
      postData = JSON.stringify(data, null, 2);
      options.headers['Content-Length'] = Buffer.byteLength(postData);
      // Log the payload for debugging
      console.log('--- Payload being sent to Calendly ---');
      console.log(postData);
      console.log('--------------------------------------');
    }

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        // Log the full response for debugging
        console.log('--- Calendly API Response ---');
        console.log(responseData);
        console.log('-----------------------------');
        try {
          const response = JSON.parse(responseData);
          
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(response);
          } else {
            reject(new Error(`API error ${res.statusCode}: ${response.message || responseData}`));
          }
        } catch (err) {
          reject(new Error(`Failed to parse response: ${err.message}\nRaw response: ${responseData}`));
        }
      });
    });

    req.on('error', (err) => {
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
    console.log('🔎 Fetching current user and organization URI...');
    const response = await makeApiRequest('/users/me');
    if (response.resource && response.resource.current_organization) {
      console.log(`Current organization URI: ${response.resource.current_organization}`);
      return response.resource.current_organization;
    } else {
      throw new Error('Could not get organization URI from /users/me');
    }
  } catch (error) {
    console.error('❌ Failed to fetch organization URI:', error.message);
    process.exit(1);
  }
}

// Function to list existing webhooks
async function listWebhooks() {
  try {
    console.log('📋 Listing existing webhooks...');
    const response = await makeApiRequest('/webhook_subscriptions');
    
    if (response.collection && response.collection.length > 0) {
      console.log('Found existing webhooks:');
      response.collection.forEach((webhook, index) => {
        console.log(`${index + 1}. ${webhook.url} (${webhook.events.join(', ')})`);
      });
      console.log('');
    } else {
      console.log('No existing webhooks found.');
      console.log('');
    }
    
    return response.collection || [];
  } catch (error) {
    console.error('❌ Failed to list webhooks:', error.message);
    return [];
  }
}

// Function to create a webhook
async function createWebhook(url, events, organizationUri) {
  try {
    console.log(`🔗 Creating webhook for ${url}...`);
    console.log(`Events: ${events.join(', ')}`);
    
    const webhookData = {
      url: url,
      events: events,
      organization: organizationUri,
      scope: 'organization'
    };

    console.log(`Using webhook URL: ${url}`);
    console.log(`Using organization URI: ${organizationUri}`);
    console.log(`Using scope: organization`);

    const response = await makeApiRequest('/webhook_subscriptions', 'POST', webhookData);
    
    console.log('✅ Webhook created successfully!');
    console.log(`Webhook ID: ${response.resource.uri}`);
    console.log('Full webhook response:');
    console.log(JSON.stringify(response.resource, null, 2));
    
    // Check for signing key in different possible locations
    const signingKey = response.resource.signing_key || 
                      response.resource.webhook_secret || 
                      response.resource.secret ||
                      response.signing_key ||
                      response.webhook_secret ||
                      response.secret;
    
    if (signingKey) {
      console.log(`Signing Key: ${signingKey}`);
      console.log('');
      console.log('📝 Add this signing key to your .env.local file:');
      console.log(`CALENDLY_WEBHOOK_SIGNING_KEY=${signingKey}`);
    } else {
      console.log('⚠️  No signing key found in response. You may need to:');
      console.log('1. Check the Calendly Developer Portal for the signing key');
      console.log('2. Or use a different method to retrieve the signing key');
      console.log('3. Or the webhook may not require signature verification');
    }
    console.log('');
    
    return response.resource;
  } catch (error) {
    console.error('❌ Failed to create webhook:', error.message);
    throw error;
  }
}

// Function to delete a webhook
async function deleteWebhook(webhookUri) {
  try {
    console.log(`🗑️  Deleting webhook: ${webhookUri}`);
    await makeApiRequest(webhookUri, 'DELETE');
    console.log('✅ Webhook deleted successfully!');
    console.log('');
  } catch (error) {
    console.error('❌ Failed to delete webhook:', error.message);
    throw error;
  }
}

// Function to get webhook details including signing key
async function getWebhookDetails(webhookUri) {
  try {
    console.log(`🔍 Fetching webhook details for: ${webhookUri}`);
    const response = await makeApiRequest(webhookUri);
    
    console.log('Full webhook details:');
    console.log(JSON.stringify(response.resource, null, 2));
    
    // Check for signing key in different possible locations
    const signingKey = response.resource.signing_key || 
                      response.resource.webhook_secret || 
                      response.resource.secret ||
                      response.signing_key ||
                      response.webhook_secret ||
                      response.secret;
    
    if (signingKey) {
      console.log(`✅ Signing Key found: ${signingKey}`);
      console.log('');
      console.log('📝 Add this signing key to your .env.local file:');
      console.log(`CALENDLY_WEBHOOK_SIGNING_KEY=${signingKey}`);
    } else {
      console.log('⚠️  No signing key found in webhook details.');
    }
    
    return response.resource;
  } catch (error) {
    console.error('❌ Failed to get webhook details:', error.message);
    throw error;
  }
}

// Main function
async function setupWebhooks() {
  try {
    // List existing webhooks
    const existingWebhooks = await listWebhooks();
    
    // Check if webhook already exists for our URL
    const existingWebhook = existingWebhooks.find(webhook => webhook.url === WEBHOOK_URL);
    
    if (existingWebhook) {
      console.log('⚠️  Webhook already exists for this URL.');
      console.log('Existing webhook details:');
      console.log(`URL: ${existingWebhook.url}`);
      console.log(`Events: ${existingWebhook.events.join(', ')}`);
      console.log(`Signing Key: ${existingWebhook.signing_key}`);
      console.log('');
      console.log('📝 Add this signing key to your .env.local file:');
      console.log(`CALENDLY_WEBHOOK_SIGNING_KEY=${existingWebhook.signing_key}`);
      console.log('');
      return;
    }
    
    // Get the current user's organization URI
    const organizationUri = await getCurrentOrganizationUri();
    
    // Create new webhook
    const events = ['invitee.created', 'invitee.canceled'];
    const newWebhook = await createWebhook(WEBHOOK_URL, events, organizationUri);
    
    console.log('📝 Add this signing key to your .env.local file:');
    console.log(`CALENDLY_WEBHOOK_SIGNING_KEY=${newWebhook.signing_key}`);
    console.log('');
    console.log('🎉 Webhook setup complete!');
    
  } catch (error) {
    console.error('❌ Webhook setup failed:', error.message);
    process.exit(1);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'list':
    listWebhooks();
    break;
  case 'delete':
    const webhookUri = args[1];
    if (!webhookUri) {
      console.error('❌ Please provide webhook URI to delete');
      process.exit(1);
    }
    deleteWebhook(webhookUri);
    break;
  case 'create':
  default:
    setupWebhooks();
    break;
}

// Handle cleanup
process.on('SIGINT', () => {
  console.log('\n👋 Setup cancelled');
  process.exit(0);
}); 