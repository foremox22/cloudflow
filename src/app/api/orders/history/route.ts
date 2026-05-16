import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";
import type { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const fromTime = searchParams.get("fromTime") ?? "00:00";
  const toTime = searchParams.get("toTime") ?? "23:59";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = 50;

  const dateFilter: Prisma.OrderWhereInput =
    from || to
      ? {
          closedAt: {
            ...(from ? { gte: new Date(`${from}T${fromTime}:00.000Z`) } : {}),
            ...(to ? { lte: new Date(`${to}T${toTime}:59.999Z`) } : {}),
          },
        }
      : {};

  const baseWhere: Prisma.OrderWhereInput = {
    restaurantId,
    status: { in: ["PAID", "VOID"] },
    ...dateFilter,
  };

  const paidWhere = { restaurantId, status: "PAID" as const, ...dateFilter };

  const [orders, total, paidAgg, voidCount, cashAgg, cardAgg, voucherAgg] = await db.$transaction([
    db.order.findMany({
      where: baseWhere,
      include: {
        table: { select: { id: true, number: true, section: true } },
        server: { select: { id: true, name: true } },
        items: {
          include: { menuItem: { select: { id: true, name: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { closedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.order.count({ where: baseWhere }),
    db.order.aggregate({
      where: paidWhere,
      _sum: { total: true },
      _count: { id: true },
      _avg: { total: true },
    }),
    db.order.count({ where: { restaurantId, status: "VOID", ...dateFilter } }),
    db.order.aggregate({ where: paidWhere, _sum: { cashPaid: true } }),
    db.order.aggregate({ where: paidWhere, _sum: { cardPaid: true } }),
    db.order.aggregate({ where: paidWhere, _sum: { voucherPaid: true } }),
  ]);

  const legacyCashOrders  = await db.order.aggregate({ where: { ...paidWhere, paymentMethod: "CASH",  cashPaid: null }, _sum: { total: true } });
  const legacyCardOrders  = await db.order.aggregate({ where: { ...paidWhere, paymentMethod: "CARD",  cardPaid: null }, _sum: { total: true } });

  const cashTotal    = (cashAgg._sum.cashPaid    ?? 0) + (legacyCashOrders._sum.total ?? 0);
  const cardTotal    = (cardAgg._sum.cardPaid     ?? 0) + (legacyCardOrders._sum.total ?? 0);
  const voucherTotal = voucherAgg._sum.voucherPaid ?? 0;

  return NextResponse.json({
    orders,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    summary: {
      revenue: paidAgg._sum.total ?? 0,
      paidCount: paidAgg._count.id,
      avgOrder: paidAgg._avg.total ?? 0,
      voidCount,
      cashTotal,
      cardTotal,
      voucherTotal,
    },
  });
}
