// @ts-nocheck
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: "postgresql://postgres:postgres@127.0.0.1:5432/rms_db" });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🥢  Seeding Prep Recipes (sauces & dressings)...\n");

  const chef = await prisma.user.findFirst({ where: { role: "CHEF" } });
  if (!chef) throw new Error("No CHEF user found — run main seed first.");

  // ── Allergens ──────────────────────────────────────────────────────────────
  const allergenNames = ["Gluten", "Dairy", "Eggs", "Fish", "Soy", "Sesame", "Mustard"];
  const allergenMap: Record<string, string> = {};
  for (const name of allergenNames) {
    const a = await prisma.allergen.upsert({ where: { name }, update: {}, create: { name } });
    allergenMap[name] = a.id;
  }

  // ── Raw Ingredients (components used in prep recipes) ─────────────────────
  const rawDefs = [
    // Already in japanese seed — upsert safely
    { name: "Soy Sauce",     category: "CONDIMENT", unit: "L",     costPerUnit: 4,    currentStock: 5,   parLevel: 6,  reorderPoint: 2 },
    { name: "Mirin",         category: "CONDIMENT", unit: "L",     costPerUnit: 6,    currentStock: 3,   parLevel: 4,  reorderPoint: 1 },
    { name: "Sake",          category: "ALCOHOL",   unit: "L",     costPerUnit: 15,   currentStock: 2,   parLevel: 3,  reorderPoint: 1 },
    { name: "Sugar",         category: "OTHER",     unit: "KG",    costPerUnit: 1.5,  currentStock: 5,   parLevel: 6,  reorderPoint: 2 },
    { name: "Yuzu Juice",    category: "CONDIMENT", unit: "L",     costPerUnit: 20,   currentStock: 1,   parLevel: 2,  reorderPoint: 0.5 },
    { name: "Sesame Oil",    category: "OIL",       unit: "L",     costPerUnit: 12,   currentStock: 2,   parLevel: 3,  reorderPoint: 1 },
    { name: "Miso Paste",    category: "CONDIMENT", unit: "KG",    costPerUnit: 8,    currentStock: 3,   parLevel: 4,  reorderPoint: 1 },
    { name: "Ginger",        category: "SPICE",     unit: "KG",    costPerUnit: 4,    currentStock: 2,   parLevel: 3,  reorderPoint: 1 },
    { name: "Garlic",        category: "VEGETABLE", unit: "KG",    costPerUnit: 4,    currentStock: 2,   parLevel: 3,  reorderPoint: 1 },
    { name: "Butter",        category: "DAIRY",     unit: "KG",    costPerUnit: 9,    currentStock: 3,   parLevel: 4,  reorderPoint: 1 },
    // New raw ingredients
    { name: "Tamari (GF Soy)",  category: "CONDIMENT", unit: "L",  costPerUnit: 6,    currentStock: 2,   parLevel: 3,  reorderPoint: 1 },
    { name: "Rice Vinegar",     category: "CONDIMENT", unit: "L",  costPerUnit: 4,    currentStock: 2,   parLevel: 3,  reorderPoint: 1 },
    { name: "Sriracha",         category: "CONDIMENT", unit: "L",  costPerUnit: 5,    currentStock: 1,   parLevel: 2,  reorderPoint: 0.5 },
    { name: "Kewpie Mayo",      category: "CONDIMENT", unit: "KG", costPerUnit: 8,    currentStock: 2,   parLevel: 3,  reorderPoint: 1 },
    { name: "Black Garlic",     category: "VEGETABLE", unit: "KG", costPerUnit: 18,   currentStock: 0.5, parLevel: 1,  reorderPoint: 0.2 },
    { name: "Lemongrass",       category: "SPICE",     unit: "KG", costPerUnit: 6,    currentStock: 0.5, parLevel: 1,  reorderPoint: 0.3 },
    { name: "Coconut Milk",     category: "OTHER",     unit: "L",  costPerUnit: 3.5,  currentStock: 4,   parLevel: 6,  reorderPoint: 2 },
    { name: "Lime Juice",       category: "CONDIMENT", unit: "L",  costPerUnit: 8,    currentStock: 1,   parLevel: 2,  reorderPoint: 0.5 },
    { name: "Fish Sauce",       category: "CONDIMENT", unit: "L",  costPerUnit: 5,    currentStock: 1,   parLevel: 2,  reorderPoint: 0.5 },
    { name: "Shichimi Togarashi", category: "SPICE",   unit: "KG", costPerUnit: 20,   currentStock: 0.2, parLevel: 0.5, reorderPoint: 0.1 },
    { name: "Dashi Stock",      category: "CONDIMENT", unit: "L",  costPerUnit: 3,    currentStock: 3,   parLevel: 5,  reorderPoint: 1 },
    { name: "Light Soy Sauce",  category: "CONDIMENT", unit: "L",  costPerUnit: 4,    currentStock: 2,   parLevel: 3,  reorderPoint: 1 },
    { name: "Toasted Sesame Seeds", category: "SPICE", unit: "KG", costPerUnit: 14,   currentStock: 0.5, parLevel: 1,  reorderPoint: 0.2 },
    { name: "Honey",            category: "OTHER",     unit: "KG", costPerUnit: 10,   currentStock: 1,   parLevel: 2,  reorderPoint: 0.5 },
    { name: "Chilli Flakes",    category: "SPICE",     unit: "KG", costPerUnit: 12,   currentStock: 0.3, parLevel: 0.5, reorderPoint: 0.1 },
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

  // ── Stock Ingredients (the prep outputs that live in stock) ────────────────
  // These are the ingredients that recipes reference as "Teriyaki Sauce (portion)"
  const stockDefs = [
    { name: "Teriyaki Sauce",      unit: "L",  costPerUnit: 0, parLevel: 3,  reorderPoint: 1   },
    { name: "GF Teriyaki Sauce",   unit: "L",  costPerUnit: 0, parLevel: 2,  reorderPoint: 0.5 },
    { name: "Ponzu Sauce",         unit: "L",  costPerUnit: 0, parLevel: 2,  reorderPoint: 0.5 },
    { name: "GF Ponzu Sauce",      unit: "L",  costPerUnit: 0, parLevel: 2,  reorderPoint: 0.5 },
    { name: "Yuzu Dressing",       unit: "L",  costPerUnit: 0, parLevel: 1,  reorderPoint: 0.3 },
    { name: "Spicy Miso Tare",     unit: "L",  costPerUnit: 0, parLevel: 2,  reorderPoint: 0.5 },
    { name: "Spicy Mayo",          unit: "KG", costPerUnit: 0, parLevel: 2,  reorderPoint: 0.5 },
    { name: "Black Garlic Butter", unit: "KG", costPerUnit: 0, parLevel: 1,  reorderPoint: 0.3 },
    { name: "Thai Coconut Sauce",  unit: "L",  costPerUnit: 0, parLevel: 2,  reorderPoint: 0.5 },
    { name: "Shichimi Tare",       unit: "L",  costPerUnit: 0, parLevel: 1,  reorderPoint: 0.3 },
  ];

  const stock: Record<string, string> = {};
  for (const def of stockDefs) {
    const i = await prisma.ingredient.upsert({
      where: { name: def.name },
      update: {},
      create: {
        name: def.name,
        category: "CONDIMENT",
        unit: def.unit as never,
        costPerUnit: def.costPerUnit,
        currentStock: 0,
        parLevel: def.parLevel,
        reorderPoint: def.reorderPoint,
        reorderQty: def.parLevel * 2,
      },
    });
    stock[def.name] = i.id;
  }
  console.log(`✓ ${stockDefs.length} prep stock ingredients (upserted)`);

  // ── Helper: create prep recipe + link to stock ingredient ──────────────────
  async function upsertPrepRecipe(data: {
    name: string;
    description: string;
    method: string;
    prepTime: number;
    cookTime: number;
    servings: number;
    dietaryTags: string[];
    allergenNames: string[];
    ingredients: { name: string; quantity: number; unit: string }[];
    linksTo: string;      // stock ingredient name
    batchYield: number;   // how many units the recipe produces
  }) {
    const existing = await prisma.recipe.findFirst({ where: { name: data.name } });
    if (existing) {
      console.log(`  · skipped (exists): ${data.name}`);
      return existing;
    }

    const recipe = await prisma.recipe.create({
      data: {
        name: data.name,
        category: "SAUCE",
        description: data.description,
        method: data.method,
        prepTime: data.prepTime,
        cookTime: data.cookTime,
        servings: data.servings,
        sellingPrice: 0,
        dietaryTags: data.dietaryTags,
        createdById: chef.id,
        ingredients: {
          create: data.ingredients.map((i) => ({
            ingredientId: raw[i.name] ?? stock[i.name],
            quantity: i.quantity,
            unit: i.unit as never,
          })),
        },
        allergens: {
          create: data.allergenNames.map((n) => ({ allergenId: allergenMap[n] })),
        },
      },
    });

    // Link the recipe to the stock ingredient it produces
    await prisma.ingredient.update({
      where: { id: stock[data.linksTo] },
      data: {
        prepRecipeId: recipe.id,
        batchYield: data.batchYield,
      },
    });

    console.log(`  ✓ ${data.name}  →  ${data.linksTo} (${data.batchYield}L/batch)`);
    return recipe;
  }

  console.log("\nCreating prep recipes:");

  // ── 1. Teriyaki Sauce ──────────────────────────────────────────────────────
  await upsertPrepRecipe({
    name: "Teriyaki Sauce",
    description: "Classic Japanese teriyaki glaze — sweet, savoury and glossy. Used for donburi, grilled proteins.",
    method:
      "1. Combine soy sauce, mirin, sake and sugar in a small saucepan.\n" +
      "2. Bring to a simmer over medium heat, stirring until sugar dissolves.\n" +
      "3. Reduce by one-third (~10 min) until sauce coats the back of a spoon.\n" +
      "4. Cool completely. Store in sealed container; refrigerate up to 2 weeks.",
    prepTime: 5, cookTime: 15, servings: 10,
    dietaryTags: ["DAIRY_FREE"],
    allergenNames: ["Soy"],
    ingredients: [
      { name: "Soy Sauce",  quantity: 200, unit: "ML" },
      { name: "Mirin",      quantity: 150, unit: "ML" },
      { name: "Sake",       quantity: 100, unit: "ML" },
      { name: "Sugar",      quantity: 0.05, unit: "KG" },
    ],
    linksTo: "Teriyaki Sauce",
    batchYield: 0.4,
  });

  // ── 2. GF Teriyaki Sauce ───────────────────────────────────────────────────
  await upsertPrepRecipe({
    name: "GF Teriyaki Sauce",
    description: "Gluten-free teriyaki using tamari. Same flavour profile, safe for coeliac guests.",
    method:
      "1. Combine tamari, mirin, sake and sugar in a saucepan.\n" +
      "2. Simmer on medium, stirring until sugar dissolves.\n" +
      "3. Reduce one-third until glossy and slightly thick.\n" +
      "4. Cool. Label clearly GF. Store refrigerated up to 2 weeks.",
    prepTime: 5, cookTime: 15, servings: 10,
    dietaryTags: ["DAIRY_FREE", "GLUTEN_FREE"],
    allergenNames: ["Soy"],
    ingredients: [
      { name: "Tamari (GF Soy)", quantity: 200, unit: "ML" },
      { name: "Mirin",           quantity: 150, unit: "ML" },
      { name: "Sake",            quantity: 100, unit: "ML" },
      { name: "Sugar",           quantity: 0.05, unit: "KG" },
    ],
    linksTo: "GF Teriyaki Sauce",
    batchYield: 0.4,
  });

  // ── 3. Ponzu Sauce ─────────────────────────────────────────────────────────
  await upsertPrepRecipe({
    name: "Ponzu Sauce",
    description: "Bright citrus-soy dipping sauce. Classic pairing with tataki, gyoza and cold tofu.",
    method:
      "1. Combine soy sauce, mirin, sake and rice vinegar in a bowl.\n" +
      "2. Add yuzu juice and whisk to combine.\n" +
      "3. Taste and adjust acidity with more yuzu if needed.\n" +
      "4. Store chilled. Use within 3 weeks; shake before service.",
    prepTime: 10, cookTime: 0, servings: 8,
    dietaryTags: ["VEGAN", "DAIRY_FREE"],
    allergenNames: ["Soy"],
    ingredients: [
      { name: "Soy Sauce",    quantity: 200, unit: "ML" },
      { name: "Yuzu Juice",   quantity: 80,  unit: "ML" },
      { name: "Mirin",        quantity: 60,  unit: "ML" },
      { name: "Sake",         quantity: 40,  unit: "ML" },
      { name: "Rice Vinegar", quantity: 30,  unit: "ML" },
    ],
    linksTo: "Ponzu Sauce",
    batchYield: 0.4,
  });

  // ── 4. GF Ponzu Sauce ──────────────────────────────────────────────────────
  await upsertPrepRecipe({
    name: "GF Ponzu Sauce",
    description: "Gluten-free ponzu using tamari — identical citrus punch, coeliac safe.",
    method:
      "1. Whisk tamari, yuzu juice, mirin, sake and rice vinegar together.\n" +
      "2. Taste: balance acidity and salt with yuzu / tamari.\n" +
      "3. Label clearly GF. Store chilled up to 3 weeks.",
    prepTime: 10, cookTime: 0, servings: 8,
    dietaryTags: ["VEGAN", "DAIRY_FREE", "GLUTEN_FREE"],
    allergenNames: ["Soy"],
    ingredients: [
      { name: "Tamari (GF Soy)", quantity: 200, unit: "ML" },
      { name: "Yuzu Juice",      quantity: 80,  unit: "ML" },
      { name: "Mirin",           quantity: 60,  unit: "ML" },
      { name: "Sake",            quantity: 40,  unit: "ML" },
      { name: "Rice Vinegar",    quantity: 30,  unit: "ML" },
    ],
    linksTo: "GF Ponzu Sauce",
    batchYield: 0.4,
  });

  // ── 5. Yuzu Dressing ───────────────────────────────────────────────────────
  await upsertPrepRecipe({
    name: "Yuzu Dressing",
    description: "Light, fragrant Japanese citrus vinaigrette. Used on salads, carpaccio and cold noodles.",
    method:
      "1. Whisk together yuzu juice, rice vinegar, light soy and sugar until sugar dissolves.\n" +
      "2. Slowly stream in sesame oil while whisking to emulsify.\n" +
      "3. Add finely grated ginger. Season to taste.\n" +
      "4. Store chilled in squeeze bottle. Shake well before use. Good 1 week.",
    prepTime: 10, cookTime: 0, servings: 8,
    dietaryTags: ["VEGAN", "DAIRY_FREE", "GLUTEN_FREE"],
    allergenNames: ["Soy", "Sesame"],
    ingredients: [
      { name: "Yuzu Juice",      quantity: 100, unit: "ML" },
      { name: "Rice Vinegar",    quantity: 40,  unit: "ML" },
      { name: "Light Soy Sauce", quantity: 60,  unit: "ML" },
      { name: "Sesame Oil",      quantity: 30,  unit: "ML" },
      { name: "Sugar",           quantity: 0.02, unit: "KG" },
      { name: "Ginger",          quantity: 0.01, unit: "KG" },
    ],
    linksTo: "Yuzu Dressing",
    batchYield: 0.25,
  });

  // ── 6. Spicy Miso Tare ─────────────────────────────────────────────────────
  await upsertPrepRecipe({
    name: "Spicy Miso Tare",
    description: "Umami-rich spicy ramen base paste. 1–2 tbsp per bowl. Also great as a marinade.",
    method:
      "1. Toast sesame seeds in a dry pan; set aside.\n" +
      "2. Combine miso, mirin, sake, sesame oil and chilli flakes in a small saucepan.\n" +
      "3. Warm on low heat, stirring until smooth — do NOT boil.\n" +
      "4. Stir in toasted sesame seeds. Cool and store chilled up to 3 weeks.",
    prepTime: 10, cookTime: 10, servings: 20,
    dietaryTags: ["VEGAN", "DAIRY_FREE"],
    allergenNames: ["Soy", "Sesame"],
    ingredients: [
      { name: "Miso Paste",          quantity: 0.2,  unit: "KG" },
      { name: "Mirin",               quantity: 80,   unit: "ML" },
      { name: "Sake",                quantity: 60,   unit: "ML" },
      { name: "Sesame Oil",          quantity: 40,   unit: "ML" },
      { name: "Chilli Flakes",       quantity: 0.01, unit: "KG" },
      { name: "Toasted Sesame Seeds",quantity: 0.02, unit: "KG" },
    ],
    linksTo: "Spicy Miso Tare",
    batchYield: 0.35,
  });

  // ── 7. Spicy Mayo ──────────────────────────────────────────────────────────
  await upsertPrepRecipe({
    name: "Spicy Mayo",
    description: "Japanese-style sriracha mayo. Essential for sushi rolls, crispy rice and burger buns.",
    method:
      "1. Combine kewpie mayo and sriracha in a bowl.\n" +
      "2. Mix with a whisk until completely smooth and uniform in colour.\n" +
      "3. Taste and adjust heat with more sriracha.\n" +
      "4. Transfer to squeeze bottle. Refrigerate up to 2 weeks.",
    prepTime: 5, cookTime: 0, servings: 20,
    dietaryTags: ["GLUTEN_FREE"],
    allergenNames: ["Eggs"],
    ingredients: [
      { name: "Kewpie Mayo", quantity: 0.5, unit: "KG" },
      { name: "Sriracha",    quantity: 80,  unit: "ML" },
    ],
    linksTo: "Spicy Mayo",
    batchYield: 0.55,
  });

  // ── 8. Black Garlic Butter ─────────────────────────────────────────────────
  await upsertPrepRecipe({
    name: "Black Garlic Butter",
    description: "Compound butter with deep umami from fermented black garlic and soy. Finishes steaks and seafood.",
    method:
      "1. Allow butter to soften at room temperature (30 min).\n" +
      "2. Mash black garlic cloves into a smooth paste.\n" +
      "3. Beat butter until fluffy; fold in black garlic paste and soy sauce.\n" +
      "4. Roll in cling film into a log; freeze. Slice discs to order.",
    prepTime: 40, cookTime: 0, servings: 20,
    dietaryTags: ["GLUTEN_FREE"],
    allergenNames: ["Dairy", "Soy"],
    ingredients: [
      { name: "Butter",      quantity: 0.5,  unit: "KG" },
      { name: "Black Garlic",quantity: 0.05, unit: "KG" },
      { name: "Soy Sauce",   quantity: 20,   unit: "ML" },
    ],
    linksTo: "Black Garlic Butter",
    batchYield: 0.55,
  });

  // ── 9. Thai Coconut Sauce ──────────────────────────────────────────────────
  await upsertPrepRecipe({
    name: "Thai Coconut Sauce",
    description: "Fragrant lemongrass-coconut curry base. Used for noodle soups and braised proteins.",
    method:
      "1. Sauté minced lemongrass and ginger in a small pot until fragrant, ~3 min.\n" +
      "2. Add coconut milk, fish sauce, lime juice and sugar.\n" +
      "3. Simmer 15 min on low heat to marry flavours.\n" +
      "4. Strain and cool. Refrigerate up to 5 days.",
    prepTime: 10, cookTime: 20, servings: 8,
    dietaryTags: ["GLUTEN_FREE", "DAIRY_FREE"],
    allergenNames: ["Fish"],
    ingredients: [
      { name: "Coconut Milk",  quantity: 400, unit: "ML" },
      { name: "Lemongrass",    quantity: 0.04, unit: "KG" },
      { name: "Ginger",        quantity: 0.02, unit: "KG" },
      { name: "Fish Sauce",    quantity: 30,  unit: "ML" },
      { name: "Lime Juice",    quantity: 40,  unit: "ML" },
      { name: "Sugar",         quantity: 0.02, unit: "KG" },
    ],
    linksTo: "Thai Coconut Sauce",
    batchYield: 0.45,
  });

  // ── 10. Shichimi Tare ──────────────────────────────────────────────────────
  await upsertPrepRecipe({
    name: "Shichimi Tare",
    description: "Seven-spice infused soy tare for grilled skewers and ramen seasoning.",
    method:
      "1. Combine dashi, soy sauce and mirin in a small saucepan.\n" +
      "2. Bring to a gentle simmer; stir in shichimi togarashi and honey.\n" +
      "3. Simmer 5 min until slightly thickened.\n" +
      "4. Strain into a squeeze bottle. Chill. Use within 10 days.",
    prepTime: 5, cookTime: 10, servings: 10,
    dietaryTags: ["DAIRY_FREE"],
    allergenNames: ["Soy", "Sesame"],
    ingredients: [
      { name: "Dashi Stock",          quantity: 200, unit: "ML" },
      { name: "Soy Sauce",            quantity: 100, unit: "ML" },
      { name: "Mirin",                quantity: 60,  unit: "ML" },
      { name: "Honey",                quantity: 0.03, unit: "KG" },
      { name: "Shichimi Togarashi",   quantity: 0.01, unit: "KG" },
    ],
    linksTo: "Shichimi Tare",
    batchYield: 0.35,
  });

  console.log("\n✅  Done! 10 prep recipes seeded:");
  console.log("   Regular  : Teriyaki Sauce · Ponzu Sauce · Yuzu Dressing");
  console.log("   GF       : GF Teriyaki Sauce · GF Ponzu Sauce");
  console.log("   Specialty: Spicy Miso Tare · Spicy Mayo · Black Garlic Butter");
  console.log("   Asian    : Thai Coconut Sauce · Shichimi Tare");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
