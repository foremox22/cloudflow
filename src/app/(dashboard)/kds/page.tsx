import { auth } from "@/lib/auth";
import Header from "@/components/layout/Header";
import KdsBoard from "@/components/kds/KdsBoard";

export default async function KdsPage() {
  const session = await auth();
  const role = session?.user?.role ?? "WAITER";

  return (
    <>
      <Header title="Kitchen · Bar Display" />
      <div className="p-4">
        <KdsBoard role={role} />
      </div>
    </>
  );
}
