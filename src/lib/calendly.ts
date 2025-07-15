import { prisma } from './prisma';

interface CalendlyEventType {
  uri: string;
  name: string;
  active: boolean;
  slug: string;
  scheduling_url: string;
}

interface CalendlyInvitee {
  uri: string;
  email: string;
  name: string;
  start_time: string;
  end_time: string;
  status: string;
}

class CalendlyService {
  private clientId: string;
  private clientSecret: string;
  private accessToken: string | null = null;
  private tokenExpiry: number | null = null;

  constructor() {
    this.clientId = process.env.CALENDLY_CLIENT_ID || '';
    this.clientSecret = process.env.CALENDLY_CLIENT_SECRET || '';
  }

  private async getAccessToken(): Promise<string> {
    // Check if we have a valid token
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    // Get stored token from database or environment
    const storedToken = await this.getStoredToken();
    if (storedToken && storedToken.expiresAt > new Date()) {
      this.accessToken = storedToken.accessToken;
      this.tokenExpiry = storedToken.expiresAt.getTime();
      return this.accessToken;
    }

    throw new Error('No valid Calendly access token found. Please authenticate first.');
  }

  private async getStoredToken() {
    // For now, we'll use environment variable
    // In production, you might want to store this in your database
    const token = process.env.CALENDLY_ACCESS_TOKEN;
    const expiresAt = process.env.CALENDLY_TOKEN_EXPIRES_AT;
    
    if (token && expiresAt) {
      return {
        accessToken: token,
        expiresAt: new Date(expiresAt)
      };
    }
    
    return null;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const token = await this.getAccessToken();
    
    const response = await fetch(`https://api.calendly.com${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Calendly API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async getEventTypes(): Promise<CalendlyEventType[]> {
    // Get the current user's organization URI first
    const userResponse = await this.makeRequest('/users/me');
    const organizationUri = userResponse.resource?.current_organization;
    
    if (!organizationUri) {
      throw new Error('No organization found for current user');
    }
    
    // Fetch event types for the organization
    const response = await this.makeRequest(`/event_types?organization=${encodeURIComponent(organizationUri)}`);
    return response.collection || [];
  }

  async getEventTypeBySlug(slug: string): Promise<CalendlyEventType | null> {
    const eventTypes = await this.getEventTypes();
    return eventTypes.find(et => et.slug === slug) || null;
  }

  async createInvitee(eventTypeUri: string, inviteeData: {
    email: string;
    name: string;
    start_time: string;
    end_time: string;
  }): Promise<CalendlyInvitee> {
    const response = await this.makeRequest('/invitees', {
      method: 'POST',
      body: JSON.stringify({
        event_type: eventTypeUri,
        invitee: inviteeData
      }),
    });

    return response.resource;
  }

  async cancelInvitee(inviteeUri: string, reason?: string): Promise<void> {
    await this.makeRequest(`/invitees/${inviteeUri}/cancellation`, {
      method: 'POST',
      body: JSON.stringify({
        reason: reason || 'Cancelled by user'
      }),
    });
  }

  async getInvitee(inviteeUri: string): Promise<CalendlyInvitee> {
    const response = await this.makeRequest(`/invitees/${inviteeUri}`);
    return response.resource;
  }

  // Helper method to get scheduling URL for a specific event type
  async getSchedulingUrl(eventTypeSlug: string): Promise<string | null> {
    const eventType = await this.getEventTypeBySlug(eventTypeSlug);
    return eventType?.scheduling_url || null;
  }

  // Get user's event types (for the authenticated user)
  async getUserEventTypes(): Promise<CalendlyEventType[]> {
    const response = await this.makeRequest('/user_event_types');
    return response.collection || [];
  }
}

export const calendlyService = new CalendlyService(); 