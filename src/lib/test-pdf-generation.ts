import { trfPDFService } from "@/lib/trf-service";
import { combinedDocumentService } from "@/lib/combined-document-service";

// Test data for TRF generation
const testTRFData = {
  userInfo: {
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com",
    address: "123 Main St",
    addressLine2: "Apt 4B",
    city: "Anytown",
    state: "CA",
    zipCode: "12345",
    phone: "(555) 123-4567",
  },
  childInfo: {
    firstName: "Jane",
    lastName: "Doe",
    dob: "2020-01-15",
    sex: "Female",
    ethnicities: ["White", "Hispanic"],
  },
  consentData: {
    relationshipToChild: "FATHER",
  },
  orderNumber: "TEST-001",
  kitNumber: 1,
};

// Test data for combined document
const testCombinedData = {
  kitId: "test-kit-id",
  orderNumber: "TEST-001",
  kitNumber: 1,
  userInfo: testTRFData.userInfo,
  childInfo: testTRFData.childInfo,
  consentData: {
    part1Accepted: true,
    part2Accepted: true,
    part3Accepted: true,
    consentAll: true,
    signature: "John Doe",
    signatureDate: "2024-01-15",
    signerName: "John Doe",
    relationshipToChild: "FATHER",
    ipAddress: "192.168.1.1",
    userAgent: "Mozilla/5.0...",
  },
};

async function testTRFGeneration() {
  try {
    console.log("Testing TRF PDF generation...");
    const result = await trfPDFService.generateTRFPDF(testTRFData);
    console.log("✅ TRF PDF generated successfully:", result.fileName);
    console.log("PDF buffer size:", result.pdfBuffer.length, "bytes");
    return true;
  } catch (error) {
    console.error("❌ TRF PDF generation failed:", error);
    return false;
  }
}

async function testCombinedDocument() {
  try {
    console.log("Testing combined document generation...");
    const result = await combinedDocumentService.createCombinedDocument(testCombinedData);
    console.log("✅ Combined PDF generated successfully:", result.fileName);
    console.log("PDF buffer size:", result.pdfBuffer.length, "bytes");
    return true;
  } catch (error) {
    console.error("❌ Combined document generation failed:", error);
    return false;
  }
}

async function runTests() {
  console.log("🧪 Running PDF generation tests...\n");
  
  const trfTest = await testTRFGeneration();
  console.log("");
  
  const combinedTest = await testCombinedDocument();
  console.log("");
  
  if (trfTest && combinedTest) {
    console.log("🎉 All tests passed! PDF generation is working correctly.");
  } else {
    console.log("⚠️  Some tests failed. Check the error messages above.");
  }
}

// Export for use in API routes or other modules
export { testTRFData, testCombinedData, testTRFGeneration, testCombinedDocument };

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}
