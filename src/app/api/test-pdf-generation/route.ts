import { NextRequest, NextResponse } from "next/server";
import {
  testTRFGeneration,
  testCombinedDocument,
} from "@/lib/test-pdf-generation";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const downloadType = url.searchParams.get("type");

    if (downloadType === "trf") {
      // Return TRF PDF as download
      const { trfPDFService } = await import("@/lib/trf-service");
      const { testTRFData } = await import("@/lib/test-pdf-generation");

      const result = await trfPDFService.generateTRFPDF(testTRFData);

      return new NextResponse(result.pdfBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${result.fileName}"`,
          "Content-Length": result.pdfBuffer.length.toString(),
        },
      });
    }

    if (downloadType === "combined") {
      // Return combined PDF as download
      const { combinedDocumentService } = await import(
        "@/lib/combined-document-service"
      );
      const { testCombinedData } = await import("@/lib/test-pdf-generation");

      const result =
        await combinedDocumentService.createCombinedDocument(testCombinedData);

      return new NextResponse(result.pdfBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${result.fileName}"`,
          "Content-Length": result.pdfBuffer.length.toString(),
        },
      });
    }

    // Default: run tests and return JSON results

    const trfTest = await testTRFGeneration();
    const combinedTest = await testCombinedDocument();

    const results = {
      trfGeneration: trfTest,
      combinedDocument: combinedTest,
      overall: trfTest && combinedTest,
      timestamp: new Date().toISOString(),
      downloadUrls: {
        trf: `${url.origin}${url.pathname}?type=trf`,
        combined: `${url.origin}${url.pathname}?type=combined`,
      },
    };

    if (results.overall) {
      return NextResponse.json({
        success: true,
        message:
          "All PDF generation tests passed! Use ?type=trf or ?type=combined to download PDFs.",
        results,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          message: "Some PDF generation tests failed",
          results,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Test endpoint failed",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
