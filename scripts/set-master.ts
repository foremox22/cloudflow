import "dotenv/config";
import { db } from "../src/lib/db";

async function main() {
  const result = await db.recipe.updateMany({ data: { isMaster: true } });
  console.log(`Updated ${result.count} recipes to isMaster = true`);
}

main().then(() => db.$disconnect()).catch((e) => { console.error(e); db.$disconnect(); });
