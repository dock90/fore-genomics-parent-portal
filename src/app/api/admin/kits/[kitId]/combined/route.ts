import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { combinedDocumentService } from "@/lib/combined-document-service";
import { checkRole } from "@/utils/roles";

export async function GET(
  request: NextRequest,
  { params }: { params: { kitId: string } }
) {
  try {
    // Check if user is admin
    if (!checkRole("ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { kitId } = params;

    // Get the kit with all associated data
    const kit = await prisma.kit.findUnique({
      where: { id: kitId },
      include: {
        order: {
          include: {
            parent: {
              include: {
                profile: true,
              },
            },
            purchaser: {
              include: {
                profile: true,
              },
            },
          },
        },
        child: true,
        consent: true,
        questionnaire: true,
      },
    });

    if (!kit) {
      return NextResponse.json({ error: "Kit not found" }, { status: 404 });
    }

    // Check if both TRF and consent are available
    if (!kit.trfFileName) {
      return NextResponse.json({ error: "TRF not available for this kit" }, { status: 404 });
    }

    if (!kit.consent) {
      return NextResponse.json({ error: "Consent not available for this kit" }, { status: 404 });
    }

    // Check if we have the required user and child data for consent PDF generation
    if (!kit.order.parent?.profile || !kit.child) {
      return NextResponse.json({ error: "Missing required consent data" }, { status: 400 });
    }

    // Get admin user email from Clerk for audit logging
    const { clerkClient } = await import("@clerk/nextjs/server");
    const client = await clerkClient();
    const adminUser = await client.users.getUser(userId);
    const adminEmail = adminUser.emailAddresses[0]?.emailAddress;

    try {
      // Get the parent user's email from Clerk since it's not in the Prisma query
      const parentUser = await client.users.getUser(kit.order.parentId!);
      const parentEmail = parentUser.emailAddresses[0]?.emailAddress || "";

      // Prepare consent data for PDF generation
      const consentData = {
        userInfo: {
          firstName: kit.order.parent.profile.firstName,
          lastName: kit.order.parent.profile.lastName,
          email: parentEmail,
          address: kit.order.parent.profile.address,
          city: kit.order.parent.profile.city,
          state: kit.order.parent.profile.state,
          zipCode: kit.order.parent.profile.zipCode,
          phone: kit.order.parent.profile.phone,
        },
        childInfo: {
          firstName: kit.child.firstName || "",
          lastName: kit.child.lastName || "",
          dob: kit.child.dob || "",
          sex: kit.child.sex || "",
          ethnicities: kit.child.ethnicities || [],
        },
        consentData: {
          part1Accepted: kit.consent.part1Accepted,
          part2Accepted: kit.consent.part2Accepted,
          part3Accepted: kit.consent.part3Accepted,
          consentAll: kit.consent.consentAll,
          signature: kit.consent.signature,
          signatureDate: kit.consent.signatureDate ? kit.consent.signatureDate.toISOString().split('T')[0] : null,
          signerName: kit.consent.signerName,
          relationshipToChild: kit.consent.relationshipToChild,
          ipAddress: kit.consent.ipAddress || "",
          userAgent: kit.consent.userAgent || "",
        },
        orderNumber: kit.order.orderNumber,
        kitNumber: kit.kitNumber,
      };

      // Create the combined document archive
      const combinedResult = await combinedDocumentService.createCombinedDocument({
        kitId: kit.id,
        orderNumber: kit.order.orderNumber,
        kitNumber: kit.kitNumber,
        trfFileName: kit.trfFileName!,
        consentData,
      });

      // Log the combined document archive download action for audit trail
      const { AuditService } = await import("@/lib/audit-service");
      await AuditService.logAction({
        orderId: kit.order.id,
        action: "COMBINED_DOCUMENT_ARCHIVE_DOWNLOAD",
        userId: userId,
        userEmail: adminEmail || "unknown",
        details: {
          kitId: kit.id,
          kitNumber: kit.kitNumber,
          orderNumber: kit.order.orderNumber,
          archiveFileName: combinedResult.fileName,
        },
      });

      // Stream the zip file directly to the browser
      return new NextResponse(combinedResult.zipBuffer, {
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="${combinedResult.fileName}"`,
          "Content-Length": combinedResult.zipBuffer.length.toString(),
        },
      });
      
    } catch (error) {
      console.error("Error creating combined document:", error);

      return NextResponse.json(
        { error: "Failed to create combined document" },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error("Error generating combined document for kit:", params.kitId, error);
    return NextResponse.json(
      { error: "Failed to generate combined document" },
      { status: 500 }
    );
  }
}
