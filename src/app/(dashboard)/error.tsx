"use client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <h1 className="text-2xl font-bold text-destructive">Errore</h1>
      <p className="text-muted-foreground max-w-md text-center">
        Qualcosa è andato storto nel caricamento di questa pagina.
      </p>
      {process.env.NODE_ENV === "development" && (
        <pre className="text-xs text-left bg-muted p-3 rounded max-w-lg overflow-auto">
          {error.message}
        </pre>
      )}
      <button
        onClick={reset}
        className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
      >
        Riprova
      </button>
    </div>
  );
}
