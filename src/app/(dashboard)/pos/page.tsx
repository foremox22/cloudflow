import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";
import { redirect } from "next/navigation";
import Header from "@/components/layout/Header";
import FloorMap from "@/components/pos/FloorMap";
import CafePosScreen from "@/components/pos/CafePosScreen";

export default async function PosPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const restaurantId = await getRestaurantId(session.user.id);
  const restaurant = restaurantId
    ? await db.restaurant.findUnique({ where: { id: restaurantId }, select: { type: true } })
    : null;

  const isCafe = restaurant?.type === "CAFE";

  return (
    <>
      <Header title={isCafe ? "POS — Counter" : "POS — Floor Map"} />
      {isCafe ? (
        <CafePosScreen />
      ) : (
        <div className="p-6">
          <FloorMap />
        </div>
      )}
    </>
  );
}
