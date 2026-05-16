import { db } from "@/lib/db";

export type NotificationType =
  | "GENERAL"
  | "AUTO_ORDER"
  | "LOW_STOCK"
  | "OUT_OF_STOCK"
  | "PREP_URGENT"
  | "CUSTOMER_FEEDBACK"
  | "INGREDIENT_OVERPRICE"
  | "INGREDIENT_PRICE_INCREASE"
  | "PUBLIC_HOLIDAY"
  | "SPECIAL_MENU";

// Which restaurant roles receive each notification type
const ROLE_MAP: Record<NotificationType, string[]> = {
  GENERAL:                    ["ADMIN", "MANAGER"],
  AUTO_ORDER:                 ["ADMIN", "MANAGER"],
  LOW_STOCK:                  ["ADMIN", "MANAGER", "HEAD_CHEF", "CHEF", "SOUS_CHEF"],
  OUT_OF_STOCK:               ["ADMIN", "MANAGER", "HEAD_CHEF", "CHEF", "SOUS_CHEF"],
  PREP_URGENT:                ["ADMIN", "MANAGER", "HEAD_CHEF", "CHEF", "SOUS_CHEF"],
  CUSTOMER_FEEDBACK:          ["ADMIN", "MANAGER", "HEAD_CHEF", "CHEF"],
  INGREDIENT_OVERPRICE:       ["ADMIN", "MANAGER", "HEAD_CHEF", "CHEF"],
  INGREDIENT_PRICE_INCREASE:  ["ADMIN", "MANAGER", "HEAD_CHEF", "CHEF"],
  PUBLIC_HOLIDAY:             ["ADMIN", "MANAGER", "CHEF", "SOUS_CHEF", "WAITER", "BARTENDER"],
  SPECIAL_MENU:               ["ADMIN", "MANAGER", "CHEF", "SOUS_CHEF", "WAITER", "BARTENDER"],
};

export async function notify(
  restaurantId: string,
  type: NotificationType,
  title: string,
  body: string,
  link?: string
): Promise<void> {
  const roles = ROLE_MAP[type];
  const members = await db.userRestaurant.findMany({
    where: { restaurantId, role: { in: roles as any[] }, user: { active: true } },
    select: { userId: true },
  });
  if (members.length === 0) return;
  await db.notification.createMany({
    data: members.map((m: (typeof members)[number]) => ({
      restaurantId,
      userId: m.userId,
      type: type as any,
      title,
      body,
      link: link ?? null,
    })),
  });
}
