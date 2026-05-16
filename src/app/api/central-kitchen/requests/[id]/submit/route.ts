import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const { id } = await params;
  const request = await db.distributionRequest.findFirst({ where: { id, fromRestaurantId: restaurantId } });
  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (request.status !== "DRAFT") return NextResponse.json({ error: "Only DRAFT can be submitted" }, { status: 400 });

  const updated = await db.distributionRequest.update({
    where: { id },
    data: { status: "SUBMITTED", updatedAt: new Date() },
  });
  return NextResponse.json(updated);
}
