"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  BarChart3Icon,
  UsersIcon,
  PackageIcon,
  ShieldIcon,
  SettingsIcon,
  ActivityIcon,
  TestTubeIcon,
} from "lucide-react";

const navigationItems = [
  {
    name: "Overview",
    href: "/admin",
    icon: BarChart3Icon,
    description: "Dashboard metrics and recent activity",
  },
  {
    name: "Users",
    href: "/admin/users",
    icon: UsersIcon,
    description: "User management and role assignment",
  },
  {
    name: "Orders",
    href: "/admin/orders",
    icon: PackageIcon,
    description: "Order management and report uploads",
  },
  {
    name: "Kits",
    href: "/admin/kits",
    icon: TestTubeIcon,
    description: "Kit management with TRF and report links",
  },
  {
    name: "Audit Logs",
    href: "/admin/audit-logs",
    icon: ActivityIcon,
    description: "HIPAA compliance and activity tracking",
  },
  {
    name: "Settings",
    href: "/admin/settings",
    icon: SettingsIcon,
    description: "System configuration and preferences",
  },
];

export function AdminNavigation() {
  const pathname = usePathname();

  return (
    <div className="w-64 bg-white border-r border-gray-200 min-h-screen">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <ShieldIcon className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-lg font-bold text-gray-900">Admin Panel</h1>
            <p className="text-sm text-gray-500">Fore Genomics Parent Portal</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-4">
        <ul className="space-y-2">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                  )}
                  title={item.description}
                >
                  <item.icon
                    className={cn(
                      "h-5 w-5",
                      isActive ? "text-blue-600" : "text-gray-400"
                    )}
                  />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="absolute bottom-0 w-64 p-4 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          <p>Admin Dashboard</p>
        </div>
      </div>
    </div>
  );
}
