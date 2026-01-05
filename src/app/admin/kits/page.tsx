import { prisma } from "@/lib/prisma";
import { KitsManagement } from "./KitsManagement";

export default async function KitsPage() {
  // Fetch all kits with their associated data
  const kits = await prisma.kit.findMany({
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
    orderBy: [
      {
        order: {
          createdAt: "desc",
        },
      },
      {
        kitNumber: "asc",
      },
    ],
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Kits</h1>
        <p className="text-muted-foreground mt-1">View and manage test kits</p>
      </div>

      {/* Kits Management */}
      <KitsManagement kits={kits} />
    </div>
  );
}
