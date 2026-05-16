// @ts-nocheck
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const connectionString =
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/rms_db";

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const RESTAURANT_ID = "clrestaurant00000000000001";

const ingredientDefs = [
  { name: "Avocado", category: "FRUIT", unit: "KG", costPerUnit: 6, currentStock: 8, parLevel: 12, reorderPoint: 3 },
  { name: "House Made Flatbread", category: "GRAIN", unit: "PIECE", costPerUnit: 1.2, currentStock: 40, parLevel: 60, reorderPoint: 15 },
  { name: "Dill Whipped Cream", category: "DAIRY", unit: "KG", costPerUnit: 9, currentStock: 2, parLevel: 3, reorderPoint: 1 },
  { name: "Pickled Red Onion", category: "VEGETABLE", unit: "KG", costPerUnit: 4, currentStock: 3, parLevel: 5, reorderPoint: 1 },
  { name: "Poached Eggs", category: "DAIRY", unit: "PIECE", costPerUnit: 0.55, currentStock: 80, parLevel: 120, reorderPoint: 30 },
  { name: "Poached Chicken", category: "MEAT", unit: "KG", costPerUnit: 12, currentStock: 6, parLevel: 10, reorderPoint: 3 },
  { name: "Smoked Salmon", category: "SEAFOOD", unit: "KG", costPerUnit: 32, currentStock: 3, parLevel: 5, reorderPoint: 1 },
  { name: "Brioche", category: "GRAIN", unit: "SLICE", costPerUnit: 1.4, currentStock: 40, parLevel: 60, reorderPoint: 15 },
  { name: "Red Fruits Coulis", category: "FRUIT", unit: "KG", costPerUnit: 8, currentStock: 3, parLevel: 5, reorderPoint: 1 },
  { name: "Vanilla Bean Whipped Cream", category: "DAIRY", unit: "KG", costPerUnit: 10, currentStock: 3, parLevel: 4, reorderPoint: 1 },
  { name: "Seasonal Berries", category: "FRUIT", unit: "KG", costPerUnit: 14, currentStock: 4, parLevel: 6, reorderPoint: 2 },
  { name: "Heirloom Tomato", category: "VEGETABLE", unit: "KG", costPerUnit: 7, currentStock: 5, parLevel: 8, reorderPoint: 2 },
  { name: "Whipped Ricotta", category: "DAIRY", unit: "KG", costPerUnit: 12, currentStock: 2, parLevel: 3, reorderPoint: 1 },
  { name: "Basil Oil", category: "OIL", unit: "L", costPerUnit: 18, currentStock: 1, parLevel: 2, reorderPoint: 0.5 },
  { name: "Saddles Sourdough", category: "GRAIN", unit: "SLICE", costPerUnit: 1.1, currentStock: 60, parLevel: 90, reorderPoint: 20 },
  { name: "Garden Herbs", category: "VEGETABLE", unit: "BUNCH", costPerUnit: 2.5, currentStock: 12, parLevel: 18, reorderPoint: 5 },
  { name: "Wood-Smoked Bacon", category: "MEAT", unit: "KG", costPerUnit: 18, currentStock: 5, parLevel: 8, reorderPoint: 2 },
  { name: "Fried Egg", category: "DAIRY", unit: "PIECE", costPerUnit: 0.55, currentStock: 80, parLevel: 120, reorderPoint: 30 },
  { name: "Bush Tomato Relish", category: "CONDIMENT", unit: "KG", costPerUnit: 10, currentStock: 2, parLevel: 3, reorderPoint: 1 },
  { name: "Swiss Cheese", category: "DAIRY", unit: "KG", costPerUnit: 14, currentStock: 3, parLevel: 4, reorderPoint: 1 },
  { name: "Truffle Aioli", category: "CONDIMENT", unit: "KG", costPerUnit: 12, currentStock: 2, parLevel: 3, reorderPoint: 1 },
  { name: "Free Range Eggs", category: "DAIRY", unit: "PIECE", costPerUnit: 0.65, currentStock: 100, parLevel: 140, reorderPoint: 40 },
  { name: "Artisanal Chorizo", category: "MEAT", unit: "KG", costPerUnit: 20, currentStock: 4, parLevel: 6, reorderPoint: 2 },
  { name: "Forest Mushrooms", category: "VEGETABLE", unit: "KG", costPerUnit: 16, currentStock: 4, parLevel: 6, reorderPoint: 2 },
  { name: "Vine Tomato", category: "VEGETABLE", unit: "KG", costPerUnit: 6, currentStock: 6, parLevel: 10, reorderPoint: 3 },
  { name: "White Sourdough", category: "GRAIN", unit: "SLICE", costPerUnit: 1, currentStock: 60, parLevel: 90, reorderPoint: 20 },
  { name: "Pork Belly", category: "MEAT", unit: "KG", costPerUnit: 14, currentStock: 8, parLevel: 12, reorderPoint: 3 },
  { name: "Cauliflower Puree", category: "VEGETABLE", unit: "KG", costPerUnit: 5, currentStock: 4, parLevel: 6, reorderPoint: 2 },
  { name: "Pork Jus", category: "OTHER", unit: "L", costPerUnit: 8, currentStock: 3, parLevel: 5, reorderPoint: 1 },
  { name: "Free Range Chicken Breast", category: "MEAT", unit: "KG", costPerUnit: 13, currentStock: 8, parLevel: 12, reorderPoint: 3 },
  { name: "Celeriac Puree", category: "VEGETABLE", unit: "KG", costPerUnit: 7, currentStock: 3, parLevel: 5, reorderPoint: 1 },
  { name: "Cavolo Nero", category: "VEGETABLE", unit: "KG", costPerUnit: 8, currentStock: 3, parLevel: 5, reorderPoint: 1 },
  { name: "Tarragon Jus", category: "OTHER", unit: "L", costPerUnit: 9, currentStock: 2, parLevel: 4, reorderPoint: 1 },
  { name: "Atlantic Salmon", category: "SEAFOOD", unit: "KG", costPerUnit: 30, currentStock: 6, parLevel: 9, reorderPoint: 2 },
  { name: "Local Asparagus", category: "VEGETABLE", unit: "KG", costPerUnit: 12, currentStock: 4, parLevel: 6, reorderPoint: 2 },
  { name: "Citrus Hollandaise", category: "CONDIMENT", unit: "KG", costPerUnit: 11, currentStock: 2, parLevel: 3, reorderPoint: 1 },
  { name: "Finger Lime Pearls", category: "FRUIT", unit: "KG", costPerUnit: 90, currentStock: 0.5, parLevel: 1, reorderPoint: 0.2 },
  { name: "Wagyu Beef Patty", category: "MEAT", unit: "KG", costPerUnit: 28, currentStock: 5, parLevel: 8, reorderPoint: 2 },
  { name: "Gruyere Cheese", category: "DAIRY", unit: "KG", costPerUnit: 22, currentStock: 3, parLevel: 4, reorderPoint: 1 },
  { name: "Caramelized Onions", category: "VEGETABLE", unit: "KG", costPerUnit: 5, currentStock: 3, parLevel: 5, reorderPoint: 1 },
  { name: "Native Plum BBQ Sauce", category: "CONDIMENT", unit: "KG", costPerUnit: 12, currentStock: 2, parLevel: 3, reorderPoint: 1 },
  { name: "Brioche Bun", category: "GRAIN", unit: "PIECE", costPerUnit: 1.2, currentStock: 40, parLevel: 60, reorderPoint: 15 },
  { name: "Skin-On Fries", category: "VEGETABLE", unit: "KG", costPerUnit: 4, currentStock: 15, parLevel: 22, reorderPoint: 6 },
  { name: "Potato Gnocchi", category: "GRAIN", unit: "KG", costPerUnit: 7, currentStock: 5, parLevel: 8, reorderPoint: 2 },
  { name: "Butternut Pumpkin", category: "VEGETABLE", unit: "KG", costPerUnit: 4, currentStock: 6, parLevel: 9, reorderPoint: 2 },
  { name: "Sage Burnt Butter", category: "DAIRY", unit: "KG", costPerUnit: 12, currentStock: 2, parLevel: 3, reorderPoint: 1 },
  { name: "Pine Nuts", category: "OTHER", unit: "KG", costPerUnit: 38, currentStock: 1, parLevel: 2, reorderPoint: 0.5 },
  { name: "Goat Curd", category: "DAIRY", unit: "KG", costPerUnit: 18, currentStock: 2, parLevel: 3, reorderPoint: 1 },
  { name: "Mesclun Greens", category: "VEGETABLE", unit: "KG", costPerUnit: 10, currentStock: 4, parLevel: 6, reorderPoint: 2 },
  { name: "Cucumber", category: "VEGETABLE", unit: "KG", costPerUnit: 3, currentStock: 5, parLevel: 8, reorderPoint: 2 },
  { name: "Shallots", category: "VEGETABLE", unit: "KG", costPerUnit: 6, currentStock: 3, parLevel: 5, reorderPoint: 1 },
  { name: "Green Goddess Dressing", category: "CONDIMENT", unit: "L", costPerUnit: 9, currentStock: 2, parLevel: 4, reorderPoint: 1 },
  { name: "Furikake", category: "SPICE", unit: "KG", costPerUnit: 24, currentStock: 1, parLevel: 2, reorderPoint: 0.5 },
  { name: "Truffle Mayo", category: "CONDIMENT", unit: "KG", costPerUnit: 11, currentStock: 2, parLevel: 3, reorderPoint: 1 },
  { name: "Baby Beets", category: "VEGETABLE", unit: "KG", costPerUnit: 7, currentStock: 4, parLevel: 6, reorderPoint: 2 },
  { name: "Eschalot", category: "VEGETABLE", unit: "KG", costPerUnit: 8, currentStock: 2, parLevel: 3, reorderPoint: 1 },
  { name: "Horseradish Dressing", category: "CONDIMENT", unit: "L", costPerUnit: 8, currentStock: 2, parLevel: 3, reorderPoint: 1 },
  { name: "Vanilla Bean Panna Cotta", category: "DAIRY", unit: "PORTION", costPerUnit: 4, currentStock: 12, parLevel: 18, reorderPoint: 5 },
  { name: "Poached Rhubarb", category: "FRUIT", unit: "KG", costPerUnit: 8, currentStock: 2, parLevel: 3, reorderPoint: 1 },
  { name: "Butter Crumble", category: "GRAIN", unit: "KG", costPerUnit: 8, currentStock: 2, parLevel: 3, reorderPoint: 1 },
  { name: "Seasonal Fruit", category: "FRUIT", unit: "KG", costPerUnit: 10, currentStock: 4, parLevel: 6, reorderPoint: 2 },
  { name: "Matcha Mousse", category: "DAIRY", unit: "PORTION", costPerUnit: 4.5, currentStock: 12, parLevel: 18, reorderPoint: 5 },
  { name: "Dark Chocolate Crumble", category: "GRAIN", unit: "KG", costPerUnit: 12, currentStock: 2, parLevel: 3, reorderPoint: 1 },
  { name: "Strawberries", category: "FRUIT", unit: "KG", costPerUnit: 12, currentStock: 4, parLevel: 6, reorderPoint: 2 },
];

