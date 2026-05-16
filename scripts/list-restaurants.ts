import "dotenv/config";
import { db } from "../src/lib/db";

async function main() {
  const restaurants = await db.restaurant.findMany({ select: { id: true, name: true, type: true } });
  console.log(JSON.stringify(restaurants, null, 2));
}

main().then(() => db.$disconnect()).catch((e) => { console.error(e); db.$disconnect(); });
