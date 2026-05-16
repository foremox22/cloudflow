import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import PrepBoard from "@/components/prep/PrepBoard";

export default async function PrepPage() {
  const session = await auth();
  if (!session) redirect("/login");

  // Fetch all ingredients that are prep items (linked to a prep recipe)
  const prepItems = await db.ingredient.findMany({
    where: { active: true, prepRecipeId: { not: null } },
    select: {
      id: true,
      name: true,
      unit: true,
      currentStock: true,
      parLevel: true,
      batchYield: true,
      prepRecipeId: true,
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="p-6 max-w-4xl">
      <PrepBoard prepItems={prepItems} />
    </div>
  );
}
