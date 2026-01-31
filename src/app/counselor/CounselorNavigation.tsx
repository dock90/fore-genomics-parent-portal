"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import {
  FileTextIcon,
} from "lucide-react";

const navigationItems = [
  {
    name: "Unapproved TRFs",
    href: "/counselor",
    icon: FileTextIcon,
    description: "Review and approve TRF files",
  },
];

export function CounselorNavigation() {
  const pathname = usePathname();

  return (
    <div className="w-64 bg-white border-r border-gray-200 min-h-screen">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <FileTextIcon className="h-8 w-8 text-green-600" />
          <div>
            <h1 className="text-lg font-bold text-gray-900">Counselor Panel</h1>
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
                  className={clsx(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                  )}
                  title={item.description}
                >
                  <item.icon
                    className={clsx(
                      "h-5 w-5",
                      isActive ? "text-green-600" : "text-gray-400"
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
          <p>Counselor Dashboard</p>
        </div>
      </div>
    </div>
  );
}
