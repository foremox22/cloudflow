import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session as { user?: { id?: string } }).user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const labSession = await db.labSession.findFirst({
    where: { id, userId },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      labRecipes: {
        orderBy: { createdAt: "desc" },
        include: { reviewedBy: { select: { id: true, name: true } } },
      },
    },
  });

  if (!labSession) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(labSession);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session as { user?: { id?: string } }).user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { title } = body as { title?: string };

  const labSession = await db.labSession.findFirst({ where: { id, userId } });
  if (!labSession) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await db.labSession.update({
    where: { id },
    data: { title: title ?? labSession.title },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session as { user?: { id?: string } }).user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const labSession = await db.labSession.findFirst({ where: { id, userId } });
  if (!labSession) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.labSession.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
