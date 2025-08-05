import { prisma } from "@/lib/prisma";
import { KitsManagement } from "./KitsManagement";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PackageIcon } from "lucide-react";

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
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Kit Management</h1>
        <p className="text-gray-600 mt-2">
          View and manage all kits with TRF and report links
        </p>
      </div>

      {/* Kits Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PackageIcon className="h-5 w-5" />
            Kits
          </CardTitle>
          <CardDescription>
            View and manage test kits
          </CardDescription>
        </CardHeader>
        <CardContent>
          <KitsManagement kits={kits} />
        </CardContent>
      </Card>
    </div>
  );
} 