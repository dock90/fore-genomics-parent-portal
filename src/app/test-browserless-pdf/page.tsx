"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, FileText, AlertCircle } from "lucide-react";

export default function TestBrowserlessPDFPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const testPDFGeneration = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/test-browserless-pdf-public", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.details || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      // Get the PDF blob
      const pdfBlob = await response.blob();

      // Create a download link
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "test-consent.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setSuccess("PDF generated successfully! Check your downloads folder.");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      setError(`Failed to generate PDF: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Test Browserless PDF Generation
          </CardTitle>
          <CardDescription>
            Test the browserless.io PDF generation service for consent forms
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <p>
              This page tests the browserless.io PDF generation service that
              will be used in production.
            </p>
            <p className="mt-2">
              <strong>Requirements:</strong>
            </p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>BROWSERLESS_TOKEN environment variable set</li>
              <li>
                BROWSERLESS_URL environment variable set (optional, defaults to
                https://chrome.browserless.io)
              </li>
            </ul>
          </div>

          <Button
            onClick={testPDFGeneration}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Generate Test PDF
              </>
            )}
          </Button>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h4 className="font-semibold mb-2">Test Data Used:</h4>
            <pre className="text-xs overflow-auto">
              {`{
  "userInfo": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "address": "123 Main St",
    "city": "Anytown",
    "state": "CA",
    "zipCode": "12345",
    "phone": "(555) 123-4567"
  },
  "childInfo": {
    "firstName": "Jane",
    "lastName": "Doe",
    "dob": "2020-01-01",
    "sex": "Female",
    "ethnicities": ["Caucasian", "Hispanic"]
  },
  "consentData": {
    "part1Accepted": true,
    "part2Accepted": true,
    "part3Accepted": true,
    "consentAll": true,
    "signature": null,
    "signatureDate": "2025-01-15",
    "signerName": "John Doe",
    "relationshipToChild": "Father",
    "ipAddress": "192.168.1.1",
    "userAgent": "Test Browser"
  },
  "orderNumber": "TEST-001",
  "kitNumber": 1
}`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
