// @ts-nocheck
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/rms_db";
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // Allergens
  const allergens = await Promise.all(
    ["Gluten", "Dairy", "Eggs", "Nuts", "Peanuts", "Shellfish", "Fish", "Soy", "Sesame", "Celery"].map(
      (name) => prisma.allergen.upsert({ where: { name }, update: {}, create: { name } })
    )
  );
  console.log(`✓ ${allergens.length} allergens`);

  // Admin user
  const admin = await prisma.user.upsert({
    where: { email: "admin@rms.com" },
    update: {},
    create: {
      email: "admin@rms.com",
      name: "Admin User",
      password: await bcrypt.hash("admin123", 12),
      role: "ADMIN",
    },
  });

  // Chef user
  const chef = await prisma.user.upsert({
    where: { email: "chef@rms.com" },
    update: {},
    create: {
      email: "chef@rms.com",
      name: "Head Chef",
      password: await bcrypt.hash("chef123", 12),
      role: "CHEF",
    },
  });
  console.log("✓ 2 users (admin@rms.com / admin123, chef@rms.com / chef123)");

  // Ingredients
  const ingredients = await Promise.all([
    prisma.ingredient.upsert({ where: { name: "Chicken Breast" }, update: {}, create: { name: "Chicken Breast", category: "MEAT", unit: "KG", costPerUnit: 8.5, currentStock: 10, parLevel: 15, reorderPoint: 5 } }),
    prisma.ingredient.upsert({ where: { name: "Spaghetti" }, update: {}, create: { name: "Spaghetti", category: "GRAIN", unit: "KG", costPerUnit: 2.0, currentStock: 8, parLevel: 10, reorderPoint: 3 } }),
    prisma.ingredient.upsert({ where: { name: "Eggs" }, update: {}, create: { name: "Eggs", category: "DAIRY", unit: "PIECE", costPerUnit: 0.4, currentStock: 60, parLevel: 80, reorderPoint: 20 } }),
    prisma.ingredient.upsert({ where: { name: "Parmesan Cheese" }, update: {}, create: { name: "Parmesan Cheese", category: "DAIRY", unit: "KG", costPerUnit: 18.0, currentStock: 2, parLevel: 3, reorderPoint: 1 } }),
    prisma.ingredient.upsert({ where: { name: "Pancetta" }, update: {}, create: { name: "Pancetta", category: "MEAT", unit: "KG", costPerUnit: 14.0, currentStock: 1.5, parLevel: 2, reorderPoint: 0.5 } }),
    prisma.ingredient.upsert({ where: { name: "Olive Oil" }, update: {}, create: { name: "Olive Oil", category: "OIL", unit: "L", costPerUnit: 6.0, currentStock: 5, parLevel: 6, reorderPoint: 2 } }),
    prisma.ingredient.upsert({ where: { name: "Garlic" }, update: {}, create: { name: "Garlic", category: "VEGETABLE", unit: "KG", costPerUnit: 4.0, currentStock: 2, parLevel: 3, reorderPoint: 1 } }),
    prisma.ingredient.upsert({ where: { name: "Cherry Tomatoes" }, update: {}, create: { name: "Cherry Tomatoes", category: "VEGETABLE", unit: "KG", costPerUnit: 3.5, currentStock: 5, parLevel: 6, reorderPoint: 2 } }),
    prisma.ingredient.upsert({ where: { name: "Fresh Basil" }, update: {}, create: { name: "Fresh Basil", category: "VEGETABLE", unit: "BUNCH", costPerUnit: 1.5, currentStock: 10, parLevel: 15, reorderPoint: 5 } }),
    prisma.ingredient.upsert({ where: { name: "Mozzarella" }, update: {}, create: { name: "Mozzarella", category: "DAIRY", unit: "KG", costPerUnit: 10.0, currentStock: 3, parLevel: 4, reorderPoint: 1 } }),
  ]);
  console.log(`✓ ${ingredients.length} ingredients`);

  // Sample recipe — Spaghetti Carbonara
  const gluten = allergens.find((a) => a.name === "Gluten")!;
  const dairy = allergens.find((a) => a.name === "Dairy")!;
  const eggs = allergens.find((a) => a.name === "Eggs")!;

  const spaghetti = ingredients.find((i) => i.name === "Spaghetti")!;
  const pancetta = ingredients.find((i) => i.name === "Pancetta")!;
  const egg = ingredients.find((i) => i.name === "Eggs")!;
  const parmesan = ingredients.find((i) => i.name === "Parmesan Cheese")!;

  const existing = await prisma.recipe.findFirst({ where: { name: "Spaghetti Carbonara" } });
  if (!existing) {
    await prisma.recipe.create({
      data: {
        name: "Spaghetti Carbonara",
        category: "MAIN",
        description: "Classic Roman pasta with eggs, cheese, pancetta and black pepper.",
        method: "1. Cook pasta al dente.\n2. Fry pancetta until crispy.\n3. Mix eggs and parmesan.\n4. Combine pasta with pancetta off heat, add egg mixture, toss quickly.",
        prepTime: 10,
        cookTime: 20,
        servings: 2,
        sellingPrice: 18.0,
        createdById: chef.id,
        ingredients: {
          create: [
            { ingredientId: spaghetti.id, quantity: 0.2, unit: "KG" },
            { ingredientId: pancetta.id, quantity: 0.1, unit: "KG" },
            { ingredientId: egg.id, quantity: 3, unit: "PIECE" },
            { ingredientId: parmesan.id, quantity: 0.05, unit: "KG" },
          ],
        },
        allergens: {
          create: [
            { allergenId: gluten.id },
            { allergenId: dairy.id },
            { allergenId: eggs.id },
          ],
        },
      },
    });
    console.log("✓ 1 sample recipe");
  }

  console.log("\nSeed complete. Login credentials:");
  console.log("  Admin  → admin@rms.com / admin123");
  console.log("  Chef   → chef@rms.com  / chef123");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
