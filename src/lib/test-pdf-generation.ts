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
    await trfPDFService.generateTRFPDF(testTRFData);
    return true;
  } catch {
    return false;
  }
}

async function testCombinedDocument() {
  try {
    await combinedDocumentService.createCombinedDocument(testCombinedData);
    return true;
  } catch {
    return false;
  }
}

async function runTests() {
  const trfTest = await testTRFGeneration();

  const combinedTest = await testCombinedDocument();

  if (trfTest && combinedTest) {
  } else {
  }
}

// Export for use in API routes or other modules
export {
  testTRFData,
  testCombinedData,
  testTRFGeneration,
  testCombinedDocument,
};

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(() => {});
}
