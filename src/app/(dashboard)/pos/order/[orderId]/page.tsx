import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";
import { redirect } from "next/navigation";
import Header from "@/components/layout/Header";
import OrderScreen from "@/components/pos/OrderScreen";
import CafeOrderScreen from "@/components/pos/CafeOrderScreen";

interface Props {
  params: Promise<{ orderId: string }>;
}

export default async function OrderPage({ params }: Props) {
  const { orderId } = await params;

  const session = await auth();
  if (!session) redirect("/login");

  const restaurantId = await getRestaurantId(session.user.id);
  const restaurant = restaurantId
    ? await db.restaurant.findUnique({ where: { id: restaurantId }, select: { type: true } })
    : null;

  const isCafe = restaurant?.type === "CAFE";

  return (
    <>
      <Header title="POS" />
      {isCafe ? (
        <CafeOrderScreen orderId={orderId} />
      ) : (
        <OrderScreen orderId={orderId} />
      )}
    </>
  );
}
