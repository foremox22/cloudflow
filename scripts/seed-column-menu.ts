import "dotenv/config";
import { db } from "../src/lib/db";

const RESTAURANT_ID = "cmoptkc6n00005sbtn0qcawu8";
const CREATED_BY_ID  = "cmoim6dtg000aiobtu397s23o";

// Full Column Cafe beverage menu from PDF
const MENU = [
  // ── Coffee & Hot Drinks ──────────────────────────────────
  {
    name: "Black Coffee",
    description: "Long Black, Espresso, Macchiato",
    price: 4.50,
    category: "BEVERAGE" as const,
    subcategory: "Coffee & Hot Drinks",
    sortOrder: 10,
  },
  {
    name: "White Coffee",
    description: "Latte, Flat White, Cappuccino",
    price: 5.00,
    category: "BEVERAGE" as const,
    subcategory: "Coffee & Hot Drinks",
    sortOrder: 20,
  },
  {
    name: "Batch Brew",
    description: "Rotating Seasonal Filter",
    price: 6.00,
    category: "BEVERAGE" as const,
    subcategory: "Coffee & Hot Drinks",
    sortOrder: 30,
  },
  {
    name: "Column Mocha",
    description: "70% Dark Belgian Chocolate, Smoked Sea Salt",
    price: 6.00,
    category: "BEVERAGE" as const,
    subcategory: "Coffee & Hot Drinks",
    sortOrder: 40,
  },
  {
    name: "Sticky Chai Latte",
    description: "Spiced tea brewed with honey",
    price: 6.00,
    category: "BEVERAGE" as const,
    subcategory: "Coffee & Hot Drinks",
    sortOrder: 50,
  },

  // ── Iced Drinks ──────────────────────────────────────────
  {
    name: "Iced Long Black",
    description: "Cold brew strength, served over ice",
    price: 6.00,
    category: "BEVERAGE" as const,
    subcategory: "Iced Drinks",
    sortOrder: 60,
  },
  {
    name: "Iced Latte",
    description: "Espresso over ice with your choice of milk",
    price: 6.50,
    category: "BEVERAGE" as const,
    subcategory: "Iced Drinks",
    sortOrder: 70,
  },
  {
    name: 'The "Column" Iced Coffee',
    description: "Double espresso, vanilla bean ice cream, chilled milk, cocoa dusting",
    price: 9.00,
    category: "BEVERAGE" as const,
    subcategory: "Iced Drinks",
    sortOrder: 80,
  },
  {
    name: "Iced Chocolate",
    description: "Dark chocolate ganache, chilled milk, vanilla ice cream",
    price: 8.50,
    category: "BEVERAGE" as const,
    subcategory: "Iced Drinks",
    sortOrder: 90,
  },

  // ── Cold Pressed Juice & Sodas ───────────────────────────
  {
    name: "The Orange Classic",
    description: "100% Local Orange district oranges, cold pressed",
    price: 9.00,
    category: "BEVERAGE" as const,
    subcategory: "Cold Pressed Juice & Sodas",
    sortOrder: 100,
  },
  {
    name: "The Green Pillar",
    description: "Green apple, celery, kale, lemon, ginger",
    price: 9.00,
    category: "BEVERAGE" as const,
    subcategory: "Cold Pressed Juice & Sodas",
    sortOrder: 110,
  },
  {
    name: "Yuzu & Thyme Spritz",
    description: "Sparkling water, yuzu citrus, fresh thyme",
    price: 8.50,
    category: "BEVERAGE" as const,
    subcategory: "Cold Pressed Juice & Sodas",
    sortOrder: 120,
  },
];

async function main() {
  // Get existing menu item names to avoid duplicates
  const existing = await db.menuItem.findMany({
    where: { restaurantId: RESTAURANT_ID },
    select: { name: true },
  });
  const existingNames = new Set(existing.map((i) => i.name.toLowerCase()));

  let created = 0;
  let skipped = 0;

  for (const item of MENU) {
    if (existingNames.has(item.name.toLowerCase())) {
      console.log(`  skip  ${item.name}`);
      skipped++;
      continue;
    }

    // Create a matching recipe first
    const recipe = await db.recipe.create({
      data: {
        restaurantId: RESTAURANT_ID,
        createdById: CREATED_BY_ID,
        name: item.name,
        category: item.category,
        description: item.description,
        sellingPrice: item.price,
        servings: 1,
        dietaryTags: [],
      },
    });

    // Create the menu item linked to the recipe
    await db.menuItem.create({
      data: {
        restaurantId: RESTAURANT_ID,
        recipeId: recipe.id,
        name: item.name,
        price: item.price,
        category: item.category,
        subcategory: item.subcategory,
        available: true,
        sortOrder: item.sortOrder,
      },
    });

    console.log(`  ✓  ${item.name}  $${item.price.toFixed(2)}`);
    created++;
  }

  console.log(`\nDone — ${created} created, ${skipped} skipped.`);
}

main().then(() => db.$disconnect()).catch((e) => { console.error(e); db.$disconnect(); process.exit(1); });
