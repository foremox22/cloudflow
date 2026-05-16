// @ts-nocheck
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: "postgresql://postgres:postgres@127.0.0.1:5432/rms_db" });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🍣  Seeding Modern Japanese Cuisine...\n");

  // ── Chef user (must exist) ──────────────────────────────────────────────────
  const chef = await prisma.user.findFirst({ where: { role: "CHEF" } });
  if (!chef) throw new Error("No CHEF user found — run main seed first.");

  // ── Allergens (upsert) ──────────────────────────────────────────────────────
  const allergenNames = ["Gluten", "Dairy", "Eggs", "Fish", "Soy", "Sesame", "Shellfish"];
  const allergenMap: Record<string, string> = {};
  for (const name of allergenNames) {
    const a = await prisma.allergen.upsert({ where: { name }, update: {}, create: { name } });
    allergenMap[name] = a.id;
  }
  console.log("✓ Allergens");

  // ── Ingredients (upsert) ────────────────────────────────────────────────────
  const ingredientDefs = [
    { name: "Wagyu Beef",       category: "MEAT",      unit: "KG",    costPerUnit: 55,   currentStock: 5,   parLevel: 8,  reorderPoint: 2 },
    { name: "Salmon Fillet",    category: "SEAFOOD",   unit: "KG",    costPerUnit: 22,   currentStock: 6,   parLevel: 8,  reorderPoint: 2 },
    { name: "Black Cod",        category: "SEAFOOD",   unit: "KG",    costPerUnit: 35,   currentStock: 4,   parLevel: 6,  reorderPoint: 1.5 },
    { name: "Pork Belly",       category: "MEAT",      unit: "KG",    costPerUnit: 12,   currentStock: 8,   parLevel: 10, reorderPoint: 3 },
    { name: "Soy Sauce",        category: "CONDIMENT", unit: "L",     costPerUnit: 4,    currentStock: 5,   parLevel: 6,  reorderPoint: 2 },
    { name: "Miso Paste",       category: "CONDIMENT", unit: "KG",    costPerUnit: 8,    currentStock: 3,   parLevel: 4,  reorderPoint: 1 },
    { name: "Mirin",            category: "CONDIMENT", unit: "L",     costPerUnit: 6,    currentStock: 3,   parLevel: 4,  reorderPoint: 1 },
    { name: "Sake",             category: "ALCOHOL",   unit: "L",     costPerUnit: 15,   currentStock: 2,   parLevel: 3,  reorderPoint: 1 },
    { name: "Sesame Oil",       category: "OIL",       unit: "L",     costPerUnit: 12,   currentStock: 2,   parLevel: 3,  reorderPoint: 1 },
    { name: "Truffle Oil",      category: "OIL",       unit: "L",     costPerUnit: 45,   currentStock: 0.5, parLevel: 1,  reorderPoint: 0.2 },
    { name: "Japanese Rice",    category: "GRAIN",     unit: "KG",    costPerUnit: 2.5,  currentStock: 15,  parLevel: 20, reorderPoint: 5 },
    { name: "Ramen Noodles",    category: "GRAIN",     unit: "KG",    costPerUnit: 3.5,  currentStock: 6,   parLevel: 8,  reorderPoint: 2 },
    { name: "Gyoza Wrappers",   category: "GRAIN",     unit: "KG",    costPerUnit: 4,    currentStock: 4,   parLevel: 5,  reorderPoint: 1.5 },
    { name: "Yuzu Juice",       category: "CONDIMENT", unit: "L",     costPerUnit: 20,   currentStock: 1,   parLevel: 2,  reorderPoint: 0.5 },
    { name: "Matcha Powder",    category: "SPICE",     unit: "KG",    costPerUnit: 120,  currentStock: 0.5, parLevel: 1,  reorderPoint: 0.2 },
    { name: "Ginger",           category: "SPICE",     unit: "KG",    costPerUnit: 4,    currentStock: 2,   parLevel: 3,  reorderPoint: 1 },
    { name: "Spring Onion",     category: "VEGETABLE", unit: "BUNCH", costPerUnit: 1.5,  currentStock: 20,  parLevel: 25, reorderPoint: 8 },
    { name: "Butter",           category: "DAIRY",     unit: "KG",    costPerUnit: 9,    currentStock: 3,   parLevel: 4,  reorderPoint: 1 },
    { name: "All-Purpose Flour",category: "GRAIN",     unit: "KG",    costPerUnit: 1.5,  currentStock: 8,   parLevel: 10, reorderPoint: 3 },
    { name: "Sugar",            category: "OTHER",     unit: "KG",    costPerUnit: 1.5,  currentStock: 5,   parLevel: 6,  reorderPoint: 2 },
    { name: "Heavy Cream",      category: "DAIRY",     unit: "L",     costPerUnit: 4,    currentStock: 4,   parLevel: 5,  reorderPoint: 1.5 },
    { name: "Eggs",             category: "DAIRY",     unit: "PIECE", costPerUnit: 0.4,  currentStock: 60,  parLevel: 80, reorderPoint: 20 },
    { name: "Garlic",           category: "VEGETABLE", unit: "KG",    costPerUnit: 4,    currentStock: 2,   parLevel: 3,  reorderPoint: 1 },
  ] as const;

  const ing: Record<string, string> = {};
  for (const def of ingredientDefs) {
    const i = await prisma.ingredient.upsert({
      where: { name: def.name },
      update: {},
      create: def as never,
    });
    ing[def.name] = i.id;
  }
  console.log(`✓ ${ingredientDefs.length} ingredients`);

  // ── Helper ──────────────────────────────────────────────────────────────────
  async function upsertRecipe(data: {
    name: string;
    category: string;
    description: string;
    method: string;
    prepTime: number;
    cookTime: number;
    servings: number;
    sellingPrice: number;
    dietaryTags: string[];
    ingredients: { name: string; quantity: number; unit: string }[];
    allergenNames: string[];
  }) {
    const existing = await prisma.recipe.findFirst({ where: { name: data.name } });
    if (existing) { console.log(`  · skipped (exists): ${data.name}`); return existing; }

    const recipe = await prisma.recipe.create({
      data: {
        name: data.name,
        category: data.category as never,
        description: data.description,
        method: data.method,
        prepTime: data.prepTime,
        cookTime: data.cookTime,
        servings: data.servings,
        sellingPrice: data.sellingPrice,
        dietaryTags: data.dietaryTags,
        createdById: chef.id,
        ingredients: {
          create: data.ingredients.map((i) => ({
            ingredientId: ing[i.name],
            quantity: i.quantity,
            unit: i.unit as never,
          })),
        },
        allergens: {
          create: data.allergenNames.map((n) => ({ allergenId: allergenMap[n] })),
        },
      },
    });

    // Create matching menu item
    await prisma.menuItem.upsert({
      where: { id: `menu-jp-${recipe.id}` },
      update: {},
      create: {
        id: `menu-jp-${recipe.id}`,
        recipeId: recipe.id,
        name: recipe.name,
        price: recipe.sellingPrice,
        category: recipe.category,
        available: true,
        sortOrder: 0,
      },
    });

    console.log(`  ✓ ${data.name}`);
    return recipe;
  }

  console.log("\nCreating recipes + menu items:");

  // ── 1. Wagyu Beef Tataki ────────────────────────────────────────────────────
  await upsertRecipe({
    name: "Wagyu Beef Tataki",
    category: "STARTER",
    description: "Lightly seared A5 wagyu, ponzu glaze, micro shiso, toasted sesame.",
    method:
      "1. Sear wagyu 30 sec per side on screaming-hot cast iron.\n" +
      "2. Slice paper-thin and arrange on chilled plate.\n" +
      "3. Whisk soy, mirin and sesame oil into ponzu. Drizzle over beef.\n" +
      "4. Garnish with shaved ginger and sliced spring onion.",
    prepTime: 15, cookTime: 5, servings: 2, sellingPrice: 24,
    dietaryTags: ["Gluten-Free", "Dairy-Free"],
    ingredients: [
      { name: "Wagyu Beef",   quantity: 0.15,  unit: "KG" },
      { name: "Soy Sauce",    quantity: 30,    unit: "ML" },
      { name: "Mirin",        quantity: 15,    unit: "ML" },
      { name: "Sesame Oil",   quantity: 5,     unit: "ML" },
      { name: "Ginger",       quantity: 0.01,  unit: "KG" },
      { name: "Spring Onion", quantity: 0.1,   unit: "BUNCH" },
    ],
    allergenNames: ["Soy", "Sesame"],
  });

  // ── 2. Truffle Black Garlic Gyoza ───────────────────────────────────────────
  await upsertRecipe({
    name: "Truffle Black Garlic Gyoza",
    category: "STARTER",
    description: "Pan-fried pork and black garlic dumplings, truffle ponzu dipping sauce.",
    method:
      "1. Finely mince pork belly, garlic and ginger. Season with soy and sesame oil.\n" +
      "2. Fill wrappers; pleat and seal edges.\n" +
      "3. Pan-fry flat-side down in hot oil until golden, 2 min.\n" +
      "4. Add splash of water, cover and steam 4 min. Finish with truffle oil drizzle.",
    prepTime: 30, cookTime: 10, servings: 2, sellingPrice: 18,
    dietaryTags: [],
    ingredients: [
      { name: "Pork Belly",      quantity: 0.1,   unit: "KG" },
      { name: "Gyoza Wrappers",  quantity: 0.12,  unit: "KG" },
      { name: "Garlic",          quantity: 0.02,  unit: "KG" },
      { name: "Ginger",          quantity: 0.015, unit: "KG" },
      { name: "Soy Sauce",       quantity: 20,    unit: "ML" },
      { name: "Truffle Oil",     quantity: 8,     unit: "ML" },
      { name: "Spring Onion",    quantity: 0.1,   unit: "BUNCH" },
      { name: "Sesame Oil",      quantity: 5,     unit: "ML" },
    ],
    allergenNames: ["Gluten", "Soy", "Sesame"],
  });

  // ── 3. Spicy Tuna Crispy Rice ───────────────────────────────────────────────
  await upsertRecipe({
    name: "Spicy Tuna Crispy Rice",
    category: "STARTER",
    description: "Golden crispy sushi rice blocks topped with spicy salmon tartare and yuzu aioli.",
    method:
      "1. Cook and season sushi rice with mirin and rice vinegar. Press into thin sheet, chill.\n" +
      "2. Cut into rectangles; pan-fry in sesame oil until crispy on both sides.\n" +
      "3. Dice salmon finely; toss with soy, sesame oil and a touch of chilli.\n" +
      "4. Top each rice block with salmon mixture and micro herbs.",
    prepTime: 25, cookTime: 15, servings: 2, sellingPrice: 22,
    dietaryTags: ["Gluten-Free", "Dairy-Free"],
    ingredients: [
      { name: "Japanese Rice",  quantity: 0.12,  unit: "KG" },
      { name: "Salmon Fillet",  quantity: 0.08,  unit: "KG" },
      { name: "Soy Sauce",      quantity: 15,    unit: "ML" },
      { name: "Sesame Oil",     quantity: 8,     unit: "ML" },
      { name: "Mirin",          quantity: 10,    unit: "ML" },
      { name: "Spring Onion",   quantity: 0.05,  unit: "BUNCH" },
    ],
    allergenNames: ["Fish", "Soy", "Sesame"],
  });

  // ── 4. Black Sesame Tonkotsu Ramen ──────────────────────────────────────────
  await upsertRecipe({
    name: "Black Sesame Tonkotsu Ramen",
    category: "MAIN",
    description: "18-hour pork bone broth enriched with black sesame tare, chashu belly, soft-boiled egg.",
    method:
      "1. Simmer pork belly in soy, mirin and sake 3 hrs until tender. Slice for chashu.\n" +
      "2. Reduce broth with miso paste and black sesame; adjust seasoning.\n" +
      "3. Cook noodles al dente; drain and place in bowl.\n" +
      "4. Ladle hot broth over noodles. Top with chashu, soft egg, spring onion and sesame oil.",
    prepTime: 20, cookTime: 180, servings: 1, sellingPrice: 22,
    dietaryTags: [],
    ingredients: [
      { name: "Pork Belly",     quantity: 0.15,  unit: "KG" },
      { name: "Ramen Noodles",  quantity: 0.12,  unit: "KG" },
      { name: "Soy Sauce",      quantity: 30,    unit: "ML" },
      { name: "Miso Paste",     quantity: 0.025, unit: "KG" },
      { name: "Sesame Oil",     quantity: 10,    unit: "ML" },
      { name: "Spring Onion",   quantity: 0.15,  unit: "BUNCH" },
      { name: "Ginger",         quantity: 0.015, unit: "KG" },
      { name: "Eggs",           quantity: 1,     unit: "PIECE" },
      { name: "Mirin",          quantity: 20,    unit: "ML" },
      { name: "Sake",           quantity: 15,    unit: "ML" },
    ],
    allergenNames: ["Gluten", "Soy", "Eggs", "Sesame"],
  });

  // ── 5. Miso Glazed Black Cod ────────────────────────────────────────────────
  await upsertRecipe({
    name: "Miso Glazed Black Cod",
    category: "MAIN",
    description: "Nobu-inspired sablefish marinated 48 h in sweet white miso, broiled to caramelised perfection.",
    method:
      "1. Blend miso, mirin, sake and sugar until smooth. Coat cod fillets; marinate 48 h.\n" +
      "2. Wipe excess marinade; place on lined tray.\n" +
      "3. Broil on high 4–5 min until glaze caramelises and flesh flakes.\n" +
      "4. Rest 2 min. Serve with pickled cucumber and steamed rice.",
    prepTime: 10, cookTime: 15, servings: 1, sellingPrice: 34,
    dietaryTags: ["Gluten-Free", "Dairy-Free"],
    ingredients: [
      { name: "Black Cod",    quantity: 0.18,  unit: "KG" },
      { name: "Miso Paste",   quantity: 0.04,  unit: "KG" },
      { name: "Mirin",        quantity: 25,    unit: "ML" },
      { name: "Sake",         quantity: 20,    unit: "ML" },
      { name: "Sugar",        quantity: 0.015, unit: "KG" },
      { name: "Sesame Oil",   quantity: 5,     unit: "ML" },
    ],
    allergenNames: ["Fish", "Soy", "Sesame"],
  });

  // ── 6. Wagyu Beef Don ───────────────────────────────────────────────────────
  await upsertRecipe({
    name: "Wagyu Beef Don",
    category: "MAIN",
    description: "Sliced A5 wagyu over steamed rice, dashi-soy tare, onsen egg, crispy shallots.",
    method:
      "1. Combine soy, mirin and sake; reduce by a third to make tare.\n" +
      "2. Sear wagyu slices 20 sec per side; rest.\n" +
      "3. Cook onsen egg at 63°C for 45 min.\n" +
      "4. Bowl rice, layer wagyu, crack egg on top, drizzle tare, garnish with spring onion.",
    prepTime: 15, cookTime: 20, servings: 1, sellingPrice: 38,
    dietaryTags: ["Gluten-Free", "Dairy-Free"],
    ingredients: [
      { name: "Wagyu Beef",   quantity: 0.16,  unit: "KG" },
      { name: "Japanese Rice",quantity: 0.18,  unit: "KG" },
      { name: "Soy Sauce",    quantity: 25,    unit: "ML" },
      { name: "Mirin",        quantity: 20,    unit: "ML" },
      { name: "Sake",         quantity: 15,    unit: "ML" },
      { name: "Spring Onion", quantity: 0.1,   unit: "BUNCH" },
      { name: "Eggs",         quantity: 1,     unit: "PIECE" },
    ],
    allergenNames: ["Soy", "Eggs"],
  });

  // ── 7. Matcha Soufflé ───────────────────────────────────────────────────────
  await upsertRecipe({
    name: "Matcha Soufflé",
    category: "DESSERT",
    description: "Light-as-air ceremonial matcha soufflé with white chocolate centre, dusted icing sugar.",
    method:
      "1. Melt butter; whisk in flour to make roux. Add warm cream and matcha; stir until thick.\n" +
      "2. Separate eggs; beat yolks into matcha base.\n" +
      "3. Whip egg whites to stiff peaks with sugar; fold into base in thirds.\n" +
      "4. Fill buttered ramekins; bake 190°C for 11–12 min. Serve immediately.",
    prepTime: 15, cookTime: 12, servings: 1, sellingPrice: 16,
    dietaryTags: ["Vegetarian"],
    ingredients: [
      { name: "Matcha Powder",     quantity: 0.008, unit: "KG" },
      { name: "Eggs",              quantity: 2,     unit: "PIECE" },
      { name: "Sugar",             quantity: 0.035, unit: "KG" },
      { name: "Butter",            quantity: 0.02,  unit: "KG" },
      { name: "All-Purpose Flour", quantity: 0.012, unit: "KG" },
      { name: "Heavy Cream",       quantity: 50,    unit: "ML" },
    ],
    allergenNames: ["Gluten", "Dairy", "Eggs"],
  });

  // ── 8. Yuzu Citrus Tart ─────────────────────────────────────────────────────
  await upsertRecipe({
    name: "Yuzu Citrus Tart",
    category: "DESSERT",
    description: "Crisp butter pastry shell filled with silky yuzu curd, torched Italian meringue.",
    method:
      "1. Make shortcrust: rub butter into flour and sugar; bind with egg yolk. Blind bake 15 min.\n" +
      "2. Whisk yuzu juice, eggs, sugar and cream over bain-marie until thickened to curd.\n" +
      "3. Pour curd into shell; refrigerate 2 h.\n" +
      "4. Top with meringue peaks; torch until golden.",
    prepTime: 30, cookTime: 20, servings: 1, sellingPrice: 14,
    dietaryTags: ["Vegetarian"],
    ingredients: [
      { name: "Yuzu Juice",        quantity: 40,    unit: "ML" },
      { name: "Eggs",              quantity: 2,     unit: "PIECE" },
      { name: "Sugar",             quantity: 0.045, unit: "KG" },
      { name: "Butter",            quantity: 0.035, unit: "KG" },
      { name: "All-Purpose Flour", quantity: 0.07,  unit: "KG" },
      { name: "Heavy Cream",       quantity: 30,    unit: "ML" },
    ],
    allergenNames: ["Gluten", "Dairy", "Eggs"],
  });

  console.log("\n✅  Done! 8 Japanese recipes + menu items seeded.");
  console.log("   Starters : Wagyu Tataki · Truffle Gyoza · Spicy Tuna Crispy Rice");
  console.log("   Mains    : Black Sesame Ramen · Miso Black Cod · Wagyu Beef Don");
  console.log("   Desserts : Matcha Soufflé · Yuzu Citrus Tart");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
