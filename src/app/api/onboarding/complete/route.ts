import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { KitService } from "@/lib/kit-service";
import { googleStorageService } from "@/lib/google-storage";

export async function GET() {
  return NextResponse.json({
    message: "Onboarding complete endpoint is working",
  });
}

export async function POST(request: NextRequest) {
  try {
    console.log("Onboarding complete API called");

    const { userId } = await auth();

    if (!userId) {
      console.log("No userId found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("User authenticated:", userId);

    const body = await request.json();
    console.log("Request body:", body);

    const {
      userEmail,
      userInfo,
      childInfo,
      consentAccepted,
      consentData,
      questionnaire,
      kitId, // New parameter for kit-specific onboarding
    } = body;

    // Get the user by email (since Clerk ID and database ID might be different)
    let user = await prisma.user.findFirst({
      where: { email: userEmail },
      include: {
        parentOrders: true,
        purchaserOrders: true,
        profile: true,
      },
    });

    if (!user) {
      console.log("User not found in database by email, creating new user");
      // Create user if doesn't exist
      user = await prisma.user.create({
        data: {
          email: userEmail || "unknown@example.com",
        },
        include: {
          parentOrders: true,
          purchaserOrders: true,
          profile: true,
        },
      });
    }

    // Get the appropriate orders based on user role
    const userOrders =
      user.role === "PARENT" ? user.parentOrders : user.purchaserOrders;

    console.log("User found:", user.id, "Orders:", userOrders.length);

    // Update user profile if userInfo is provided
    if (userInfo) {
      await prisma.userProfile.upsert({
        where: { userId: user.id },
        update: {
          firstName: userInfo.firstName,
          lastName: userInfo.lastName,
          address: userInfo.address,
          city: userInfo.city,
          state: userInfo.state,
          zipCode: userInfo.zipCode,
          phone: userInfo.phone,
        },
        create: {
          userId: user.id,
          firstName: userInfo.firstName,
          lastName: userInfo.lastName,
          address: userInfo.address,
          city: userInfo.city,
          state: userInfo.state,
          zipCode: userInfo.zipCode,
          phone: userInfo.phone,
        },
      });
    }

    // Handle kit-specific onboarding
    if (kitId) {
      console.log("Processing kit-specific onboarding for kitId:", kitId);

      try {
        // Verify the kit exists and belongs to the user's order
        const orderWhere =
          user.role === "PARENT"
            ? { parentId: user.id }
            : { purchaserId: user.id };

        const kit = await prisma.kit.findFirst({
          where: {
            id: kitId,
            order: orderWhere,
          },
          include: {
            order: true,
            child: true,
            consent: true,
            questionnaire: true,
          },
        });

        if (!kit) {
          console.log("Kit not found:", kitId);
          return NextResponse.json(
            { error: "Kit not found or access denied" },
            { status: 404 }
          );
        }

        console.log("Kit found:", kit.id);

        // Create child record for this specific kit
        let childId: string | null = null;
        if (childInfo && !childInfo.isNotYetBorn) {
          const child = await prisma.child.create({
            data: {
              userId: user.id,
              firstName: childInfo.firstName || "",
              lastName: childInfo.lastName || "",
              dob: childInfo.dob || "",
              dueDate: childInfo.dueDate || "",
              sex: childInfo.sex || "",
              ethnicities: childInfo.ethnicity || [],
            },
          });
          childId = child.id;

          // Update the kit with the child reference
          await prisma.kit.update({
            where: { id: kitId },
            data: { childId: child.id },
          });
        }

        // Create consent record for this specific kit
        let consentId: string | null = null;
        // Handle consentAccepted being passed as string or boolean
        const isConsentAccepted =
          consentAccepted === true ||
          consentAccepted === "true" ||
          consentAccepted === "Purchaser Land";
        console.log(
          "Consent check - consentAccepted:",
          consentAccepted,
          "isConsentAccepted:",
          isConsentAccepted,
          "consentData:",
          consentData
        );
        if (isConsentAccepted && consentData) {
          console.log("Creating consent record with data:", consentData);
          const consent = await prisma.consent.create({
            data: {
              userId: user.id,
              accepted: isConsentAccepted,
              part1Accepted: consentData.part1Accepted || false,
              part2Accepted: consentData.part2Accepted || false,
              part3Accepted: consentData.part3Accepted || false,
              consentAll: consentData.consentAll || false,
              signature: consentData.signature || "",
              signatureDate: consentData.signatureDate
                ? new Date(consentData.signatureDate)
                : null,
              signerName: consentData.signerName || "",
              relationshipToChild: consentData.relationshipToChild || "",
              childId: childId || null,
              ipAddress: consentData.ipAddress || "",
              userAgent: consentData.userAgent || "",
            },
          });
          consentId = consent.id;

          // Update the kit with the consent reference
          await prisma.kit.update({
            where: { id: kitId },
            data: { consentId: consent.id },
          });
        }

        // Create questionnaire record for this specific kit
        let questionnaireId: string | null = null;
        if (questionnaire) {
          console.log(
            "Creating questionnaire record with data:",
            questionnaire
          );
          const questionnaireRecord = await prisma.questionnaire.create({
            data: {
              userId: user.id,
              question1: questionnaire.question1 || false,
              question1Details: questionnaire.question1Details || "",
              question2: questionnaire.question2 || false,
              question2Details: questionnaire.question2Details || "",
              question3: questionnaire.question3 || false,
              question3Details: questionnaire.question3Details || "",
            },
          });
          questionnaireId = questionnaireRecord.id;

          // Update the kit with the questionnaire reference
          await prisma.kit.update({
            where: { id: kitId },
            data: { questionnaireId: questionnaireRecord.id },
          });
        }

        // Update kit status to ONBOARDING_COMPLETED if all data is provided
        if (childId && consentId && questionnaireId) {
          // Create TRF for this completed kit
          try {
            const trfResult = await createTRFForKit(kit, user, userInfo, childInfo, consentData, questionnaire);
            
            // Save the TRF filename to the kit record
            if (trfResult && trfResult.fileName) {
              await prisma.kit.update({
                where: { id: kitId },
                data: { trfFileName: trfResult.fileName }
              });
              console.log("Saved TRF filename to kit:", trfResult.fileName);
            }
          } catch (trfError) {
            console.error("Failed to create TRF for kit:", kitId, trfError);
            // Don't fail the onboarding if TRF creation fails
          }

          // Create consent PDF for this completed kit
          try {
            const consentPDFResult = await createConsentPDFForKit(kit, user, userInfo, childInfo, consentData);
            console.log("Consent PDF generated successfully:", consentPDFResult.fileName);
          } catch (consentPDFError) {
            console.error("Failed to create consent PDF for kit:", kitId, consentPDFError);
            // Don't fail the onboarding if consent PDF creation fails
          }

          // Check if all kits for this order are complete
          const userOrder = userOrders[0]; // Get the first order
          if (userOrder) {
            const allKitsComplete = await KitService.isAllKitsComplete(
              userOrder.id
            );

            if (allKitsComplete) {
              // Update order status to ONBOARDING_COMPLETED
              await prisma.order.update({
                where: { id: userOrder.id },
                data: {
                  status: "ONBOARDING_COMPLETED",
                  statusUpdatedAt: new Date(),
                },
              });

              // Update ParentInvitation status to ACCEPTED if this is a parent completing onboarding
              // Only applies if the user came through the purchaser/invitation flow
              if (user.role === "PARENT") {
                try {
                  console.log(`Checking for parent invitation for user ${user.email} and order ${userOrder.id}`);
                  
                  // Find the invitation for this parent and order
                  const invitation = await prisma.parentInvitation.findFirst({
                    where: {
                      orderId: userOrder.id,
                      status: "PENDING",
                    },
                    include: {
                      order: {
                        include: {
                          parent: true,
                        },
                      },
                    },
                  });

                  if (invitation) {
                    console.log(`Found pending invitation ${invitation.id} for order ${userOrder.id}`);
                    console.log(`Invitation parent email: ${invitation.order.parent?.email}, current user email: ${user.email}`);
                    
                    if (invitation.order.parent?.email === user.email) {
                      await prisma.parentInvitation.update({
                        where: { id: invitation.id },
                        data: {
                          status: "ACCEPTED",
                          acceptedAt: new Date(),
                          updatedAt: new Date(),
                        },
                      });
                      console.log(
                        "Updated ParentInvitation status to ACCEPTED for invitation:",
                        invitation.id
                      );
                    } else {
                      console.log(`Invitation parent email (${invitation.order.parent?.email}) doesn't match current user email (${user.email})`);
                    }
                  } else {
                    console.log(`No pending invitation found for order ${userOrder.id} - user may not have come through invitation flow`);
                  }
                } catch (invitationError) {
                  console.error(
                    "Error updating ParentInvitation status:",
                    invitationError
                  );
                  // Don't fail the onboarding if invitation update fails
                }
              } else {
                console.log(`User role is ${user.role}, skipping parent invitation update`);
              }
            }
          }
        }
      } catch (kitError) {
        console.error("Error processing kit-specific onboarding:", kitError);
        return NextResponse.json(
          { error: "Failed to process kit-specific onboarding" },
          { status: 500 }
        );
      }
    } else {
      console.log("Processing legacy single-kit onboarding");

      // Legacy single-kit flow (for backward compatibility)
      // Get the first kit for this order
      const userOrder = userOrders[0];
      if (!userOrder) {
        console.log("No order found for user");
        return NextResponse.json({ error: "No order found" }, { status: 404 });
      }

      const kit = await prisma.kit.findFirst({
        where: { orderId: userOrder.id },
        include: {
          order: true,
          child: true,
          consent: true,
          questionnaire: true,
        },
      });

      if (!kit) {
        console.log("No kit found for order");
        return NextResponse.json({ error: "No kit found" }, { status: 404 });
      }

      // Create child record
      let childId: string | null = null;
      if (childInfo && !childInfo.isNotYetBorn) {
        const child = await prisma.child.create({
          data: {
            userId: user.id,
            firstName: childInfo.firstName || "",
            lastName: childInfo.lastName || "",
            dob: childInfo.dob || "",
            dueDate: childInfo.dueDate || "",
            sex: childInfo.sex || "",
            ethnicities: childInfo.ethnicity || [],
          },
        });
        childId = child.id;

        // Update the kit with the child reference
        await prisma.kit.update({
          where: { id: kit.id },
          data: { childId: child.id },
        });
      }

      // Create consent record
      let consentId: string | null = null;
      const isConsentAccepted =
        consentAccepted === true ||
        consentAccepted === "true" ||
        consentAccepted === "Purchaser Land";
      if (isConsentAccepted && consentData) {
        const consent = await prisma.consent.create({
          data: {
            userId: user.id,
            accepted: isConsentAccepted,
            part1Accepted: consentData.part1Accepted || false,
            part2Accepted: consentData.part2Accepted || false,
            part3Accepted: consentData.part3Accepted || false,
            consentAll: consentData.consentAll || false,
            signature: consentData.signature || "",
            signatureDate: consentData.signatureDate
              ? new Date(consentData.signatureDate)
              : null,
            signerName: consentData.signerName || "",
            relationshipToChild: consentData.relationshipToChild || "",
            childId: childId || null,
            ipAddress: consentData.ipAddress || "",
            userAgent: consentData.userAgent || "",
          },
        });
        consentId = consent.id;

        // Update the kit with the consent reference
        await prisma.kit.update({
          where: { id: kit.id },
          data: { consentId: consent.id },
        });
      }

      // Create questionnaire record
      let questionnaireId: string | null = null;
      if (questionnaire) {
        const questionnaireRecord = await prisma.questionnaire.create({
          data: {
            userId: user.id,
            question1: questionnaire.question1 || false,
            question1Details: questionnaire.question1Details || "",
            question2: questionnaire.question2 || false,
            question2Details: questionnaire.question2Details || "",
            question3: questionnaire.question3 || false,
            question3Details: questionnaire.question3Details || "",
          },
        });
        questionnaireId = questionnaireRecord.id;

        // Update the kit with the questionnaire reference
        await prisma.kit.update({
          where: { id: kit.id },
          data: { questionnaireId: questionnaireRecord.id },
        });
      }

      // Update kit status to ONBOARDING_COMPLETED if all data is provided
      if (childId && consentId && questionnaireId) {
        // Create TRF for this completed kit
        try {
          const trfResult = await createTRFForKit(kit, user, userInfo, childInfo, consentData, questionnaire);
          
          // Save the TRF filename to the kit record
          if (trfResult && trfResult.fileName) {
            await prisma.kit.update({
              where: { id: kit.id },
              data: { trfFileName: trfResult.fileName }
            });
            console.log("Saved TRF filename to kit:", trfResult.fileName);
          }
        } catch (trfError) {
          console.error("Failed to create TRF for kit:", kit.id, trfError);
          // Don't fail the onboarding if TRF creation fails
        }

        // Create consent PDF for this completed kit
        try {
          const consentPDFResult = await createConsentPDFForKit(kit, user, userInfo, childInfo, consentData);
          console.log("Consent PDF generated successfully:", consentPDFResult.fileName);
        } catch (consentPDFError) {
          console.error("Failed to create consent PDF for kit:", kit.id, consentPDFError);
          // Don't fail the onboarding if consent PDF creation fails
        }
      }

      // Update order status
      await prisma.order.update({
        where: { id: userOrder.id },
        data: {
          status: "ONBOARDING_COMPLETED",
          statusUpdatedAt: new Date(),
        },
      });

      // Update ParentInvitation status to ACCEPTED if this is a parent completing onboarding
      // Only applies if the user came through the purchaser/invitation flow
      if (user.role === "PARENT") {
        try {
          console.log(`Checking for parent invitation for user ${user.email} and order ${userOrder.id}`);
          
          // Find the invitation for this parent and order
          const invitation = await prisma.parentInvitation.findFirst({
            where: {
              orderId: userOrder.id,
              status: "PENDING",
            },
            include: {
              order: {
                include: {
                  parent: true,
                },
              },
            },
          });

          if (invitation) {
            console.log(`Found pending invitation ${invitation.id} for order ${userOrder.id}`);
            console.log(`Invitation parent email: ${invitation.order.parent?.email}, current user email: ${user.email}`);
            
            if (invitation.order.parent?.email === user.email) {
              await prisma.parentInvitation.update({
                where: { id: invitation.id },
                data: {
                  status: "ACCEPTED",
                  acceptedAt: new Date(),
                  updatedAt: new Date(),
                },
              });
              console.log(
                "Updated ParentInvitation status to ACCEPTED for invitation:",
                invitation.id
              );
            } else {
              console.log(`Invitation parent email (${invitation.order.parent?.email}) doesn't match current user email (${user.email})`);
            }
          } else {
            console.log(`No pending invitation found for order ${userOrder.id} - user may not have come through invitation flow`);
          }
        } catch (invitationError) {
          console.error(
            "Error updating ParentInvitation status:",
            invitationError
          );
          // Don't fail the onboarding if invitation update fails
        }
      } else {
        console.log(`User role is ${user.role}, skipping parent invitation update`);
      }
    }

    console.log("Onboarding completed successfully");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error completing onboarding:", error);
    return NextResponse.json(
      { error: "Failed to complete onboarding" },
      { status: 500 }
    );
  }
}

// Helper function to create TRF for a completed kit
async function createTRFForKit(
  kit: any,
  user: any,
  userInfo: any,
  childInfo: any,
  consentData: any,
  questionnaire: any
) {
  try {
    console.log("Creating TRF for kit:", kit.id);

    // Get the complete kit data with all relations
    const completeKit = await prisma.kit.findUnique({
      where: { id: kit.id },
      include: {
        order: true,
        child: true,
        consent: true,
        questionnaire: true,
      },
    });

    if (!completeKit) {
      throw new Error("Kit not found");
    }

    // Prepare the data for TRF creation
    const onboardingData = {
      userInfo: {
        firstName: userInfo?.firstName || user.profile?.firstName || "",
        lastName: userInfo?.lastName || user.profile?.lastName || "",
        email: user.email,
        address: userInfo?.address || user.profile?.address || "",
        city: userInfo?.city || user.profile?.city || "",
        state: userInfo?.state || user.profile?.state || "",
        zipCode: userInfo?.zipCode || user.profile?.zipCode || "",
        phone: userInfo?.phone || user.profile?.phone || "",
      },
      childInfo: {
        firstName: completeKit.child?.firstName || childInfo?.firstName || "",
        lastName: completeKit.child?.lastName || childInfo?.lastName || "",
        dob: completeKit.child?.dob || childInfo?.dob || "",
        sex: completeKit.child?.sex || childInfo?.sex || "",
        ethnicities: completeKit.child?.ethnicities || childInfo?.ethnicity || childInfo?.ethnicities || [],
      },
      consentData: {
        part1Accepted: completeKit.consent?.part1Accepted || consentData?.part1Accepted || false,
        part2Accepted: completeKit.consent?.part2Accepted || consentData?.part2Accepted || false,
        part3Accepted: completeKit.consent?.part3Accepted || consentData?.part3Accepted || false,
        consentAll: completeKit.consent?.consentAll || consentData?.consentAll || false,
        signature: completeKit.consent?.signature || consentData?.signature || null,
        signatureDate: completeKit.consent?.signatureDate?.toISOString() || consentData?.signatureDate || null,
        signerName: completeKit.consent?.signerName || consentData?.signerName || null,
        relationshipToChild: completeKit.consent?.relationshipToChild || consentData?.relationshipToChild || null,
      },
      questionnaire: {
        question1: completeKit.questionnaire?.question1 || questionnaire?.question1 || false,
        question1Details: completeKit.questionnaire?.question1Details || questionnaire?.question1Details || null,
        question2: completeKit.questionnaire?.question2 || questionnaire?.question2 || false,
        question2Details: completeKit.questionnaire?.question2Details || questionnaire?.question2Details || null,
        question3: completeKit.questionnaire?.question3 || questionnaire?.question3 || false,
        question3Details: completeKit.questionnaire?.question3Details || questionnaire?.question3Details || null,
      },
      orderNumber: completeKit.order.orderNumber,
      kitNumber: completeKit.kitNumber,
      ipAddress: completeKit.consent?.ipAddress || "",
      userAgent: completeKit.consent?.userAgent || "",
    };

    // Create the TRF
    const trfResult = await googleStorageService.createOnboardingRecord(onboardingData);
    console.log("TRF created successfully:", trfResult.fileName);

    // Log the TRF creation action for audit trail
    try {
      const { AuditService } = await import("@/lib/audit-service");
      await AuditService.logAction({
        orderId: kit.order.id,
        action: "TRF_CREATION", // Using specific action type for TRF creation
        userId: user.id,
        userEmail: user.email,
        details: {
          kitId: kit.id,
          kitNumber: kit.kitNumber,
          orderNumber: onboardingData.orderNumber,
          trfFileName: trfResult.fileName,
          trfUrl: trfResult.fileUrl,
          context: "onboarding_completion",
        },
      });
    } catch (auditError) {
      console.error("Failed to log TRF creation audit:", auditError);
      // Don't fail TRF creation if audit logging fails
    }

    return trfResult;
  } catch (error) {
    console.error("Error creating TRF for kit:", kit.id, error);
    
    // Log detailed error information for debugging
    if (error && typeof error === 'object' && 'code' in error) {
      const errorCode = (error as any).code;
      if (errorCode === 'ETIMEDOUT') {
        console.error("TRF creation failed due to timeout - this may be a network issue");
      } else if (errorCode === 'ENOTFOUND') {
        console.error("TRF creation failed due to network connectivity issues");
      } else {
        console.error("TRF creation failed with error code:", errorCode);
      }
    }
    
    // Re-throw the error so the calling function can handle it appropriately
    throw error;
  }
}

// Helper function to create consent PDF for a completed kit
async function createConsentPDFForKit(
  kit: any,
  user: any,
  userInfo: any,
  childInfo: any,
  consentData: any
) {
  try {
    console.log("Creating consent PDF for kit:", kit.id);

    // Get the complete kit data with all relations
    const completeKit = await prisma.kit.findUnique({
      where: { id: kit.id },
      include: {
        order: true,
        child: true,
        consent: true,
        questionnaire: true,
      },
    });

    if (!completeKit) {
      throw new Error("Kit not found");
    }

    // Import the consent PDF service
    const { consentPDFService } = await import("@/lib/consent-pdf-service");

    // Prepare the data for consent PDF generation
    const consentPDFData = {
      userInfo: {
        firstName: userInfo?.firstName || user.profile?.firstName || "",
        lastName: userInfo?.lastName || user.profile?.lastName || "",
        email: user.email,
        address: userInfo?.address || user.profile?.address || "",
        city: userInfo?.city || user.profile?.city || "",
        state: userInfo?.state || user.profile?.state || "",
        zipCode: userInfo?.zipCode || user.profile?.zipCode || "",
        phone: userInfo?.phone || user.profile?.phone || "",
      },
      childInfo: {
        firstName: completeKit.child?.firstName || childInfo?.firstName || "",
        lastName: completeKit.child?.lastName || childInfo?.lastName || "",
        dob: completeKit.child?.dob || childInfo?.dob || "",
        sex: completeKit.child?.sex || childInfo?.sex || "",
        ethnicities: completeKit.child?.ethnicities || childInfo?.ethnicity || childInfo?.ethnicities || [],
      },
      consentData: {
        part1Accepted: completeKit.consent?.part1Accepted || consentData?.part1Accepted || false,
        part2Accepted: completeKit.consent?.part2Accepted || consentData?.part2Accepted || false,
        part3Accepted: completeKit.consent?.part3Accepted || consentData?.part3Accepted || false,
        consentAll: completeKit.consent?.consentAll || consentData?.consentAll || false,
        signature: completeKit.consent?.signature || consentData?.signature || null,
        signatureDate: completeKit.consent?.signatureDate?.toISOString() || consentData?.signatureDate || null,
        signerName: completeKit.consent?.signerName || consentData?.signerName || null,
        relationshipToChild: completeKit.consent?.relationshipToChild || consentData?.relationshipToChild || null,
        ipAddress: completeKit.consent?.ipAddress || consentData?.ipAddress || "",
        userAgent: completeKit.consent?.userAgent || consentData?.userAgent || "",
      },
      orderNumber: completeKit.order.orderNumber,
      kitNumber: completeKit.kitNumber,
    };

    // Generate the consent PDF on-demand (no storage)
    const consentPDFResult = await consentPDFService.generateConsentPDF(consentPDFData);
    console.log("Consent PDF generated successfully:", consentPDFResult.fileName);

    // Log the consent PDF generation action for audit trail
    try {
      const { AuditService } = await import("@/lib/audit-service");
      await AuditService.logAction({
        orderId: completeKit.order.id,
        action: "CONSENT_CREATION", // Using existing action type for consent PDF generation
        userId: user.id,
        userEmail: user.email,
        details: {
          kitId: completeKit.id,
          kitNumber: completeKit.kitNumber,
          orderNumber: completeKit.order.orderNumber,
          consentFileName: consentPDFResult.fileName,
          context: "onboarding_completion_on_demand",
        },
      });
    } catch (auditError) {
      console.error("Failed to log consent PDF generation audit:", auditError);
      // Don't fail consent PDF generation if audit logging fails
    }

    // Note: We no longer store consent PDFs, so we don't update the consentFileName field
    // The PDF will be generated on-demand whenever needed

    return {
      fileName: consentPDFResult.fileName,
      message: "Consent PDF generated successfully and will be available on-demand"
    };
  } catch (error) {
    console.error("Error creating consent PDF for kit:", kit.id, error);
    
    // Log detailed error information for debugging
    if (error && typeof error === 'object' && 'code' in error) {
      const errorCode = (error as any).code;
      if (errorCode === 'ETIMEDOUT') {
        console.error("Consent PDF creation failed due to timeout - this may be a network issue");
      } else if (errorCode === 'ENOTFOUND') {
        console.error("Consent PDF creation failed due to network connectivity issues");
      } else {
        console.error("Consent PDF creation failed with error code:", errorCode);
      }
    }
    
    // Re-throw the error so the calling function can handle it appropriately
    throw error;
  }
}
