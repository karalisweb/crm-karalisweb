import { redirect } from "next/navigation";

// "Aziende trovate" è confluita nel Percorso (v3.63): i vecchi indirizzi portano lì.
export default function Pagina() {
  redirect("/percorso");
}
