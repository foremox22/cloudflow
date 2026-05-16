import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const po = await db.purchaseOrder.findUnique({ where: { id } });
  if (!po) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (po.status !== "APPROVED") {
    return NextResponse.json({ error: "Only APPROVED orders can be marked as sent" }, { status: 400 });
  }

  const updated = await db.purchaseOrder.update({
    where: { id },
    data: { status: "SENT" },
  });

  return NextResponse.json(updated);
}
