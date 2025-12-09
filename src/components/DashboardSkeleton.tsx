"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="space-y-2">
          <Skeleton className="h-9 w-48 sm:w-64" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>

      {/* Info Cards Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <CardSkeleton />
        <CardSkeleton />
      </div>

      {/* Kit Section Skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-7 w-24" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <KitCardSkeleton />
          <KitCardSkeleton />
        </div>
      </div>

      {/* Order Status Skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-7 w-32" />
        <OrderStatusSkeleton />
      </div>
    </div>
  );
}

function CardSkeleton() {
  return (
    <Card className="w-full">
      <CardHeader className="pb-3 sm:pb-4">
        <Skeleton className="h-6 w-40" />
      </CardHeader>
      <CardContent className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex justify-between items-center">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function KitCardSkeleton() {
  return (
    <Card className="w-full">
      <CardHeader className="pb-3 sm:pb-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-6 w-24" />
        </div>
        <Skeleton className="h-4 w-20 mt-1" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
        </div>
      </CardContent>
    </Card>
  );
}

function OrderStatusSkeleton() {
  return (
    <Card className="w-full">
      <CardHeader className="pb-3 sm:pb-4">
        <Skeleton className="h-6 w-28" />
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Steps */}
        <div className="hidden sm:flex justify-between">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
        
        {/* Mobile Progress */}
        <div className="sm:hidden space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </div>

        {/* Status Summary */}
        <div className="pt-4 border-t space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-3 w-48" />
        </div>
      </CardContent>
    </Card>
  );
}

export { CardSkeleton, KitCardSkeleton, OrderStatusSkeleton };

