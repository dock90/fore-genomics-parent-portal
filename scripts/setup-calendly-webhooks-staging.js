const { calendlyService } = require('../src/lib/calendly');

// Configuration for staging
const WEBHOOK_URL = 'https://fore-genomics-parent-portal-env-staging-adam-lands-projects.vercel.app/api/webhooks/calendly';

console.log('🚀 Calendly Webhook Setup - Staging');
console.log('===================================');
console.log(`Webhook URL: ${WEBHOOK_URL}`);
console.log('');

// Function to make API requests using the service
async function makeApiRequest(endpoint, method = 'GET', data = null) {
  try {
    if (method === 'GET') {
      return await calendlyService.makeRequest(endpoint);
    } else {
      return await calendlyService.makeRequest(endpoint, {
        method: method,
        body: data ? JSON.stringify(data) : undefined
      });
    }
  } catch (error) {
    throw new Error(`API request failed: ${error.message}`);
  }
}

// Fetch the current user's organization URI
async function getCurrentOrganizationUri() {
  try {
    console.log('🔎 Fetching current user and organization URI...');
    const response = await calendlyService.makeRequest('/users/me');
    if (response.resource && response.resource.current_organization) {
      console.log(`Current organization URI: ${response.resource.current_organization}`);
      return response.resource.current_organization;
    } else {
      throw new Error('No organization found for current user');
    }
  } catch (error) {
    console.error('❌ Failed to get organization URI:', error.message);
    throw error;
  }
}

// List existing webhooks
async function listWebhooks() {
  try {
    console.log('📋 Listing existing webhooks...');
    const response = await calendlyService.makeRequest('/webhook_subscriptions');
    
    if (response.collection && response.collection.length > 0) {
      console.log('Found existing webhooks:');
      response.collection.forEach((webhook, index) => {
        console.log(`   ${index + 1}. ${webhook.url} (${webhook.events.join(', ')})`);
      });
      return response.collection;
    } else {
      console.log('No existing webhooks found');
      return [];
    }
  } catch (error) {
    console.error('❌ Failed to list webhooks:', error.message);
    throw error;
  }
}

// Create a new webhook
async function createWebhook(url, events, organizationUri) {
  try {
    console.log('🔗 Creating new webhook...');
    
    const webhookData = {
      url: url,
      events: events,
      organization: organizationUri,
      scope: 'organization'
    };

    console.log(`Using webhook URL: ${url}`);
    console.log(`Using organization URI: ${organizationUri}`);
    console.log(`Using scope: organization`);

    const response = await calendlyService.makeRequest('/webhook_subscriptions', {
      method: 'POST',
      body: JSON.stringify(webhookData)
    });
    
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
      console.log('📝 Add this signing key to your staging environment variables:');
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
      console.log('📝 Add this signing key to your staging environment variables:');
      console.log(`CALENDLY_WEBHOOK_SIGNING_KEY=${existingWebhook.signing_key}`);
      console.log('');
      return;
    }
    
    // Get the current user's organization URI
    const organizationUri = await getCurrentOrganizationUri();
    
    // Create new webhook
    const events = ['invitee.created', 'invitee.canceled'];
    const newWebhook = await createWebhook(WEBHOOK_URL, events, organizationUri);
    
    console.log('📝 Add this signing key to your staging environment variables:');
    console.log(`CALENDLY_WEBHOOK_SIGNING_KEY=${newWebhook.signing_key}`);
    console.log('');
    console.log('🎉 Webhook setup complete!');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
  } finally {
    // The original code had prisma.$disconnect(), but prisma is not defined.
    // Assuming this was intended to be removed or replaced with a placeholder.
    // For now, removing it as it's not defined.
  }
}

setupWebhooks(); 