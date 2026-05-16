import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import CentralKitchenPage from "@/components/central-kitchen/CentralKitchenPage";

export const metadata = { title: "Central Kitchen" };

export default async function Page() {
  const session = await auth();
  if (!session) redirect("/login");
  return <CentralKitchenPage />;
}
