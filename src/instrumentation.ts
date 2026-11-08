/**
 * v3.122: il giro veloce gira dentro il server, ogni 10 minuti (e subito dopo l'avvio). Non dipende né dal crontab né
 * dal Mac. Un giro alla volta. Disattivabile con TURNO_VELOCE=off.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NODE_ENV === "production" && process.env.TURNO_VELOCE !== "off") {
    const { turnoVeloce } = await import("@/lib/agents/turno-veloce");
    let inCorso = false;
    const giro = async () => {
      if (inCorso) return;
      inCorso = true;
      try {
        console.log("[veloce]", JSON.stringify(await turnoVeloce()));
      } catch (e) {
        console.error("[veloce] giro fallito:", e);
      } finally {
        inCorso = false;
      }
    };
    setTimeout(giro, 30_000);
    setInterval(giro, 10 * 60_000);
  }
}
