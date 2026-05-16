// @ts-nocheck
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: "postgresql://postgres:postgres@127.0.0.1:5432/rms_db" });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🍹  Seeding Beverages...\n");

  const chef = await prisma.user.findFirst({ where: { role: "CHEF" } });
  if (!chef) throw new Error("No CHEF user — run main seed first.");

  // ── Allergens ──────────────────────────────────────────────────────────────
  const allergenNames = ["Gluten", "Dairy", "Eggs", "Soy", "Sesame"];
  const aMap: Record<string, string> = {};
  for (const name of allergenNames) {
    const a = await prisma.allergen.upsert({ where: { name }, update: {}, create: { name } });
    aMap[name] = a.id;
  }

  // ── Raw ingredients ────────────────────────────────────────────────────────
  const rawDefs = [
    // Spirits
    { name: "Japanese Whisky",   category: "ALCOHOL",   unit: "L",     costPerUnit: 55,  currentStock: 2,   parLevel: 3,   reorderPoint: 1   },
    { name: "Vodka",             category: "ALCOHOL",   unit: "L",     costPerUnit: 25,  currentStock: 2,   parLevel: 3,   reorderPoint: 1   },
    { name: "Gin",               category: "ALCOHOL",   unit: "L",     costPerUnit: 30,  currentStock: 2,   parLevel: 3,   reorderPoint: 1   },
    { name: "Tequila",           category: "ALCOHOL",   unit: "L",     costPerUnit: 30,  currentStock: 1,   parLevel: 2,   reorderPoint: 0.5 },
    { name: "Rum",               category: "ALCOHOL",   unit: "L",     costPerUnit: 22,  currentStock: 1,   parLevel: 2,   reorderPoint: 0.5 },
    { name: "Cointreau",         category: "ALCOHOL",   unit: "L",     costPerUnit: 35,  currentStock: 1,   parLevel: 2,   reorderPoint: 0.5 },
    { name: "Peach Schnapps",    category: "ALCOHOL",   unit: "L",     costPerUnit: 20,  currentStock: 1,   parLevel: 2,   reorderPoint: 0.5 },
    { name: "Kahlua",            category: "ALCOHOL",   unit: "L",     costPerUnit: 28,  currentStock: 1,   parLevel: 2,   reorderPoint: 0.5 },
    { name: "Angostura Bitters", category: "ALCOHOL",   unit: "L",     costPerUnit: 40,  currentStock: 0.5, parLevel: 1,   reorderPoint: 0.2 },
    // Mixers
    { name: "Soda Water",        category: "SOFT_DRINK", unit: "L",    costPerUnit: 1.5, currentStock: 10,  parLevel: 15,  reorderPoint: 5   },
    { name: "Tonic Water",       category: "SOFT_DRINK", unit: "L",    costPerUnit: 2,   currentStock: 6,   parLevel: 10,  reorderPoint: 3   },
    { name: "Ginger Beer",       category: "SOFT_DRINK", unit: "L",    costPerUnit: 3,   currentStock: 6,   parLevel: 8,   reorderPoint: 3   },
    { name: "Pineapple Juice",   category: "OTHER",     unit: "L",     costPerUnit: 4,   currentStock: 3,   parLevel: 4,   reorderPoint: 1   },
    { name: "Passion Fruit Purée", category: "OTHER",   unit: "L",     costPerUnit: 12,  currentStock: 1,   parLevel: 2,   reorderPoint: 0.5 },
    { name: "Lychee (canned)",   category: "OTHER",     unit: "KG",    costPerUnit: 5,   currentStock: 2,   parLevel: 3,   reorderPoint: 1   },
    { name: "Lychee Syrup",      category: "CONDIMENT", unit: "L",     costPerUnit: 8,   currentStock: 1,   parLevel: 2,   reorderPoint: 0.5 },
    { name: "Grenadine",         category: "CONDIMENT", unit: "L",     costPerUnit: 10,  currentStock: 1,   parLevel: 2,   reorderPoint: 0.5 },
    { name: "Rose Water",        category: "CONDIMENT", unit: "L",     costPerUnit: 15,  currentStock: 0.5, parLevel: 1,   reorderPoint: 0.3 },
    { name: "Lemon Juice",       category: "CONDIMENT", unit: "L",     costPerUnit: 6,   currentStock: 1,   parLevel: 2,   reorderPoint: 0.5 },
    { name: "Butterfly Pea Tea", category: "OTHER",     unit: "L",     costPerUnit: 8,   currentStock: 1,   parLevel: 2,   reorderPoint: 0.5 },
    // Dairy / non-dairy
    { name: "Milk",              category: "DAIRY",     unit: "L",     costPerUnit: 2,   currentStock: 5,   parLevel: 8,   reorderPoint: 2   },
    { name: "Oat Milk",          category: "OTHER",     unit: "L",     costPerUnit: 3.5, currentStock: 4,   parLevel: 6,   reorderPoint: 2   },
    { name: "Coconut Cream",     category: "OTHER",     unit: "L",     costPerUnit: 4,   currentStock: 2,   parLevel: 3,   reorderPoint: 1   },
    // Coffee
    { name: "Espresso",          category: "OTHER",     unit: "L",     costPerUnit: 20,  currentStock: 1,   parLevel: 2,   reorderPoint: 0.5 },
    // Garnish / other
    { name: "Mint",              category: "VEGETABLE", unit: "BUNCH", costPerUnit: 2,   currentStock: 10,  parLevel: 15,  reorderPoint: 5   },
    { name: "Hojicha Powder",    category: "SPICE",     unit: "KG",    costPerUnit: 60,  currentStock: 0.3, parLevel: 0.5, reorderPoint: 0.1 },
    // Already in other seeds — upsert safely
    { name: "Sugar",             category: "OTHER",     unit: "KG",    costPerUnit: 1.5, currentStock: 5,   parLevel: 6,   reorderPoint: 2   },
    { name: "Honey",             category: "OTHER",     unit: "KG",    costPerUnit: 10,  currentStock: 1,   parLevel: 2,   reorderPoint: 0.5 },
    { name: "Yuzu Juice",        category: "CONDIMENT", unit: "L",     costPerUnit: 20,  currentStock: 1,   parLevel: 2,   reorderPoint: 0.5 },
    { name: "Lime Juice",        category: "CONDIMENT", unit: "L",     costPerUnit: 8,   currentStock: 1,   parLevel: 2,   reorderPoint: 0.5 },
    { name: "Matcha Powder",     category: "SPICE",     unit: "KG",    costPerUnit: 120, currentStock: 0.5, parLevel: 1,   reorderPoint: 0.2 },
    { name: "Ginger",            category: "SPICE",     unit: "KG",    costPerUnit: 4,   currentStock: 2,   parLevel: 3,   reorderPoint: 1   },
    { name: "Sake",              category: "ALCOHOL",   unit: "L",     costPerUnit: 15,  currentStock: 2,   parLevel: 3,   reorderPoint: 1   },
    { name: "Mirin",             category: "CONDIMENT", unit: "L",     costPerUnit: 6,   currentStock: 3,   parLevel: 4,   reorderPoint: 1   },
    { name: "Miso Paste",        category: "CONDIMENT", unit: "KG",    costPerUnit: 8,   currentStock: 3,   parLevel: 4,   reorderPoint: 1   },
    { name: "Eggs",              category: "DAIRY",     unit: "PIECE", costPerUnit: 0.4, currentStock: 60,  parLevel: 80,  reorderPoint: 20  },
  ] as const;

  const raw: Record<string, string> = {};
  for (const def of rawDefs) {
    const i = await prisma.ingredient.upsert({
      where: { name: def.name },
      update: {},
      create: def as never,
    });
    raw[def.name] = i.id;
  }
  console.log(`✓ ${rawDefs.length} raw ingredients (upserted)`);

  // ── Prep stock items for syrups ────────────────────────────────────────────
  const syrupDefs = [
    { name: "Simple Syrup",       unit: "L",  parLevel: 2,  reorderPoint: 0.5 },
    { name: "Yuzu Simple Syrup",  unit: "L",  parLevel: 1,  reorderPoint: 0.3 },
    { name: "Honey Ginger Syrup", unit: "L",  parLevel: 1,  reorderPoint: 0.3 },
    { name: "Matcha Syrup",       unit: "L",  parLevel: 1,  reorderPoint: 0.3 },
  ];
  const syrup: Record<string, string> = {};
  for (const def of syrupDefs) {
    const i = await prisma.ingredient.upsert({
      where: { name: def.name },
      update: {},
      create: { name: def.name, category: "CONDIMENT", unit: def.unit as never, costPerUnit: 0, currentStock: 0, parLevel: def.parLevel, reorderPoint: def.reorderPoint, reorderQty: def.parLevel * 2 },
    });
    syrup[def.name] = i.id;
  }
  console.log(`✓ ${syrupDefs.length} syrup stock items`);

  // ── Helper: create prep recipe + link to stock item ────────────────────────
  async function upsertSyrupRecipe(data: {
    name: string; description: string; method: string;
    prepTime: number; cookTime: number; servings: number;
    ings: { name: string; qty: number; unit: string }[];
    linksTo: string; batchYield: number;
  }) {
    const existing = await prisma.recipe.findFirst({ where: { name: data.name } });
    if (existing) { console.log(`  · skipped: ${data.name}`); return; }
    const recipe = await prisma.recipe.create({
      data: {
        name: data.name, category: "SAUCE", description: data.description,
        method: data.method, prepTime: data.prepTime, cookTime: data.cookTime,
        servings: data.servings, sellingPrice: 0, dietaryTags: ["VEGAN", "GLUTEN_FREE"],
        createdById: chef.id,
        ingredients: { create: data.ings.map((i) => ({ ingredientId: raw[i.name], quantity: i.qty, unit: i.unit as never })) },
      },
    });
    await prisma.ingredient.update({
      where: { id: syrup[data.linksTo] },
      data: { prepRecipeId: recipe.id, batchYield: data.batchYield },
    });
    console.log(`  ✓ ${data.name} → ${data.linksTo}`);
  }

  console.log("\nCreating syrup prep recipes:");
  await upsertSyrupRecipe({
    name: "Simple Syrup", linksTo: "Simple Syrup", batchYield: 0.5,
    description: "1:1 sugar syrup. Base sweetener for all cocktails and mocktails.",
    method: "1. Combine equal parts sugar and water in saucepan.\n2. Heat on medium, stir until sugar fully dissolves.\n3. Do not boil — remove from heat as soon as clear.\n4. Cool completely. Bottle and refrigerate up to 3 weeks.",
    prepTime: 5, cookTime: 5, servings: 20,
    ings: [{ name: "Sugar", qty: 0.5, unit: "KG" }],
  });

  await upsertSyrupRecipe({
    name: "Yuzu Simple Syrup", linksTo: "Yuzu Simple Syrup", batchYield: 0.4,
    description: "Yuzu-infused sweetener for yuzu cocktails, lemonades and soda drinks.",
    method: "1. Make simple syrup base (equal sugar + water).\n2. Remove from heat and immediately stir in fresh yuzu juice.\n3. Cool completely — do not reheat after adding yuzu.\n4. Strain and bottle. Refrigerate up to 2 weeks.",
    prepTime: 5, cookTime: 5, servings: 15,
    ings: [
      { name: "Sugar",      qty: 0.3,  unit: "KG" },
      { name: "Yuzu Juice", qty: 100,  unit: "ML" },
    ],
  });

  await upsertSyrupRecipe({
    name: "Honey Ginger Syrup", linksTo: "Honey Ginger Syrup", batchYield: 0.4,
    description: "Warming honey syrup with fresh ginger. Used in hot drinks and ginger cocktails.",
    method: "1. Slice 50g fresh ginger into coins.\n2. Combine honey and water (2:1 honey:water) with ginger in saucepan.\n3. Warm gently on low — do NOT boil honey.\n4. Steep 20 min. Strain and cool. Refrigerate 3 weeks.",
    prepTime: 5, cookTime: 25, servings: 15,
    ings: [
      { name: "Honey",  qty: 0.25, unit: "KG" },
      { name: "Ginger", qty: 0.05, unit: "KG" },
    ],
  });

  await upsertSyrupRecipe({
    name: "Matcha Syrup", linksTo: "Matcha Syrup", batchYield: 0.35,
    description: "Sweetened ceremonial matcha concentrate for lattes and cocktails.",
    method: "1. Sift matcha powder into a bowl.\n2. Dissolve sugar in warm (not boiling) water — 70°C.\n3. Whisk matcha into the sugar water using a bamboo whisk until smooth.\n4. Strain through fine sieve. Bottle and refrigerate up to 1 week.",
    prepTime: 10, cookTime: 0, servings: 12,
    ings: [
      { name: "Matcha Powder", qty: 0.02, unit: "KG" },
      { name: "Sugar",         qty: 0.2,  unit: "KG" },
    ],
  });

  // ── Helper: create beverage recipe + menu item ─────────────────────────────
  async function upsertBeverage(data: {
    name: string; description: string; method: string;
    prepTime: number; sellingPrice: number;
    dietaryTags: string[];
    allergenNames: string[];
    ings: { name: string; qty: number; unit: string; isSyrup?: boolean }[];
  }) {
    const existing = await prisma.recipe.findFirst({ where: { name: data.name } });
    if (existing) { console.log(`  · skipped: ${data.name}`); return; }

    const recipe = await prisma.recipe.create({
      data: {
        name: data.name, category: "BEVERAGE", description: data.description,
        method: data.method, prepTime: data.prepTime, cookTime: 0,
        servings: 1, sellingPrice: data.sellingPrice,
        dietaryTags: data.dietaryTags, createdById: chef.id,
        ingredients: {
          create: data.ings.map((i) => ({
            ingredientId: i.isSyrup ? syrup[i.name] : raw[i.name],
            quantity: i.qty,
            unit: i.unit as never,
          })),
        },
        allergens: { create: data.allergenNames.map((n) => ({ allergenId: aMap[n] })) },
      },
    });

    await prisma.menuItem.upsert({
      where: { id: `menu-bev-${recipe.id}` },
      update: {},
      create: {
        id: `menu-bev-${recipe.id}`, recipeId: recipe.id,
        name: recipe.name, price: recipe.sellingPrice,
        category: "BEVERAGE", available: true, sortOrder: 0,
      },
    });

    console.log(`  ✓ ${data.name}  $${data.sellingPrice}`);
  }

  console.log("\nCreating beverage recipes:");

  // ── COCKTAILS ──────────────────────────────────────────────────────────────
  await upsertBeverage({
    name: "Japanese Whisky Highball",
    description: "The definitive Japanese bar staple — chilled whisky over ice, topped with sparkling water. Clean, crisp, endlessly drinkable.",
    method: "1. Fill a highball glass with large ice cubes.\n2. Pour 45 mL Japanese whisky slowly over ice.\n3. Top with chilled soda water (ratio 1:3).\n4. Stir gently once with a bar spoon from the bottom.\n5. Garnish with a thin lemon twist.",
    prepTime: 3, sellingPrice: 16,
    dietaryTags: ["VEGAN", "GLUTEN_FREE", "DAIRY_FREE"],
    allergenNames: [],
    ings: [
      { name: "Japanese Whisky", qty: 45, unit: "ML" },
      { name: "Soda Water",      qty: 150, unit: "ML" },
    ],
  });

  await upsertBeverage({
    name: "Yuzu Margarita",
    description: "Classic margarita with yuzu replacing lime — bright Japanese citrus with silver tequila and Cointreau. Tajin salt rim optional.",
    method: "1. Rim glass with fine salt.\n2. Combine tequila, Cointreau, yuzu juice and simple syrup in shaker with ice.\n3. Shake vigorously for 12 seconds.\n4. Strain into chilled glass over fresh ice.\n5. Garnish with a dehydrated yuzu wheel.",
    prepTime: 4, sellingPrice: 18,
    dietaryTags: ["VEGAN", "GLUTEN_FREE", "DAIRY_FREE"],
    allergenNames: [],
    ings: [
      { name: "Tequila",          qty: 45,  unit: "ML" },
      { name: "Cointreau",        qty: 20,  unit: "ML" },
      { name: "Yuzu Juice",       qty: 25,  unit: "ML" },
      { name: "Simple Syrup",     qty: 15,  unit: "ML", isSyrup: true },
    ],
  });

  await upsertBeverage({
    name: "Tokyo Mule",
    description: "Japanese spin on the Moscow Mule — Japanese whisky, ginger beer and fresh lime in a copper mug. Zingy and refreshing.",
    method: "1. Fill a copper mug with crushed ice.\n2. Pour whisky and lime juice over ice.\n3. Top with ginger beer — pour over the back of a bar spoon to preserve fizz.\n4. Garnish with a lime wheel and sprig of fresh mint.",
    prepTime: 3, sellingPrice: 17,
    dietaryTags: ["VEGAN", "GLUTEN_FREE", "DAIRY_FREE"],
    allergenNames: [],
    ings: [
      { name: "Japanese Whisky", qty: 45,  unit: "ML" },
      { name: "Ginger Beer",     qty: 120, unit: "ML" },
      { name: "Lime Juice",      qty: 20,  unit: "ML" },
      { name: "Mint",            qty: 0.01, unit: "BUNCH" },
    ],
  });

  await upsertBeverage({
    name: "Miso Old Fashioned",
    description: "Bold Japanese whisky stirred with white miso honey and aromatic bitters. Umami meets classic cocktail craft.",
    method: "1. In a mixing glass, dissolve a small bar spoon of white miso into honey syrup.\n2. Add whisky and angostura bitters with ice.\n3. Stir 30 rotations until well-chilled.\n4. Strain over a single large ice cube in a rocks glass.\n5. Express an orange peel over the glass and drop in.",
    prepTime: 5, sellingPrice: 20,
    dietaryTags: ["DAIRY_FREE"],
    allergenNames: ["Soy"],
    ings: [
      { name: "Japanese Whisky",   qty: 60,   unit: "ML" },
      { name: "Miso Paste",        qty: 0.005, unit: "KG" },
      { name: "Honey Ginger Syrup",qty: 10,   unit: "ML", isSyrup: true },
      { name: "Angostura Bitters", qty: 5,    unit: "ML" },
    ],
  });

  await upsertBeverage({
    name: "Sakura Spritz",
    description: "Floral gin and sake aperitivo with lychee, rose water and a hint of yuzu. Light pink and effervescent.",
    method: "1. Add gin, sake, lychee syrup, rose water and yuzu juice to a shaker with ice.\n2. Shake briefly (8 seconds) to chill without over-diluting.\n3. Strain into a chilled wine glass with ice.\n4. Top with soda water.\n5. Garnish with a lychee and edible flower.",
    prepTime: 4, sellingPrice: 18,
    dietaryTags: ["VEGAN", "GLUTEN_FREE", "DAIRY_FREE"],
    allergenNames: [],
    ings: [
      { name: "Gin",          qty: 30,  unit: "ML" },
      { name: "Sake",         qty: 30,  unit: "ML" },
      { name: "Lychee Syrup", qty: 20,  unit: "ML" },
      { name: "Rose Water",   qty: 5,   unit: "ML" },
      { name: "Yuzu Juice",   qty: 15,  unit: "ML" },
      { name: "Soda Water",   qty: 60,  unit: "ML" },
    ],
  });

  await upsertBeverage({
    name: "Matcha Espresso Martini",
    description: "The classic espresso martini elevated with ceremonial matcha. Velvety, caffeinated, and a beautiful deep green.",
    method: "1. Pull a fresh 30mL espresso shot and allow to cool slightly.\n2. Combine vodka, Kahlua, espresso, matcha syrup and ice in shaker.\n3. Shake very hard for 15 seconds until frothy.\n4. Double-strain into chilled coupe glass.\n5. Garnish with three coffee beans and a dusting of matcha powder.",
    prepTime: 5, sellingPrice: 19,
    dietaryTags: ["VEGAN", "GLUTEN_FREE", "DAIRY_FREE"],
    allergenNames: [],
    ings: [
      { name: "Vodka",        qty: 40, unit: "ML" },
      { name: "Kahlua",       qty: 20, unit: "ML" },
      { name: "Espresso",     qty: 30, unit: "ML" },
      { name: "Matcha Syrup", qty: 15, unit: "ML", isSyrup: true },
    ],
  });

  await upsertBeverage({
    name: "Yuzu Sake Sour",
    description: "Silky sake sour with yuzu citrus and a Japanese whisky float. Egg white gives a beautiful foam crown.",
    method: "1. Dry shake (no ice): sake, yuzu juice, yuzu syrup, egg white — 10 seconds.\n2. Add ice and shake again hard for 12 seconds.\n3. Double-strain into a chilled coupe.\n4. Gently float 10mL of Japanese whisky on top.\n5. Garnish with a few drops of angostura on the foam.",
    prepTime: 5, sellingPrice: 19,
    dietaryTags: ["GLUTEN_FREE", "DAIRY_FREE"],
    allergenNames: ["Eggs"],
    ings: [
      { name: "Sake",              qty: 60,  unit: "ML" },
      { name: "Yuzu Juice",        qty: 25,  unit: "ML" },
      { name: "Yuzu Simple Syrup", qty: 15,  unit: "ML", isSyrup: true },
      { name: "Eggs",              qty: 0.5, unit: "PIECE" },
      { name: "Japanese Whisky",   qty: 10,  unit: "ML" },
    ],
  });

  // ── MOCKTAILS ──────────────────────────────────────────────────────────────
  await upsertBeverage({
    name: "Yuzu Lemonade",
    description: "House-made yuzu lemonade — fresh, tart and floral. A guaranteed crowd-pleaser, alcohol-free.",
    method: "1. Combine yuzu juice, lemon juice and yuzu syrup in a tall glass.\n2. Fill with ice cubes.\n3. Top with chilled soda water.\n4. Stir gently. Garnish with a lemon wheel and yuzu zest.",
    prepTime: 3, sellingPrice: 9,
    dietaryTags: ["VEGAN", "GLUTEN_FREE", "DAIRY_FREE"],
    allergenNames: [],
    ings: [
      { name: "Yuzu Juice",       qty: 30,  unit: "ML" },
      { name: "Lemon Juice",      qty: 20,  unit: "ML" },
      { name: "Yuzu Simple Syrup",qty: 20,  unit: "ML", isSyrup: true },
      { name: "Soda Water",       qty: 150, unit: "ML" },
    ],
  });

  await upsertBeverage({
    name: "Ginger Lychee Cooler",
    description: "Tropical lychee and fiery ginger beer mocktail. Refreshing with a spicy finish — pairs beautifully with sashimi.",
    method: "1. Muddle 2 fresh lychees in the base of a tall glass.\n2. Fill with crushed ice.\n3. Add lime juice and lychee syrup.\n4. Top with ginger beer — stir gently.\n5. Garnish with a lychee on a skewer and fresh mint.",
    prepTime: 3, sellingPrice: 10,
    dietaryTags: ["VEGAN", "GLUTEN_FREE", "DAIRY_FREE"],
    allergenNames: [],
    ings: [
      { name: "Lychee (canned)", qty: 0.05, unit: "KG" },
      { name: "Lychee Syrup",   qty: 20,   unit: "ML" },
      { name: "Lime Juice",     qty: 15,   unit: "ML" },
      { name: "Ginger Beer",    qty: 150,  unit: "ML" },
      { name: "Mint",           qty: 0.005, unit: "BUNCH" },
    ],
  });

  await upsertBeverage({
    name: "Butterfly Pea Lemonade",
    description: "Color-changing Japanese lemonade — deep indigo from butterfly pea tea turns violet-pink as lemon juice is added. A table showstopper.",
    method: "1. Brew butterfly pea flowers in hot water for 5 min. Cool completely.\n2. Pour tea over ice in a tall glass — it should be deep blue.\n3. At the table, pour lemon juice over the back of a spoon on top.\n4. Watch it turn violet-pink as guest stirs.\n5. Sweeten with simple syrup to taste.",
    prepTime: 8, sellingPrice: 11,
    dietaryTags: ["VEGAN", "GLUTEN_FREE", "DAIRY_FREE"],
    allergenNames: [],
    ings: [
      { name: "Butterfly Pea Tea", qty: 150, unit: "ML" },
      { name: "Lemon Juice",       qty: 30,  unit: "ML" },
      { name: "Simple Syrup",      qty: 15,  unit: "ML", isSyrup: true },
      { name: "Soda Water",        qty: 50,  unit: "ML" },
    ],
  });

  // ── HOT DRINKS ─────────────────────────────────────────────────────────────
  await upsertBeverage({
    name: "Ceremonial Matcha Latte",
    description: "Whisked ceremonial grade matcha with steamed oat milk and a touch of honey. Earthy, creamy, calming.",
    method: "1. Sift 2g ceremonial matcha into a warmed bowl.\n2. Add 30mL water at 70°C — never boiling.\n3. Whisk in W-motion until frothy with no lumps.\n4. Steam oat milk to 65°C, creating microfoam.\n5. Pour milk over matcha in a cup. Dust with matcha.",
    prepTime: 5, sellingPrice: 9,
    dietaryTags: ["VEGAN", "GLUTEN_FREE", "DAIRY_FREE"],
    allergenNames: [],
    ings: [
      { name: "Matcha Powder",     qty: 0.002, unit: "KG" },
      { name: "Oat Milk",          qty: 200,   unit: "ML" },
      { name: "Honey Ginger Syrup",qty: 10,    unit: "ML", isSyrup: true },
    ],
  });

  await upsertBeverage({
    name: "Hojicha Latte",
    description: "Roasted Japanese green tea with steamed milk. Lower caffeine, warm toasty notes — ideal after dinner.",
    method: "1. Dissolve 5g hojicha powder in 40mL hot water (90°C).\n2. Add honey ginger syrup and stir.\n3. Steam oat milk to 65°C.\n4. Pour steamed milk over hojicha base.\n5. Top with a light foam and a pinch of hojicha powder.",
    prepTime: 5, sellingPrice: 8,
    dietaryTags: ["VEGAN", "GLUTEN_FREE", "DAIRY_FREE"],
    allergenNames: [],
    ings: [
      { name: "Hojicha Powder",    qty: 0.005, unit: "KG" },
      { name: "Oat Milk",          qty: 200,   unit: "ML" },
      { name: "Honey Ginger Syrup",qty: 10,    unit: "ML", isSyrup: true },
    ],
  });

  console.log("\n✅  Done! Beverage seed complete:");
  console.log("   Syrups (prep) : Simple Syrup · Yuzu Syrup · Honey Ginger Syrup · Matcha Syrup");
  console.log("   Cocktails     : Whisky Highball · Yuzu Margarita · Tokyo Mule · Miso Old Fashioned");
  console.log("                   Sakura Spritz · Matcha Espresso Martini · Yuzu Sake Sour");
  console.log("   Mocktails     : Yuzu Lemonade · Ginger Lychee Cooler · Butterfly Pea Lemonade");
  console.log("   Hot drinks    : Ceremonial Matcha Latte · Hojicha Latte");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
