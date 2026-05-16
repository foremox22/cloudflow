import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Header from "@/components/layout/Header";
import LabPage from "@/components/lab/LabPage";

export const metadata = { title: "AI Kitchen Lab" };

export default async function LabPageWrapper() {
  const session = await auth();
  if (!session) redirect("/login");

  const userRole = (session as { user?: { role?: string } }).user?.role ?? "WAITER";

  return (
    <>
      <Header title="AI Kitchen Lab" />
      <LabPage userRole={userRole} />
    </>
  );
}
