import { prisma } from "./prisma";
import { isFeatureEnabled } from "./feature-flags";

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

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

class CalendlyService {
  private clientId: string;
  private clientSecret: string;
  private accessToken: string | null = null;
  private tokenExpiry: number | null = null;

  constructor() {
    this.clientId = process.env.CALENDLY_CLIENT_ID || "";
    this.clientSecret = process.env.CALENDLY_CLIENT_SECRET || "";
  }

  private async getAccessToken(): Promise<string> {
    // Check if we have a valid token in memory
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    // Get stored token from database
    const storedToken = await this.getStoredToken();
    if (storedToken && storedToken.expiresAt > new Date()) {
      this.accessToken = storedToken.accessToken;
      this.tokenExpiry = storedToken.expiresAt.getTime();
      return this.accessToken;
    }

    // Token is expired, try to refresh it
    if (storedToken?.refreshToken) {
      try {
        await this.refreshToken(storedToken.refreshToken);
        if (this.accessToken) {
          return this.accessToken;
        }
      } catch (error) {
        console.error("Failed to refresh token:", error);
        // If refresh fails, we need to re-authenticate
        await this.clearStoredToken();
      }
    }

    throw new Error(
      "No valid Calendly access token found. Please authenticate first."
    );
  }

  private async getStoredToken() {
    try {
      // Get the most recent token from database
      const tokenRecord = await prisma.calendlyToken.findFirst({
        orderBy: { createdAt: "desc" },
      });

      if (tokenRecord) {
        return {
          accessToken: tokenRecord.accessToken,
          refreshToken: tokenRecord.refreshToken,
          expiresAt: tokenRecord.expiresAt,
        };
      }
    } catch (error) {
      console.error("Error getting stored token:", error);
    }

    // Fallback to environment variables for development
    const token = process.env.CALENDLY_ACCESS_TOKEN;
    const expiresAt = process.env.CALENDLY_TOKEN_EXPIRES_AT;

    if (token && expiresAt) {
      return {
        accessToken: token,
        expiresAt: new Date(expiresAt),
      };
    }

    return null;
  }

  private async storeToken(tokenData: TokenResponse) {
    try {
      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

      // Store in database
      await prisma.calendlyToken.create({
        data: {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          expiresAt: expiresAt,
        },
      });

      // Update in-memory cache
      this.accessToken = tokenData.access_token;
      this.tokenExpiry = expiresAt.getTime();

      console.log("Calendly token stored successfully");
    } catch (error) {
      console.error("Error storing token:", error);
      throw error;
    }
  }

  private async clearStoredToken() {
    try {
      // Clear from database
      await prisma.calendlyToken.deleteMany();

      // Clear from memory
      this.accessToken = null;
      this.tokenExpiry = null;
    } catch (error) {
      console.error("Error clearing stored token:", error);
    }
  }

  private async refreshToken(refreshToken: string): Promise<void> {
    try {
      const response = await fetch("https://auth.calendly.com/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          refresh_token: refreshToken,
          grant_type: "refresh_token",
        }),
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.status}`);
      }

      const tokenData: TokenResponse = await response.json();

      // Clear old token and store new one
      await this.clearStoredToken();
      await this.storeToken(tokenData);

      console.log("Calendly token refreshed successfully");
    } catch (error) {
      console.error("Error refreshing token:", error);
      throw error;
    }
  }

  public async makeRequest(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<any> {
    if (!isFeatureEnabled("CALENDLY_INTEGRATION")) {
      throw new Error("Calendly integration is disabled");
    }

    const token = await this.getAccessToken();

    const response = await fetch(`https://api.calendly.com${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
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
    const userResponse = await this.makeRequest("/users/me");
    const organizationUri = userResponse.resource?.current_organization;

    if (!organizationUri) {
      throw new Error("No organization found for current user");
    }

    // Fetch event types for the organization
    const response = await this.makeRequest(
      `/event_types?organization=${encodeURIComponent(organizationUri)}`
    );
    return response.collection || [];
  }

  async getEventTypeBySlug(slug: string): Promise<CalendlyEventType | null> {
    const eventTypes = await this.getEventTypes();
    return eventTypes.find((et) => et.slug === slug) || null;
  }

  async createInvitee(
    eventTypeUri: string,
    inviteeData: {
      email: string;
      name: string;
      start_time: string;
      end_time: string;
    }
  ): Promise<CalendlyInvitee> {
    const response = await this.makeRequest("/invitees", {
      method: "POST",
      body: JSON.stringify({
        event_type: eventTypeUri,
        invitee: inviteeData,
      }),
    });

    return response.resource;
  }

  async cancelInvitee(inviteeUri: string, reason?: string): Promise<void> {
    await this.makeRequest(`/invitees/${inviteeUri}/cancellation`, {
      method: "POST",
      body: JSON.stringify({
        reason: reason || "Cancelled by user",
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
}

export const calendlyService = new CalendlyService();
