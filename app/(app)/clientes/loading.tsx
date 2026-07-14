import { Skeleton, TableSkeleton } from "@/components/ui/skeleton";

export default function ClientesLoading() {
  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-10 w-44" />
        <Skeleton className="h-10 w-52" />
        <Skeleton className="h-10 w-32" />
      </div>
      <TableSkeleton rows={8} />
    </div>
  );
}
