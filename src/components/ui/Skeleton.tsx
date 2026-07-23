"use client";

import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-[var(--parigo-corner-md)] rounded-tr-[var(--parigo-turn-md)] rounded-bl-[var(--parigo-turn-md)] bg-[var(--color-gray-200)]",
        className
      )}
    />
  );
}

export function AlbumCardSkeleton() {
  return (
    <div className="parigo-card overflow-hidden border border-[var(--color-line)] bg-[var(--surface)]">
      <Skeleton className="aspect-square w-full" />
      <div className="p-4 space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
}

export function TrackRowSkeleton() {
  return (
    <div className="flex items-center gap-4 p-3 border-b border-[var(--color-gray-100)]">
      <Skeleton className="w-6 h-6" />
      <Skeleton className="w-10 h-10 rounded-[var(--radius-sm)]" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-1/4" />
      </div>
      <Skeleton className="w-12 h-4" />
      <Skeleton className="w-16 h-4" />
    </div>
  );
}
