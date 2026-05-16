import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  dietaryTags: z.array(z.string()).default([]),
  allergenTags: z.array(z.string()).default([]),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const q = new URL(req.url).searchParams.get("q") ?? "";
  if (!q.trim()) return NextResponse.json([]);

  const customers = await db.customer.findMany({
    where: {
      orders: { some: { restaurantId } },
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
      ],
    },
    orderBy: [{ visitCount: "desc" }, { name: "asc" }],
    take: 10,
  });

  return NextResponse.json(customers);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // Upsert by phone if provided
  if (parsed.data.phone) {
    const customer = await db.customer.upsert({
      where: { phone: parsed.data.phone },
      update: {
        name: parsed.data.name,
        dietaryTags: parsed.data.dietaryTags,
        allergenTags: parsed.data.allergenTags,
        notes: parsed.data.notes,
      },
      create: parsed.data as never,
    });
    return NextResponse.json(customer, { status: 201 });
  }

  const customer = await db.customer.create({ data: parsed.data as never });
  return NextResponse.json(customer, { status: 201 });
}
