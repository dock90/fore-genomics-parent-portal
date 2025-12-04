import { NextRequest, NextResponse } from "next/server";
import { calendlyService } from "@/lib/calendly";

export async function GET(request: NextRequest) {
  try {
    // Test basic connectivity using the service

    // Test /users/me endpoint through the service
    const userResponse = await calendlyService.makeRequest("/users/me");

    return NextResponse.json({
      success: true,
      message: "Basic API connectivity works",
      userData: userResponse,
      nextSteps: "Try /api/calendly/test for full integration test",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
