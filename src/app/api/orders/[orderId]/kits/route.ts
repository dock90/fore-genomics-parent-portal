import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { KitService } from "@/lib/kit-service";

export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const kits = await KitService.getKitsForOrder(params.orderId);
    return NextResponse.json(kits);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch kits" },
      { status: 500 }
    );
  }
}
