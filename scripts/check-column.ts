import "dotenv/config";
import { db } from "../src/lib/db";

const RESTAURANT_ID = "cmoptkc6n00005sbtn0qcawu8";

async function main() {
  const user = await db.user.findFirst({ where: { role: "ADMIN" }, select: { id: true, name: true } });
  const items = await db.menuItem.count({ where: { restaurantId: RESTAURANT_ID } });
  console.log("admin:", JSON.stringify(user));
  console.log("existing menu items:", items);
}

main().then(() => db.$disconnect()).catch((e) => { console.error(e); db.$disconnect(); });
