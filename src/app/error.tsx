"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-4 p-8">
        <h1 className="text-2xl font-bold text-destructive">Errore imprevisto</h1>
        <p className="text-muted-foreground max-w-md">
          Si è verificato un errore. Riprova o contatta il supporto se il problema persiste.
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
    </div>
  );
}
