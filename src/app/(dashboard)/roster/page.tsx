import { auth } from "@/lib/auth";
import Header from "@/components/layout/Header";
import RosterPage from "@/components/roster/RosterPage";

export const metadata = { title: "Roster — Cloudflow" };

export default async function Page() {
  const session = await auth();
  const role = (session?.user as any)?.role ?? "WAITER";
  return (
    <>
      <Header title="Staff Roster" />
      <RosterPage role={role} userId={session?.user?.id ?? ""} />
    </>
  );
}
