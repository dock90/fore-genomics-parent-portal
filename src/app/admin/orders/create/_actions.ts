"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { clerkClient } from "@clerk/nextjs/server";
import { KitService } from "@/lib/kit-service";

const createOrderSchema = z
  .object({
    userType: z.enum(["existing", "new"]),
    userId: z.string().nullable().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().email().optional(),
    notes: z.string().optional(),
    kitCount: z.number().min(1).max(10).optional(),
    kitTypes: z.array(z.enum(["BASE", "PLUS", "PREMIUM"])).optional(),
  })
  .refine(
    (data) => {
      if (data.userType === "existing") {
        return data.userId && data.userId.length > 0;
      } else {
        return data.firstName && data.lastName && data.email;
      }
    },
    {
      message: "Please fill in all required fields",
    }
  );

export async function createOrder(formData: FormData) {
  try {
    // Parse and validate the form data
    const validatedData = createOrderSchema.parse({
      userType: formData.get("userType"),
      userId: formData.get("userId"),
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      email: formData.get("email"),
      notes: formData.get("notes"),
      kitCount: parseInt(formData.get("kitCount") as string) || 1,
      kitTypes: formData.get("kitTypes")
        ? JSON.parse(formData.get("kitTypes") as string)
        : undefined,
    });

    let userId: string;

    if (validatedData.userType === "existing") {
      // Verify existing user exists
      const user = await prisma.user.findUnique({
        where: { id: validatedData.userId! },
      });

      if (!user) {
        throw new Error("User not found");
      }

      userId = validatedData.userId!;
    } else {
      // Check if user with this email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: validatedData.email! },
      });

      if (existingUser) {
        throw new Error("A user with this email address already exists");
      }

      // Create new user
      const newUser = await prisma.user.create({
        data: {
          email: validatedData.email!,
          role: "PARENT",
          profile: {
            create: {
              firstName: validatedData.firstName!,
              lastName: validatedData.lastName!,
              address: "", // Will be filled during onboarding
              city: "",
              state: "",
              zipCode: "",
              phone: "",
            },
          },
        },
      });

      userId = newUser.id;

      // Create Clerk invitation for the new user
      try {
        const client = await clerkClient();
        await client.invitations.createInvitation({
          emailAddress: validatedData.email!,
          publicMetadata: {
            role: "PARENT",
            createdByAdmin: true,
            orderId: newUser.id, // We'll use the user ID as a reference
          },
          redirectUrl:
            process.env.NEXT_PUBLIC_CLERK_INVITATION_REDIRECT_URL ||
            "http://localhost:3000/invitation?redirect_url=/onboarding",
        });
        // Clerk invitation created successfully
      } catch (clerkError: any) {
        // Handle duplicate invitation error gracefully
        if (clerkError.errors?.[0]?.code === "duplicate_record") {
          // Invitation already exists for this email
        } else {
          console.error("Failed to create Clerk invitation:", clerkError);
        }
        // Don't fail the entire request if Clerk invitation fails
        // The user can still be created and the order can proceed
      }

      // Note: We do NOT set onboardingComplete metadata for new users
      // They need to complete the onboarding process first
    }

    // Create the order
    const order = await prisma.order.create({
      data: {
        parentId: userId, // Admin-created orders are typically for parents
        purchaserId: userId, // Same user is both parent and purchaser initially
        status: "ORDER_RECEIVED" as any,
        notes: validatedData.notes || null,
        orderNumber: generateOrderNumber(),
        kitCount: validatedData.kitCount || 1,
        statusUpdatedAt: new Date(),
      },
    });

    // Create kits for the order
    const kitTypes =
      validatedData.kitTypes || Array(validatedData.kitCount || 1).fill("BASE");
    await KitService.createKitsForOrder(
      order.id,
      validatedData.kitCount || 1,
      kitTypes
    );

    revalidatePath("/admin/orders");
    return order;
  } catch (error) {
    console.error("Error creating order:", error);

    if (error instanceof z.ZodError) {
      throw new Error(
        `Validation error: ${error.errors.map((e) => e.message).join(", ")}`
      );
    }

    throw new Error(
      error instanceof Error ? error.message : "Failed to create order"
    );
  }
}

function generateOrderNumber(): string {
  // Generate a unique order number with timestamp
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `ORD-${timestamp.slice(-6)}-${random}`;
}
