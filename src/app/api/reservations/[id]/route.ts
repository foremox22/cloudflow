import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const patchSchema = z.object({
  tableId: z.string().optional(),
  customerId: z.string().optional().nullable(),
  customerName: z.string().min(1).optional(),
  customerPhone: z.string().optional(),
  partySize: z.number().int().min(1).optional(),
  reservedFor: z.string().optional(),
  notes: z.string().optional(),
  specialTags: z.array(z.string()).optional(),
  dietaryTags: z.array(z.string()).optional(),
  allergenTags: z.array(z.string()).optional(),
  status: z.enum(["PENDING", "CONFIRMED", "SEATED", "CANCELLED", "NO_SHOW"]).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.reservedFor) {
    data.reservedFor = new Date(parsed.data.reservedFor);
  }

  const reservation = await db.reservation.update({
    where: { id },
    data: data as never,
    include: {
      table: { select: { id: true, number: true, section: true } },
      createdBy: { select: { id: true, name: true } },
      customer: { select: { id: true, name: true, phone: true, dietaryTags: true, allergenTags: true } },
    },
  });

  return NextResponse.json(reservation);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await db.reservation.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
