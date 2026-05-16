import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SessionProvider } from "next-auth/react";
import Sidebar from "@/components/layout/Sidebar";
import { ToastProvider } from "@/lib/toast";
import { ConfirmProvider } from "@/lib/confirm";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <SessionProvider session={session}>
      <ToastProvider>
        <ConfirmProvider>
          <div className="flex bg-gray-950 min-h-screen" style={{ paddingTop: "env(safe-area-inset-top)" }}>
            <Sidebar />
            <main className="flex-1 flex flex-col overflow-hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>{children}</main>
          </div>
        </ConfirmProvider>
      </ToastProvider>
    </SessionProvider>
  );
}
