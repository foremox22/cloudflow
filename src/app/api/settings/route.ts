import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";
import { z } from "zod";

const timeSlotSchema = z.object({
  open:  z.string().regex(/^\d{2}:\d{2}$/),
  close: z.string().regex(/^\d{2}:\d{2}$/),
});

const dayHoursSchema = z.object({
  closed: z.boolean(),
  slots:  z.array(timeSlotSchema),
});

const patchSchema = z.object({
  name:    z.string().min(1).optional(),
  type:    z.enum(["CAFE", "DINE_IN", "TAKEAWAY", "CENTRAL_KITCHEN"]).optional(),
  address: z.string().optional(),
  phone:   z.string().optional(),
  timezone: z.string().optional(),
  rosterConfig: z.object({
    templates: z.array(z.object({
      id:      z.enum(["LUNCH", "DINNER", "ALLDAY"]),
      label:   z.string(),
      start:   z.string().regex(/^\d{2}:\d{2}$/),
      end:     z.string().regex(/^\d{2}:\d{2}$/),
      enabled: z.boolean(),
    })),
    groups: z.array(z.object({
      id:        z.string(),
      name:      z.string().min(1),
      color:     z.string(),
      memberIds: z.array(z.string()),
    })).optional(),
  }).optional(),
  openingHours: z.record(
    z.enum(["monday","tuesday","wednesday","thursday","friday","saturday","sunday"]),
    dayHoursSchema
  ).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const restaurant = await db.restaurant.findUnique({ where: { id: restaurantId } });
  return NextResponse.json(restaurant);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const membership = await db.userRestaurant.findUnique({
    where: { userId_restaurantId: { userId: session.user.id, restaurantId } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const hasRestaurantInfoUpdate = "name" in parsed.data || "type" in parsed.data || "address" in parsed.data || "phone" in parsed.data || "timezone" in parsed.data;
  const canManage = ["ADMIN", "MANAGER", "HEAD_CHEF"].includes(membership.role);

  if (hasRestaurantInfoUpdate && membership.role !== "ADMIN") {
    return NextResponse.json({ error: "Only admins can update restaurant info" }, { status: 403 });
  }
  if (!canManage) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const restaurant = await db.restaurant.update({
    where: { id: restaurantId },
    data: parsed.data,
  });

  return NextResponse.json(restaurant);
}
