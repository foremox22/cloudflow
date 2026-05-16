import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import ModifierManager from "@/components/pos/ModifierManager";

export default async function ModifiersPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const role = (session.user as { role?: string }).role ?? "";
  if (!["ADMIN", "MANAGER"].includes(role)) redirect("/pos");

  return <ModifierManager />;
}
