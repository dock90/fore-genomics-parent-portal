import { prisma } from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  UsersIcon,
  PackageIcon,
  CheckCircleIcon,
  ClockIcon,
  ActivityIcon,
  TrendingUpIcon,
  FileCheckIcon,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export default async function AdminDashboard() {
  // Fetch key metrics
  const totalOrders = await prisma.order.count();
  const completedOrders = await prisma.order.count({
    where: { status: "COMPLETE_REPORT_DELIVERED" },
  });
  const pendingOrders = await prisma.order.count({
    where: {
      status: {
        in: [
          "ORDER_RECEIVED",
          "ONBOARDING_COMPLETED",
          "PREPARING_ORDER",
          "SHIPPED_TO_USER",
          "DELIVERED_AWAITING_RETURN",
          "SHIPPED_TO_LAB",
          "RECEIVED_IN_PROCESS",
        ] as any,
      },
    },
  });

  // Fetch recent orders
  const recentOrders = await prisma.order.findMany({
    take: 5,
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
    orderBy: {
      createdAt: "desc",
    },
  });

  // Fetch recent audit logs
  const recentAuditLogs = await prisma.auditLog.findMany({
    take: 10,
    include: {
      order: {
        select: {
          orderNumber: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const metrics = [
    {
      title: "Total Orders",
      value: totalOrders,
      icon: PackageIcon,
      description: "All orders",
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Completed",
      value: completedOrders,
      icon: CheckCircleIcon,
      description: "Reports delivered",
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      title: "Pending",
      value: pendingOrders,
      icon: ClockIcon,
      description: "In progress",
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
  ];

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "COMPLETE_REPORT_DELIVERED":
        return "default";
      case "RECEIVED_IN_PROCESS":
        return "secondary";
      case "SHIPPED_TO_LAB":
        return "outline";
      case "DELIVERED_AWAITING_RETURN":
        return "outline";
      case "SHIPPED_TO_USER":
        return "outline";
      case "PREPARING_ORDER":
        return "secondary";
      case "ONBOARDING_COMPLETED":
        return "secondary";
      default:
        return "secondary";
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case "REPORT_UPLOAD":
        return <TrendingUpIcon className="h-4 w-4" />;
      case "REPORT_DOWNLOAD":
        return <ActivityIcon className="h-4 w-4" />;
      default:
        return <ActivityIcon className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Overview of system activity and key metrics
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric) => (
          <Card key={metric.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {metric.title}
                  </p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {metric.value}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {metric.description}
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${metric.bgColor}`}>
                  <metric.icon className={`h-6 w-6 ${metric.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PackageIcon className="h-5 w-5" />
              Recent Orders
            </CardTitle>
            <CardDescription>
              Latest orders and their current status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      Order {order.orderNumber}
                    </p>
                    <p className="text-sm text-gray-600">
                      {order.parent?.profile?.firstName}{" "}
                      {order.parent?.profile?.lastName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(order.createdAt), "MMM dd, yyyy")}
                    </p>
                  </div>
                  <Badge variant={getStatusBadgeVariant(order.status)}>
                    {order.status.replace(/_/g, " ")}
                  </Badge>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Link href="/admin/orders">
                <Button variant="outline" className="w-full">
                  View All Orders
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ActivityIcon className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest audit log entries</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentAuditLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center gap-3 p-2 border rounded"
                >
                  <div className="flex-shrink-0">
                    {getActionIcon(log.action)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {log.action.replace("_", " ")}
                    </p>
                    <p className="text-xs text-gray-600">
                      Order {log.order.orderNumber} • {log.userEmail}
                    </p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(log.createdAt), "MMM dd, HH:mm")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Link href="/admin/audit-logs">
                <Button variant="outline" className="w-full">
                  View All Activity
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common admin tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Link href="/admin/users">
              <Button
                variant="outline"
                className="w-full h-16 flex flex-col gap-2"
              >
                <UsersIcon className="h-5 w-5" />
                <span>Manage Users</span>
              </Button>
            </Link>
            <Link href="/admin/orders">
              <Button
                variant="outline"
                className="w-full h-16 flex flex-col gap-2"
              >
                <PackageIcon className="h-5 w-5" />
                <span>Manage Orders</span>
              </Button>
            </Link>
            <Link href="/admin/approved-trfs">
              <Button
                variant="outline"
                className="w-full h-16 flex flex-col gap-2"
              >
                <FileCheckIcon className="h-5 w-5" />
                <span>Approved TRFs</span>
              </Button>
            </Link>
            <Link href="/admin/audit-logs">
              <Button
                variant="outline"
                className="w-full h-16 flex flex-col gap-2"
              >
                <ActivityIcon className="h-5 w-5" />
                <span>View Audit Logs</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
