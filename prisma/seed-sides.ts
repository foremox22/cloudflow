// @ts-nocheck
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: "postgresql://postgres:postgres@127.0.0.1:5432/rms_db" });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🥗  Seeding Side Dishes...\n");

  const chef = await prisma.user.findFirst({ where: { role: "CHEF" } });
  if (!chef) throw new Error("No CHEF user — run main seed first.");

  // ── Allergens ──────────────────────────────────────────────────────────────
  const allergenNames = ["Gluten", "Dairy", "Eggs", "Soy", "Sesame", "Shellfish"];
  const aMap: Record<string, string> = {};
  for (const name of allergenNames) {
    const a = await prisma.allergen.upsert({ where: { name }, update: {}, create: { name } });
    aMap[name] = a.id;
  }

  // ── Raw ingredients ────────────────────────────────────────────────────────
  const rawDefs = [
    // Seaweed / Dried
    { name: "Wakame (dried)",       category: "VEGETABLE", unit: "KG",    costPerUnit: 30,   currentStock: 1,    parLevel: 2,    reorderPoint: 0.5  },
    { name: "Nori Sheets",          category: "OTHER",     unit: "PIECE", costPerUnit: 0.5,  currentStock: 100,  parLevel: 150,  reorderPoint: 40   },
    { name: "Kombu",                category: "OTHER",     unit: "KG",    costPerUnit: 25,   currentStock: 0.5,  parLevel: 1,    reorderPoint: 0.2  },
    // Tofu / Soy
    { name: "Silken Tofu",          category: "OTHER",     unit: "KG",    costPerUnit: 5,    currentStock: 4,    parLevel: 6,    reorderPoint: 2    },
    { name: "Edamame (frozen)",     category: "VEGETABLE", unit: "KG",    costPerUnit: 6,    currentStock: 5,    parLevel: 8,    reorderPoint: 2    },
    // Vegetables
    { name: "Daikon Radish",        category: "VEGETABLE", unit: "KG",    costPerUnit: 3,    currentStock: 4,    parLevel: 6,    reorderPoint: 2    },
    { name: "Cucumber",             category: "VEGETABLE", unit: "KG",    costPerUnit: 3,    currentStock: 3,    parLevel: 5,    reorderPoint: 1    },
    { name: "Carrot",               category: "VEGETABLE", unit: "KG",    costPerUnit: 2,    currentStock: 4,    parLevel: 6,    reorderPoint: 2    },
    { name: "Napa Cabbage",         category: "VEGETABLE", unit: "KG",    costPerUnit: 2.5,  currentStock: 4,    parLevel: 6,    reorderPoint: 2    },
    { name: "Eggplant",             category: "VEGETABLE", unit: "KG",    costPerUnit: 4,    currentStock: 3,    parLevel: 5,    reorderPoint: 1    },
    { name: "Baby Spinach",         category: "VEGETABLE", unit: "KG",    costPerUnit: 8,    currentStock: 2,    parLevel: 3,    reorderPoint: 1    },
    { name: "Spring Onion",         category: "VEGETABLE", unit: "BUNCH", costPerUnit: 1.5,  currentStock: 20,   parLevel: 30,   reorderPoint: 8    },
    // Pickles / Fermented
    { name: "Pickled Ginger",       category: "CONDIMENT", unit: "KG",    costPerUnit: 12,   currentStock: 1,    parLevel: 2,    reorderPoint: 0.5  },
    { name: "Rice Vinegar",         category: "CONDIMENT", unit: "L",     costPerUnit: 5,    currentStock: 2,    parLevel: 3,    reorderPoint: 1    },
    // Starch / Grain
    { name: "Japanese Rice",        category: "OTHER",     unit: "KG",    costPerUnit: 4,    currentStock: 20,   parLevel: 30,   reorderPoint: 8    },
    { name: "Potato Starch",        category: "OTHER",     unit: "KG",    costPerUnit: 4,    currentStock: 2,    parLevel: 3,    reorderPoint: 1    },
    // Seasoning
    { name: "White Sesame Seeds",   category: "SPICE",     unit: "KG",    costPerUnit: 12,   currentStock: 1,    parLevel: 2,    reorderPoint: 0.5  },
    { name: "Sesame Oil",           category: "CONDIMENT", unit: "L",     costPerUnit: 10,   currentStock: 2,    parLevel: 3,    reorderPoint: 1    },
    { name: "Dashi Stock",          category: "OTHER",     unit: "L",     costPerUnit: 3,    currentStock: 5,    parLevel: 8,    reorderPoint: 2    },
    { name: "Bonito Flakes",        category: "OTHER",     unit: "KG",    costPerUnit: 50,   currentStock: 0.5,  parLevel: 1,    reorderPoint: 0.2  },
    { name: "Togarashi",            category: "SPICE",     unit: "KG",    costPerUnit: 20,   currentStock: 0.3,  parLevel: 0.5,  reorderPoint: 0.1  },
    { name: "Ichimi",               category: "SPICE",     unit: "KG",    costPerUnit: 18,   currentStock: 0.3,  parLevel: 0.5,  reorderPoint: 0.1  },
    // Frying
    { name: "Tempura Batter Mix",   category: "OTHER",     unit: "KG",    costPerUnit: 7,    currentStock: 3,    parLevel: 5,    reorderPoint: 1    },
    { name: "Vegetable Oil",        category: "OTHER",     unit: "L",     costPerUnit: 3,    currentStock: 10,   parLevel: 15,   reorderPoint: 4    },
    { name: "Sweet Potato",         category: "VEGETABLE", unit: "KG",    costPerUnit: 3.5,  currentStock: 3,    parLevel: 5,    reorderPoint: 1    },
    { name: "Shiitake Mushroom",    category: "VEGETABLE", unit: "KG",    costPerUnit: 15,   currentStock: 2,    parLevel: 3,    reorderPoint: 1    },
    { name: "Zucchini",             category: "VEGETABLE", unit: "KG",    costPerUnit: 4,    currentStock: 2,    parLevel: 3,    reorderPoint: 1    },
    // Already in other seeds — upsert safely
    { name: "Soy Sauce",            category: "CONDIMENT", unit: "L",     costPerUnit: 5,    currentStock: 5,    parLevel: 8,    reorderPoint: 2    },
    { name: "Miso Paste",           category: "CONDIMENT", unit: "KG",    costPerUnit: 8,    currentStock: 3,    parLevel: 4,    reorderPoint: 1    },
    { name: "Mirin",                category: "CONDIMENT", unit: "L",     costPerUnit: 6,    currentStock: 3,    parLevel: 4,    reorderPoint: 1    },
    { name: "Sugar",                category: "OTHER",     unit: "KG",    costPerUnit: 1.5,  currentStock: 5,    parLevel: 6,    reorderPoint: 2    },
    { name: "Salt",                 category: "SPICE",     unit: "KG",    costPerUnit: 1,    currentStock: 5,    parLevel: 6,    reorderPoint: 2    },
    { name: "Garlic",               category: "VEGETABLE", unit: "KG",    costPerUnit: 6,    currentStock: 3,    parLevel: 4,    reorderPoint: 1    },
    { name: "Ginger",               category: "SPICE",     unit: "KG",    costPerUnit: 4,    currentStock: 2,    parLevel: 3,    reorderPoint: 1    },
    { name: "Tofu",                 category: "OTHER",     unit: "KG",    costPerUnit: 4,    currentStock: 4,    parLevel: 6,    reorderPoint: 2    },
    { name: "Dashi Powder",         category: "SPICE",     unit: "KG",    costPerUnit: 30,   currentStock: 0.5,  parLevel: 1,    reorderPoint: 0.2  },
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

  // ── Helper: upsert a SIDE menu recipe + MenuItem ───────────────────────────
  async function upsertSide(data: {
    name: string;
    description: string;
    method: string;
    prepTime: number;
    cookTime: number;
    servings: number;
    sellingPrice: number;
    dietaryTags: string[];
    allergens: string[];
    ings: { name: string; qty: number; unit: string }[];
  }) {
    const existing = await prisma.recipe.findFirst({ where: { name: data.name } });
    if (existing) { console.log(`  · skipped: ${data.name}`); return; }

    const recipe = await prisma.recipe.create({
      data: {
        name: data.name,
        category: "SIDE",
        description: data.description,
        method: data.method,
        prepTime: data.prepTime,
        cookTime: data.cookTime,
        servings: data.servings,
        sellingPrice: data.sellingPrice,
        dietaryTags: data.dietaryTags,
        createdById: chef.id,
        allergens: { create: data.allergens.map((n) => ({ allergenId: aMap[n] })) },
        ingredients: {
          create: data.ings.map((i) => ({
            ingredientId: raw[i.name],
            quantity: i.qty,
            unit: i.unit as never,
          })),
        },
      },
    });

    await prisma.menuItem.upsert({
      where: { id: `menu-side-${recipe.id}` },
      update: {},
      create: {
        id: `menu-side-${recipe.id}`,
        recipeId: recipe.id,
        name: data.name,
        price: data.sellingPrice,
        category: "SIDE",
        available: true,
        sortOrder: 0,
      },
    });
    console.log(`  ✓ ${data.name}  ($${data.sellingPrice})`);
  }

  // ══════════════════════════════════════════════════════════════════════════
  console.log("\nCreating side dish recipes:");

  await upsertSide({
    name: "Wakame Salad",
    description: "Chilled wakame seaweed tossed in sesame dressing with spring onion.",
    method: "1. Soak dried wakame in cold water 10 min, drain and squeeze dry.\n2. Slice spring onion thinly on the bias.\n3. Whisk soy sauce, rice vinegar, sesame oil, sugar and ginger into dressing.\n4. Toss wakame with dressing. Garnish with sesame seeds and spring onion.\n5. Serve chilled.",
    prepTime: 15, cookTime: 0, servings: 4, sellingPrice: 8,
    dietaryTags: ["VEGAN", "GLUTEN_FREE"],
    allergens: ["Soy", "Sesame"],
    ings: [
      { name: "Wakame (dried)",     qty: 0.04,  unit: "KG"    },
      { name: "Spring Onion",       qty: 0.5,   unit: "BUNCH" },
      { name: "Soy Sauce",          qty: 30,    unit: "ML"    },
      { name: "Rice Vinegar",       qty: 20,    unit: "ML"    },
      { name: "Sesame Oil",         qty: 10,    unit: "ML"    },
      { name: "Sugar",              qty: 0.005, unit: "KG"    },
      { name: "Ginger",             qty: 0.005, unit: "KG"    },
      { name: "White Sesame Seeds", qty: 0.005, unit: "KG"    },
    ],
  });

  await upsertSide({
    name: "Japanese Pickle Trio (Tsukemono)",
    description: "Three house-made quick pickles: daikon, cucumber, and napa cabbage.",
    method: "1. Daikon: julienne, massage with salt, rinse, dress with rice vinegar + sugar.\n2. Cucumber: slice thin, salt, press 5 min, dress with rice vinegar + sesame oil.\n3. Napa Cabbage: tear, salt, press 10 min, dress with rice vinegar + mirin + ginger.\n4. Plate all three in separate mounds. Garnish with sesame seeds.",
    prepTime: 30, cookTime: 0, servings: 4, sellingPrice: 9,
    dietaryTags: ["VEGAN", "GLUTEN_FREE"],
    allergens: ["Sesame"],
    ings: [
      { name: "Daikon Radish",      qty: 0.1,   unit: "KG"    },
      { name: "Cucumber",           qty: 0.1,   unit: "KG"    },
      { name: "Napa Cabbage",       qty: 0.1,   unit: "KG"    },
      { name: "Rice Vinegar",       qty: 60,    unit: "ML"    },
      { name: "Mirin",              qty: 20,    unit: "ML"    },
      { name: "Sugar",              qty: 0.01,  unit: "KG"    },
      { name: "Salt",               qty: 0.005, unit: "KG"    },
      { name: "Ginger",             qty: 0.005, unit: "KG"    },
      { name: "Sesame Oil",         qty: 10,    unit: "ML"    },
      { name: "White Sesame Seeds", qty: 0.005, unit: "KG"    },
    ],
  });

  await upsertSide({
    name: "Edamame",
    description: "Steamed salted edamame pods — the classic Japanese bar snack.",
    method: "1. Boil salted water in large pot.\n2. Add frozen edamame and cook 4–5 min until tender.\n3. Drain well. Toss with sea salt while hot.\n4. Serve immediately in a bowl with an empty pod bowl alongside.",
    prepTime: 2, cookTime: 6, servings: 2, sellingPrice: 6,
    dietaryTags: ["VEGAN", "GLUTEN_FREE"],
    allergens: ["Soy"],
    ings: [
      { name: "Edamame (frozen)", qty: 0.2,  unit: "KG" },
      { name: "Salt",             qty: 0.005, unit: "KG" },
    ],
  });

  await upsertSide({
    name: "Garlic Edamame",
    description: "Wok-tossed edamame with garlic, chilli, and sesame oil — addictive.",
    method: "1. Steam edamame until just cooked, drain.\n2. Heat sesame oil in wok on high, add minced garlic and cook 30 sec.\n3. Add edamame and toss vigorously 2 min.\n4. Finish with soy sauce and togarashi. Serve hot.",
    prepTime: 5, cookTime: 8, servings: 2, sellingPrice: 9,
    dietaryTags: ["VEGAN"],
    allergens: ["Soy", "Sesame"],
    ings: [
      { name: "Edamame (frozen)", qty: 0.2,   unit: "KG"  },
      { name: "Garlic",           qty: 0.01,  unit: "KG"  },
      { name: "Sesame Oil",       qty: 15,    unit: "ML"  },
      { name: "Soy Sauce",        qty: 15,    unit: "ML"  },
      { name: "Togarashi",        qty: 0.002, unit: "KG"  },
      { name: "Salt",             qty: 0.003, unit: "KG"  },
    ],
  });

  await upsertSide({
    name: "Agedashi Tofu",
    description: "Crispy fried silken tofu in light dashi broth with grated daikon.",
    method: "1. Cut silken tofu into cubes, pat dry on paper towels 10 min.\n2. Dust lightly in potato starch.\n3. Deep-fry at 180°C until golden and crispy, 3–4 min.\n4. Warm dashi with soy sauce and mirin for tsuyu broth.\n5. Place tofu in bowl, pour broth around, top with grated daikon, bonito flakes, spring onion.",
    prepTime: 15, cookTime: 10, servings: 2, sellingPrice: 12,
    dietaryTags: [],
    allergens: ["Soy"],
    ings: [
      { name: "Silken Tofu",      qty: 0.3,  unit: "KG"  },
      { name: "Potato Starch",    qty: 0.03, unit: "KG"  },
      { name: "Vegetable Oil",    qty: 0.3,  unit: "L"   },
      { name: "Dashi Stock",      qty: 0.15, unit: "L"   },
      { name: "Soy Sauce",        qty: 30,   unit: "ML"  },
      { name: "Mirin",            qty: 20,   unit: "ML"  },
      { name: "Daikon Radish",    qty: 0.05, unit: "KG"  },
      { name: "Bonito Flakes",    qty: 0.005, unit: "KG" },
      { name: "Spring Onion",     qty: 0.25, unit: "BUNCH" },
    ],
  });

  await upsertSide({
    name: "Miso Soup",
    description: "Classic dashi-based miso with silken tofu, wakame and spring onion.",
    method: "1. Heat dashi stock — do not boil.\n2. Dissolve miso paste in a small ladle of warm dashi.\n3. Add wakame and tofu cubes to pot and warm gently 2 min.\n4. Remove from heat, stir in miso mixture.\n5. Ladle into bowl and finish with sliced spring onion.",
    prepTime: 5, cookTime: 8, servings: 1, sellingPrice: 5,
    dietaryTags: ["VEGAN"],
    allergens: ["Soy"],
    ings: [
      { name: "Dashi Stock",      qty: 0.25,  unit: "L"  },
      { name: "Miso Paste",       qty: 0.02,  unit: "KG" },
      { name: "Silken Tofu",      qty: 0.05,  unit: "KG" },
      { name: "Wakame (dried)",   qty: 0.003, unit: "KG" },
      { name: "Spring Onion",     qty: 0.25,  unit: "BUNCH" },
    ],
  });

  await upsertSide({
    name: "Hiyayakko (Chilled Tofu)",
    description: "Cold silken tofu with grated ginger, bonito flakes and soy sauce.",
    method: "1. Chill tofu block in fridge until very cold.\n2. Cut into 4 portions directly in serving bowl.\n3. Top with freshly grated ginger, bonito flakes, and chopped spring onion.\n4. Drizzle soy sauce at the table.",
    prepTime: 5, cookTime: 0, servings: 2, sellingPrice: 8,
    dietaryTags: [],
    allergens: ["Soy"],
    ings: [
      { name: "Silken Tofu",      qty: 0.3,   unit: "KG"    },
      { name: "Ginger",           qty: 0.01,  unit: "KG"    },
      { name: "Bonito Flakes",    qty: 0.005, unit: "KG"    },
      { name: "Spring Onion",     qty: 0.5,   unit: "BUNCH" },
      { name: "Soy Sauce",        qty: 20,    unit: "ML"    },
    ],
  });

  await upsertSide({
    name: "Sunomono (Cucumber Salad)",
    description: "Thin-sliced cucumber in sweet rice vinegar dressing with sesame.",
    method: "1. Slice cucumber very thin (mandolin ideal).\n2. Sprinkle with salt, toss, let sit 5 min, then squeeze out excess water.\n3. Whisk rice vinegar, sugar, and mirin for sanbaizu dressing.\n4. Toss cucumber in dressing. Rest 5 min.\n5. Plate and garnish with sesame seeds and thinly sliced pickled ginger.",
    prepTime: 15, cookTime: 0, servings: 2, sellingPrice: 7,
    dietaryTags: ["VEGAN", "GLUTEN_FREE"],
    allergens: ["Sesame"],
    ings: [
      { name: "Cucumber",           qty: 0.2,   unit: "KG"  },
      { name: "Rice Vinegar",       qty: 40,    unit: "ML"  },
      { name: "Sugar",              qty: 0.01,  unit: "KG"  },
      { name: "Mirin",              qty: 20,    unit: "ML"  },
      { name: "Salt",               qty: 0.005, unit: "KG"  },
      { name: "Pickled Ginger",     qty: 0.01,  unit: "KG"  },
      { name: "White Sesame Seeds", qty: 0.005, unit: "KG"  },
    ],
  });

  await upsertSide({
    name: "Steamed Japanese Rice",
    description: "Short-grain Japanese rice, steamed to fluffy perfection.",
    method: "1. Rinse rice under cold water until water runs clear (5–6 rinses).\n2. Soak 30 min in cold water, drain.\n3. Cook with 1.1× water by volume in rice cooker or heavy pot.\n4. Rest covered 10 min after cooking.\n5. Fluff gently with a rice paddle and serve.",
    prepTime: 35, cookTime: 15, servings: 4, sellingPrice: 4,
    dietaryTags: ["VEGAN", "GLUTEN_FREE"],
    allergens: [],
    ings: [
      { name: "Japanese Rice", qty: 0.2, unit: "KG" },
    ],
  });

  await upsertSide({
    name: "Tempura Vegetables",
    description: "Seasonal vegetables in light crispy tempura batter, served with tentsuyu dipping sauce.",
    method: "1. Prepare tentsuyu: combine dashi, soy sauce, mirin; heat then cool.\n2. Slice sweet potato 5mm, halve mushrooms, cut zucchini into batons.\n3. Mix tempura batter with ice-cold water — leave lumpy for crispiness.\n4. Dip vegetables in batter and fry at 180°C until pale gold, 2–3 min per batch.\n5. Drain on rack. Serve immediately with tentsuyu and grated daikon.",
    prepTime: 15, cookTime: 15, servings: 2, sellingPrice: 14,
    dietaryTags: ["VEGAN"],
    allergens: ["Gluten", "Soy"],
    ings: [
      { name: "Tempura Batter Mix", qty: 0.1,  unit: "KG" },
      { name: "Sweet Potato",       qty: 0.1,  unit: "KG" },
      { name: "Shiitake Mushroom",  qty: 0.08, unit: "KG" },
      { name: "Zucchini",           qty: 0.1,  unit: "KG" },
      { name: "Eggplant",           qty: 0.08, unit: "KG" },
      { name: "Vegetable Oil",      qty: 0.5,  unit: "L"  },
      { name: "Dashi Stock",        qty: 0.1,  unit: "L"  },
      { name: "Soy Sauce",          qty: 30,   unit: "ML" },
      { name: "Mirin",              qty: 20,   unit: "ML" },
      { name: "Daikon Radish",      qty: 0.05, unit: "KG" },
    ],
  });

  await upsertSide({
    name: "Spinach Goma-ae",
    description: "Blanched baby spinach with sweet sesame sauce — a classic izakaya salad.",
    method: "1. Blanch spinach in boiling salted water 30 sec. Shock in ice water, drain.\n2. Squeeze firmly to remove all water. Cut into 5cm lengths.\n3. Toast sesame seeds in dry pan until golden. Grind most in mortar.\n4. Mix ground sesame with soy sauce, mirin and sugar into goma-ae sauce.\n5. Toss spinach in sauce, plate, and garnish with whole sesame seeds.",
    prepTime: 10, cookTime: 5, servings: 2, sellingPrice: 9,
    dietaryTags: ["VEGAN", "GLUTEN_FREE"],
    allergens: ["Soy", "Sesame"],
    ings: [
      { name: "Baby Spinach",       qty: 0.15,  unit: "KG" },
      { name: "White Sesame Seeds", qty: 0.02,  unit: "KG" },
      { name: "Soy Sauce",          qty: 20,    unit: "ML" },
      { name: "Mirin",              qty: 15,    unit: "ML" },
      { name: "Sugar",              qty: 0.005, unit: "KG" },
    ],
  });

  console.log("\n✅  Side dish seeding complete.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