const recipes = [
  {
    slug: "avocado-smash",
    name: "Avocado Smash",
    category: "STARTER",
    subcategory: "Breakfast",
    price: 23,
    description: "Avocado, house made flatbread, dill whipped cream, pickled red onion and poached eggs.",
    method: "Toast flatbread. Smash avocado with seasoning. Plate with dill whipped cream, pickled red onion and poached eggs.",
    prepTime: 10,
    cookTime: 6,
    servings: 1,
    dietaryTags: ["V", "GFO"],
    allergens: ["Gluten", "Dairy", "Eggs"],
    ingredients: [
      ["Avocado", 0.18, "KG"],
      ["House Made Flatbread", 1, "PIECE"],
      ["Dill Whipped Cream", 0.05, "KG"],
      ["Pickled Red Onion", 0.03, "KG"],
      ["Poached Eggs", 2, "PIECE"],
    ],
  },
  {
    slug: "french-toast-red-fruits",
    name: "French Toast & Red Fruits",
    category: "STARTER",
    subcategory: "Breakfast",
    price: 24,
    description: "Soft brioche slice, red fruits coulis, vanilla bean whipped cream and fresh seasonal berries.",
    method: "Soak brioche in custard, pan-fry until golden, then finish with coulis, whipped cream and berries.",
    prepTime: 10,
    cookTime: 8,
    servings: 1,
    dietaryTags: [],
    allergens: ["Gluten", "Dairy", "Eggs"],
    ingredients: [
      ["Brioche", 2, "SLICE"],
      ["Red Fruits Coulis", 0.06, "KG"],
      ["Vanilla Bean Whipped Cream", 0.05, "KG"],
      ["Seasonal Berries", 0.08, "KG"],
      ["Free Range Eggs", 1, "PIECE"],
    ],
  },
  {
    slug: "breakfast-tomato-bruschetta",
    name: "Breakfast Tomato Bruschetta",
    category: "STARTER",
    subcategory: "Breakfast",
    price: 26,
    description: "Avocado, confit heirloom tomato, whipped ricotta, basil oil, Saddles sourdough and garden herbs.",
    method: "Toast sourdough, layer avocado and confit tomato, pipe whipped ricotta, then finish with basil oil and herbs.",
    prepTime: 12,
    cookTime: 5,
    servings: 1,
    dietaryTags: ["V", "GFO"],
    allergens: ["Gluten", "Dairy"],
    ingredients: [
      ["Saddles Sourdough", 2, "SLICE"],
      ["Avocado", 0.12, "KG"],
      ["Heirloom Tomato", 0.12, "KG"],
      ["Whipped Ricotta", 0.06, "KG"],
      ["Basil Oil", 10, "ML"],
      ["Garden Herbs", 0.1, "BUNCH"],
    ],
  },
  {
    slug: "bacon-egg-brioche-roll",
    name: "Bacon & Egg Brioche Roll",
    category: "STARTER",
    subcategory: "Breakfast",
    price: 22,
    description: "Double wood-smoked bacon, double fried egg, native bush tomato relish, swiss cheese and truffle aioli.",
    method: "Toast brioche bun. Fry bacon and eggs. Build with relish, swiss cheese and truffle aioli.",
    prepTime: 8,
    cookTime: 8,
    servings: 1,
    dietaryTags: [],
    allergens: ["Gluten", "Dairy", "Eggs"],
    ingredients: [
      ["Brioche Bun", 1, "PIECE"],
      ["Wood-Smoked Bacon", 0.12, "KG"],
      ["Fried Egg", 2, "PIECE"],
      ["Bush Tomato Relish", 0.04, "KG"],
      ["Swiss Cheese", 0.04, "KG"],
      ["Truffle Aioli", 0.03, "KG"],
    ],
  },
  {
    slug: "column-breakfast",
    name: "Column Breakfast",
    category: "MAIN",
    subcategory: "Breakfast",
    price: 32,
    description: "Free range eggs cooked your way, crispy bacon, chorizo, roasted forest mushrooms, grilled vine tomato and toasted white sourdough.",
    method: "Cook eggs to order. Grill bacon, chorizo, mushrooms and tomato. Serve with toasted sourdough.",
    prepTime: 10,
    cookTime: 15,
    servings: 1,
    dietaryTags: ["GFO"],
    allergens: ["Gluten", "Eggs"],
    ingredients: [
      ["Free Range Eggs", 2, "PIECE"],
      ["Wood-Smoked Bacon", 0.1, "KG"],
      ["Artisanal Chorizo", 0.08, "KG"],
      ["Forest Mushrooms", 0.08, "KG"],
      ["Vine Tomato", 0.12, "KG"],
      ["White Sourdough", 2, "SLICE"],
    ],
  },
  {
    slug: "pork-belly",
    name: "Pork Belly",
    category: "MAIN",
    subcategory: "Lunch",
    price: 34,
    description: "Thick-cut sous-vide pork belly with a crackling finish, silky cauliflower puree and jus.",
    method: "Sous-vide pork belly until tender. Crisp skin to order, warm puree and serve with jus.",
    prepTime: 15,
    cookTime: 30,
    servings: 1,
    dietaryTags: [],
    allergens: [],
    ingredients: [
      ["Pork Belly", 0.22, "KG"],
      ["Cauliflower Puree", 0.14, "KG"],
      ["Pork Jus", 60, "ML"],
    ],
  },
  {
    slug: "pan-seared-chicken-breast",
    name: "Pan Seared Free Range Chicken Breast",
    category: "MAIN",
    subcategory: "Lunch",
    price: 32,
    description: "Crispy-skinned tender chicken breast with celeriac puree, wilted cavolo nero and tarragon jus.",
    method: "Pan-sear chicken skin-side down until crisp, finish in oven, then plate with puree, greens and jus.",
    prepTime: 12,
    cookTime: 18,
    servings: 1,
    dietaryTags: [],
    allergens: ["Dairy"],
    ingredients: [
      ["Free Range Chicken Breast", 0.22, "KG"],
      ["Celeriac Puree", 0.14, "KG"],
      ["Cavolo Nero", 0.08, "KG"],
      ["Tarragon Jus", 60, "ML"],
    ],
  },
  {
    slug: "crispy-skin-atlantic-salmon",
    name: "Crispy Skin Atlantic Salmon",
    category: "MAIN",
    subcategory: "Lunch",
    price: 36,
    description: "Seared salmon fillet on buttered local asparagus with citrus hollandaise and native finger lime pearls.",
    method: "Season and sear salmon skin-side down until crisp. Serve on asparagus with hollandaise and finger lime.",
    prepTime: 12,
    cookTime: 12,
    servings: 1,
    dietaryTags: [],
    allergens: ["Fish", "Dairy", "Eggs"],
    ingredients: [
      ["Atlantic Salmon", 0.2, "KG"],
      ["Local Asparagus", 0.12, "KG"],
      ["Citrus Hollandaise", 0.06, "KG"],
      ["Finger Lime Pearls", 0.01, "KG"],
    ],
  },
  {
    slug: "wagyu-beef-burger",
    name: "Wagyu Beef Burger",
    category: "MAIN",
    subcategory: "Lunch",
    price: 28,
    description: "Wagyu beef patty, Gruyere, caramelized onions, native plum BBQ sauce, truffle aioli and skin-on fries.",
    method: "Grill wagyu patty, melt Gruyere, build burger with onions, BBQ sauce and aioli. Serve with fries.",
    prepTime: 12,
    cookTime: 12,
    servings: 1,
    dietaryTags: [],
    allergens: ["Gluten", "Dairy", "Eggs"],
    ingredients: [
      ["Wagyu Beef Patty", 0.18, "KG"],
      ["Gruyere Cheese", 0.04, "KG"],
      ["Caramelized Onions", 0.04, "KG"],
      ["Native Plum BBQ Sauce", 0.035, "KG"],
      ["Truffle Aioli", 0.03, "KG"],
      ["Brioche Bun", 1, "PIECE"],
      ["Skin-On Fries", 0.18, "KG"],
    ],
  },
  {
    slug: "house-potato-gnocchi",
    name: "House Potato Gnocchi",
    category: "MAIN",
    subcategory: "Lunch",
    price: 30,
    description: "Hand-rolled potato gnocchi, roasted butternut pumpkin, sage burnt butter, pine nuts and goat curd.",
    method: "Warm gnocchi in sage burnt butter. Add roasted pumpkin, finish with pine nuts and goat curd.",
    prepTime: 15,
    cookTime: 12,
    servings: 1,
    dietaryTags: ["V"],
    allergens: ["Gluten", "Dairy", "Nuts"],
    ingredients: [
      ["Potato Gnocchi", 0.22, "KG"],
      ["Butternut Pumpkin", 0.12, "KG"],
      ["Sage Burnt Butter", 0.05, "KG"],
      ["Pine Nuts", 0.015, "KG"],
      ["Goat Curd", 0.04, "KG"],
    ],
  },
  {
    slug: "green-goddess-salad",
    name: "Green Goddess Salad",
    category: "MAIN",
    subcategory: "Lunch",
    price: 28,
    description: "Mesclun greens, cucumber, shallots, avocado and house-blended green goddess dressing.",
    method: "Wash greens, slice vegetables and toss with green goddess dressing just before service.",
    prepTime: 10,
    cookTime: 0,
    servings: 1,
    dietaryTags: ["VE", "GF"],
    allergens: [],
    ingredients: [
      ["Mesclun Greens", 0.08, "KG"],
      ["Cucumber", 0.08, "KG"],
      ["Shallots", 0.02, "KG"],
      ["Avocado", 0.1, "KG"],
      ["Green Goddess Dressing", 50, "ML"],
    ],
  },
  {
    slug: "skin-on-fries",
    name: "Skin-On Fries",
    category: "SIDE",
    subcategory: "Sides",
    price: 14,
    description: "Skin-on fries seasoned with Japanese furikake and served with truffle mayo.",
    method: "Fry potatoes until crisp. Toss with furikake and salt, then serve with truffle mayo.",
    prepTime: 5,
    cookTime: 8,
    servings: 1,
    dietaryTags: [],
    allergens: ["Eggs", "Sesame", "Fish"],
    ingredients: [
      ["Skin-On Fries", 0.22, "KG"],
      ["Furikake", 0.006, "KG"],
      ["Truffle Mayo", 0.05, "KG"],
    ],
  },
  {
    slug: "beetroot-goat-curd-salad",
    name: "Beetroot & Goat Curd Salad",
    category: "SIDE",
    subcategory: "Sides",
    price: 14,
    description: "Roasted baby beets, Meredith's goat curd, eschalot and horseradish dressing with garden herbs.",
    method: "Roast beets until tender. Dress with horseradish dressing, then plate with goat curd, eschalot and herbs.",
    prepTime: 12,
    cookTime: 30,
    servings: 1,
    dietaryTags: ["V", "GF"],
    allergens: ["Dairy"],
    ingredients: [
      ["Baby Beets", 0.18, "KG"],
      ["Goat Curd", 0.05, "KG"],
      ["Eschalot", 0.02, "KG"],
      ["Horseradish Dressing", 40, "ML"],
      ["Garden Herbs", 0.1, "BUNCH"],
    ],
  },
  {
    slug: "vanilla-panna-cotta",
    name: "Vanilla Panna Cotta",
    category: "DESSERT",
    subcategory: "Dessert",
    price: 16,
    description: "Vanilla bean panna cotta, poached rhubarb, butter crumble and fresh seasonal fruit.",
    method: "Set panna cotta in moulds. Unmould to order and finish with rhubarb, crumble and fruit.",
    prepTime: 20,
    cookTime: 10,
    servings: 1,
    dietaryTags: [],
    allergens: ["Dairy", "Gluten"],
    ingredients: [
      ["Vanilla Bean Panna Cotta", 1, "PORTION"],
      ["Poached Rhubarb", 0.05, "KG"],
      ["Butter Crumble", 0.03, "KG"],
      ["Seasonal Fruit", 0.06, "KG"],
    ],
  },
  {
    slug: "green-tea-mousse",
    name: "Green Tea Mousse",
    category: "DESSERT",
    subcategory: "Dessert",
    price: 16,
    description: "Light matcha green tea mousse, dark chocolate crumble and fresh sliced strawberries.",
    method: "Pipe matcha mousse into bowl. Garnish with dark chocolate crumble and sliced strawberries.",
    prepTime: 15,
    cookTime: 0,
    servings: 1,
    dietaryTags: [],
    allergens: ["Dairy", "Gluten"],
    ingredients: [
      ["Matcha Mousse", 1, "PORTION"],
      ["Dark Chocolate Crumble", 0.03, "KG"],
      ["Strawberries", 0.06, "KG"],
    ],
  },
  {
    slug: "poached-chicken-add-on",
    name: "Poached Chicken Add-On",
    category: "SIDE",
    subcategory: "Add-On",
    price: 8,
    description: "Poached chicken add-on for breakfast and salad dishes.",
    method: "Portion chilled poached chicken and add to requested dish at service.",
    prepTime: 2,
    cookTime: 0,
    servings: 1,
    dietaryTags: ["GF"],
    allergens: [],
    ingredients: [["Poached Chicken", 0.08, "KG"]],
  },
  {
    slug: "smoked-salmon-add-on",
    name: "Smoked Salmon Add-On",
    category: "SIDE",
    subcategory: "Add-On",
    price: 10,
    description: "Smoked salmon add-on for breakfast and salad dishes.",
    method: "Portion smoked salmon and add to requested dish at service.",
    prepTime: 2,
    cookTime: 0,
    servings: 1,
    dietaryTags: ["GF"],
    allergens: ["Fish"],
    ingredients: [["Smoked Salmon", 0.07, "KG"]],
  },
];

