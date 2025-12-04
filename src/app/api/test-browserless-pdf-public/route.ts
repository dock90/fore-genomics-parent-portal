import { NextRequest, NextResponse } from "next/server";
import { consentPDFService } from "@/lib/consent-service";

export async function POST(request: NextRequest) {
  try {
    // Test data for PDF generation
    const testData = {
      userInfo: {
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@example.com",
        address: "123 Main St",
        city: "Anytown",
        state: "CA",
        zipCode: "12345",
        phone: "(555) 123-4567",
      },
      childInfo: {
        firstName: "Jane",
        lastName: "Doe",
        dob: "2020-01-01",
        sex: "Female",
        ethnicities: ["Caucasian", "Hispanic"],
      },
      consentData: {
        part1Accepted: true,
        part2Accepted: true,
        part3Accepted: true,
        consentAll: true,
        signature: null,
        signatureDate: "2025-01-15",
        signerName: "John Doe",
        relationshipToChild: "Father",
        ipAddress: "192.168.1.1",
        userAgent: "Test Browser",
      },
      orderNumber: "TEST-001",
      kitNumber: 1,
    };

    // Generate PDF using the main consent PDF service (which now uses browserless.io in serverless)
    const { pdfBuffer, fileName } =
      await consentPDFService.generateConsentPDF(testData);

    // Return PDF as response
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${fileName}"`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    console.error("Error testing browserless PDF generation:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    return NextResponse.json(
      {
        error: "Failed to generate test PDF",
        details: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
