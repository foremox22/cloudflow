import { cookies } from "next/headers";
import { db } from "@/lib/db";

const COOKIE = "rms-rid";
export const DEFAULT_RID = "clrestaurant00000000000001";

export async function getRestaurantId(userId: string): Promise<string | null> {
  const jar = await cookies();
  const rid = jar.get(COOKIE)?.value;

  if (rid) {
    const membership = await db.userRestaurant.findUnique({
      where: { userId_restaurantId: { userId, restaurantId: rid } },
    });
    if (membership) return rid;
  }

  const first = await db.userRestaurant.findFirst({
    where: { userId },
    orderBy: { restaurant: { createdAt: "asc" } },
  });

  return first?.restaurantId ?? null;
}
