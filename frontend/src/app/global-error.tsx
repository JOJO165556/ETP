"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f8fafc",
          color: "#0f172a",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div style={{ maxWidth: 420, padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>
            La plateforme est momentanément indisponible
          </h1>
          <p style={{ marginTop: 12, fontSize: 14, lineHeight: 1.6, color: "#475569" }}>
            Nous n&apos;avons pas pu charger cette page. Vos données restent intactes.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 24,
              padding: "10px 18px",
              fontSize: 14,
              fontWeight: 600,
              color: "#ffffff",
              background: "#4f46e5",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            Réessayer
          </button>
          {error.digest && (
            <p style={{ marginTop: 20, fontSize: 12, color: "#64748b" }}>
              Référence : {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