async function ensureUser(email: string, name: string, role: string, password: string) {
  return prisma.user.upsert({
    where: { email },
    update: { name, role },
    create: {
      email,
      name,
      role,
      password: await bcrypt.hash(password, 12),
    },
  });
}

async function ensureIngredient(restaurantId: string, def: (typeof ingredientDefs)[number]) {
  const existing = await prisma.ingredient.findFirst({
    where: { restaurantId, name: def.name },
  });

  if (existing) {
    return prisma.ingredient.update({
      where: { id: existing.id },
      data: def,
    });
  }

  return prisma.ingredient.create({
    data: { ...def, restaurantId },
  });
}

async function main() {
  console.log("Seeding Column menu from Column_Menu_v2.pdf...");

  const restaurant = await prisma.restaurant.upsert({
    where: { id: RESTAURANT_ID },
    update: {
      name: "Column",
      type: "CAFE",
      address: "25 Summer Street, Orange NSW 2800",
      timezone: "Australia/Sydney",
      active: true,
    },
    create: {
      id: RESTAURANT_ID,
      name: "Column",
      type: "CAFE",
      address: "25 Summer Street, Orange NSW 2800",
      timezone: "Australia/Sydney",
      active: true,
      openingHours: {
        daily: "07:30-16:00",
        breakfast: "08:00-11:30",
        lunch: "11:30-15:30",
      },
    },
  });

  const admin = await ensureUser("admin@rms.com", "Admin User", "ADMIN", "admin123");
  const chef = await ensureUser("chef@rms.com", "Head Chef", "HEAD_CHEF", "chef123");

  await prisma.userRestaurant.upsert({
    where: { userId_restaurantId: { userId: admin.id, restaurantId: restaurant.id } },
    update: { role: "ADMIN" },
    create: { userId: admin.id, restaurantId: restaurant.id, role: "ADMIN" },
  });
  await prisma.userRestaurant.upsert({
    where: { userId_restaurantId: { userId: chef.id, restaurantId: restaurant.id } },
    update: { role: "HEAD_CHEF" },
    create: { userId: chef.id, restaurantId: restaurant.id, role: "HEAD_CHEF" },
  });

  const allergenMap: Record<string, string> = {};
  for (const name of ["Gluten", "Dairy", "Eggs", "Nuts", "Fish", "Soy", "Sesame"]) {
    const allergen = await prisma.allergen.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    allergenMap[name] = allergen.id;
  }

  const ingredientMap: Record<string, string> = {};
  for (const def of ingredientDefs) {
    const ingredient = await ensureIngredient(restaurant.id, def);
    ingredientMap[ingredient.name] = ingredient.id;
  }
  console.log(`- ${ingredientDefs.length} ingredients ready`);

  let sortOrder = 10;
  for (const item of recipes) {
    const recipeId = `recipe-column-${item.slug}`;
    const menuItemId = `menu-column-${item.slug}`;

    await prisma.recipe.upsert({
      where: { id: recipeId },
      update: {
        restaurantId: restaurant.id,
        name: item.name,
        category: item.category,
        description: item.description,
        method: item.method,
        prepTime: item.prepTime,
        cookTime: item.cookTime,
        servings: item.servings,
        sellingPrice: item.price,
        dietaryTags: item.dietaryTags,
        active: true,
        createdById: chef.id,
        ingredients: {
          deleteMany: {},
          create: item.ingredients.map(([name, quantity, unit]) => ({
            ingredientId: ingredientMap[name],
            quantity,
            unit,
          })),
        },
        allergens: {
          deleteMany: {},
          create: item.allergens.map((name) => ({ allergenId: allergenMap[name] })),
        },
      },
      create: {
        id: recipeId,
        restaurantId: restaurant.id,
        name: item.name,
        category: item.category,
        description: item.description,
        method: item.method,
        prepTime: item.prepTime,
        cookTime: item.cookTime,
        servings: item.servings,
        sellingPrice: item.price,
        dietaryTags: item.dietaryTags,
        active: true,
        createdById: chef.id,
        ingredients: {
          create: item.ingredients.map(([name, quantity, unit]) => ({
            ingredientId: ingredientMap[name],
            quantity,
            unit,
          })),
        },
        allergens: {
          create: item.allergens.map((name) => ({ allergenId: allergenMap[name] })),
        },
      },
    });

    await prisma.menuItem.upsert({
      where: { id: menuItemId },
      update: {
        restaurantId: restaurant.id,
        recipeId,
        name: item.name,
        price: item.price,
        category: item.category,
        subcategory: item.subcategory,
        available: true,
        sortOrder,
      },
      create: {
        id: menuItemId,
        restaurantId: restaurant.id,
        recipeId,
        name: item.name,
        price: item.price,
        category: item.category,
        subcategory: item.subcategory,
        available: true,
        sortOrder,
      },
    });

    await prisma.recipeVersion.upsert({
      where: { recipeId_version: { recipeId, version: 1 } },
      update: {
        snapshotJson: item,
        changedById: chef.id,
      },
      create: {
        recipeId,
        version: 1,
        snapshotJson: item,
        changedById: chef.id,
      },
    });

    console.log(`- ${item.name} ($${item.price})`);
    sortOrder += 10;
  }

  console.log(`Done. Seeded ${recipes.length} Column recipes and menu items.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
