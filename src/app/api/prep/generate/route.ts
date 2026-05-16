import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;
  const restaurantId = await getRestaurantId(userId);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const membership = await db.userRestaurant.findFirst({
    where: { userId, restaurantId },
  });
  if (!membership || !["ADMIN", "MANAGER", "HEAD_CHEF"].includes(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  const todayDow = now.getDay();
  const todayStart = new Date(now.toISOString().slice(0, 10) + "T00:00:00.000Z");
  const todayEnd   = new Date(now.toISOString().slice(0, 10) + "T23:59:59.999Z");

  const routines = await db.prepRoutine.findMany({
    where: { restaurantId, active: true },
    include: { ingredient: true },
  });

  // Filter to routines scheduled for today
  const todayRoutines = routines.filter((r) => r.daysOfWeek.includes(todayDow));

  if (todayRoutines.length === 0) return NextResponse.json({ created: 0 });

  // Batch fetch existing tasks for all relevant ingredients (eliminates N+1)
  const ingredientIds = todayRoutines.map((r: (typeof todayRoutines)[number]) => r.ingredientId);
  const existingTasks = await db.prepTask.findMany({
    where: {
      restaurantId,
      ingredientId: { in: ingredientIds },
      type: "ROUTINE",
      OR: [
        { scheduledFor: { gte: todayStart, lte: todayEnd } },
        { scheduledFor: null, createdAt: { gte: todayStart, lte: todayEnd } },
      ],
    },
    select: { ingredientId: true },
  });
  const existingIngredientIds = new Set(existingTasks.map((t: (typeof existingTasks)[number]) => t.ingredientId));

  // Filter to routines without existing tasks
  const routinesToCreate = todayRoutines.filter((r) => !existingIngredientIds.has(r.ingredientId));

  if (routinesToCreate.length === 0) return NextResponse.json({ created: 0 });

  // Batch create all tasks
  const tasksData = routinesToCreate.map((routine) => {
    const [hours, minutes] = routine.triggerTime.split(":").map(Number);
    const scheduledFor = new Date(todayStart);
    scheduledFor.setUTCHours(hours, minutes, 0, 0);
    return {
      restaurantId,
      ingredientId: routine.ingredientId,
      type: "ROUTINE" as const,
      status: "PENDING" as const,
      targetQty: routine.targetQty,
      scheduledFor,
      notes: `Routine prep — ${routine.ingredient.name}`,
      createdById: userId,
    };
  });

  await db.prepTask.createMany({ data: tasksData });

  return NextResponse.json({ created: routinesToCreate.length });
}
