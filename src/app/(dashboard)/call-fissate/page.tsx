import { redirect } from "next/navigation";

// Le call fissate ora vivono nella pipeline di vendita (v3.46).
export default function CallFissateRedirect() {
  redirect("/trattative");
}
