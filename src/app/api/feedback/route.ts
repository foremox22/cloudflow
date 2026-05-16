import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";
import { notify } from "@/lib/notify";
import { z } from "zod";

const schema = z.object({
  customerName: z.string().optional(),
  rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().min(1).max(1000),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const restaurantId = await getRestaurantId(userId);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const feedbacks = await db.customerFeedback.findMany({
    where: { restaurantId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(feedbacks);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const restaurantId = await getRestaurantId(userId);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { customerName, rating, comment } = parsed.data;

  const feedback = await db.customerFeedback.create({
    data: { restaurantId, customerName: customerName ?? null, rating: rating ?? null, comment, submittedById: userId },
  });

  const ratingStr = rating ? ` (${rating}/5)` : "";
  const fromStr = customerName ? ` from ${customerName}` : "";
  await notify(
    restaurantId,
    "CUSTOMER_FEEDBACK",
    "New Customer Feedback",
    `New feedback${fromStr}${ratingStr}: "${comment.slice(0, 120)}${comment.length > 120 ? "…" : ""}"`,
    "/feedback"
  );

  return NextResponse.json(feedback, { status: 201 });
}
