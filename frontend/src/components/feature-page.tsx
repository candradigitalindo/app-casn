'use client';
import { Button } from '@/components/ui/button';
export function FeaturePage({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="p-4 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}
export function QueryStatus({
  loading,
  error,
  retry,
}: {
  loading: boolean;
  error: boolean;
  retry: () => void;
}) {
  if (loading)
    return (
      <p role="status" className="p-6 text-muted-foreground">
        Memuat data…
      </p>
    );
  if (error)
    return (
      <div role="alert" className="p-6 rounded-lg border bg-red-50">
        Data belum dapat dimuat.{' '}
        <Button variant="outline" onClick={retry}>
          Coba lagi
        </Button>
      </div>
    );
  return null;
}
