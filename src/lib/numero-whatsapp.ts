/**
 * Il numero da usare su WhatsApp (solo cifre, col prefisso), o null se non c'è un cellulare.
 * Un fisso italiano (079…, +39 06…) non va su WhatsApp: v3.131, Alessio: "che senso ha mettere
 * nella lista chi non ha il numero?".
 */
export function numeroWhatsApp(telefono: string | null | undefined): string | null {
  if (!telefono) return null;
  let cifre = telefono.replace(/\D/g, "");
  if (cifre.startsWith("00")) cifre = cifre.slice(2);
  if (cifre.length === 10 && cifre.startsWith("3")) cifre = `39${cifre}`;
  if (cifre.length < 11) return null;
  if (cifre.startsWith("39") && cifre[2] !== "3") return null;
  return cifre;
}
