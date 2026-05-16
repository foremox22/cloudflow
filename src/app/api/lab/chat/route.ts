import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";
import { anthropic } from "@/lib/claude";
// Per-user rate limiter: max 20 messages per user per minute
const chatRateLimit = new Map<string, { count: number; resetAt: number }>();

// Ingredient cache with 5-minute TTL (stores full shape including allergens)
type CachedIngredient = {
  name: string;
  unit: string;
  costPerUnit: number;
  currentStock: number;
  ingredientAllergens: { allergen: { name: string } }[];
};
const ingredientCache = new Map<string, { data: CachedIngredient[]; expiresAt: number }>();

async function getCachedIngredients(restaurantId: string): Promise<CachedIngredient[]> {
  const cached = ingredientCache.get(restaurantId);
  if (cached && Date.now() < cached.expiresAt) return cached.data;
  const data = await db.ingredient.findMany({
    where: { restaurantId, active: true },
    select: {
      name: true,
      unit: true,
      costPerUnit: true,
      currentStock: true,
      ingredientAllergens: { include: { allergen: { select: { name: true } } } },
    },
    orderBy: { name: "asc" },
  });
  ingredientCache.set(restaurantId, { data, expiresAt: Date.now() + 5 * 60 * 1000 });
  return data;
}

const SYSTEM_PROMPT_BASE = `You are an expert AI culinary assistant embedded in Cloudflow, a professional restaurant management platform. You help chefs and kitchen staff develop recipes, analyze costs, detect allergens, suggest substitutions, and provide nutritional insights.

You have access to the restaurant's live ingredient database (provided below). When calculating costs, use the exact costPerUnit values from this database. When detecting allergens, cross-reference with the ingredient allergen data.

## Your Capabilities
1. **Recipe Generation** — Create detailed, professional restaurant recipes on request
2. **Food Cost Calculation** — Calculate accurate cost-per-serving using live ingredient prices
3. **Allergen Detection** — Identify allergens based on ingredients and flag them clearly
4. **Ingredient Substitution** — Suggest alternatives for unavailable or costly ingredients
5. **Nutritional Analysis** — Provide estimated macronutrient breakdown
6. **Plating Suggestions** — Describe professional plating and presentation techniques
7. **Banquet Scaling** — Scale recipes to any number of servings

## Recipe JSON Format
When you have enough information to present a complete recipe (or when the user asks to see the recipe), output a structured JSON block at the END of your response using this exact format:

<recipe_json>
{
  "name": "Recipe Name",
  "category": "STARTER|MAIN|DESSERT|BEVERAGE|SIDE|SAUCE|BREAD|OTHER",
  "description": "Brief description",
  "method": "Step-by-step cooking method...",
  "prepTime": 15,
  "cookTime": 30,
  "servings": 4,
  "suggestedPrice": 24.99,
  "estimatedCost": 8.50,
  "ingredients": [
    { "name": "ingredient name matching DB", "quantity": 0.5, "unit": "KG", "costPerUnit": 12.00 }
  ],
  "allergens": ["Gluten", "Dairy"],
  "nutritionalInfo": {
    "calories": 450,
    "protein": 32,
    "carbs": 28,
    "fat": 18
  },
  "platingNotes": "Describe plating here"
}
</recipe_json>

Only output the <recipe_json> block when presenting a full recipe. For discussions, substitutions, analysis, or scaling responses, omit it.

## Guidelines
- Be precise with costs — use the exact ingredient prices from the database
- Flag allergens prominently with ⚠️
- Suggest realistic selling prices with ~3x food cost as baseline
- Use professional culinary terminology
- Be concise but thorough`;

function buildSystemPrompt(
  ingredients: Array<{ name: string; unit: string; costPerUnit: number; currentStock: number; allergens: Array<{ allergen: { name: string } }> }>,
  allergens: Array<{ name: string }>
): string {
  const ingredientTable = ingredients
    .map(
      (i) =>
        `- ${i.name} | ${i.unit} | $${i.costPerUnit.toFixed(2)}/unit | stock: ${i.currentStock}${
          i.allergens.length > 0
            ? ` | allergens: ${i.allergens.map((a) => a.allergen.name).join(", ")}`
            : ""
        }`
    )
    .join("\n");

  const allergenList = allergens.map((a) => a.name).join(", ");

  return `${SYSTEM_PROMPT_BASE}

## Live Ingredient Database (${ingredients.length} items)
Format: Name | Unit | Cost/Unit | Current Stock | Allergens
${ingredientTable}

## Known Allergens in System
${allergenList}`;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;
  const restaurantId = await getRestaurantId(userId);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  // Rate limit: max 20 messages per user per minute
  const now = Date.now();
  const userRate = chatRateLimit.get(userId) ?? { count: 0, resetAt: now + 60 * 1000 };
  if (now > userRate.resetAt) { userRate.count = 0; userRate.resetAt = now + 60 * 1000; }
  if (userRate.count >= 20) {
    return NextResponse.json({ error: "Rate limit exceeded. Try again in a minute." }, { status: 429 });
  }
  userRate.count++;
  chatRateLimit.set(userId, userRate);

  const body = await req.json();
  const { sessionId, message } = body as { sessionId?: string; message: string };

  if (!message?.trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  // Find or create session
  let labSession;
  if (sessionId) {
    labSession = await db.labSession.findFirst({ where: { id: sessionId, userId, restaurantId } });
    if (!labSession) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  } else {
    labSession = await db.labSession.create({
      data: { userId, restaurantId, title: message.slice(0, 60) },
    });
  }

  // Save user message
  await db.labMessage.create({
    data: { sessionId: labSession.id, role: "USER", content: message },
  });

  // Update session title from first user message if still default
  if (labSession.title === "New Lab Session") {
    await db.labSession.update({
      where: { id: labSession.id },
      data: { title: message.slice(0, 60), updatedAt: new Date() },
    });
  }

  // Load conversation history (last 40 messages)
  const history = await db.labMessage.findMany({
    where: { sessionId: labSession.id },
    orderBy: { createdAt: "asc" },
    take: 40,
  });

  // Load ingredients for system prompt (cached with allergen data) and allergens
  const [cachedIngredients, allergens] = await Promise.all([
    getCachedIngredients(restaurantId),
    db.allergen.findMany({ select: { name: true }, orderBy: { name: "asc" } }),
  ]);

  const ingredientsWithAllergens = cachedIngredients.map((i) => ({
    name: i.name,
    unit: i.unit,
    costPerUnit: i.costPerUnit,
    currentStock: i.currentStock,
    allergens: i.ingredientAllergens,
  }));

  const systemPrompt = buildSystemPrompt(ingredientsWithAllergens, allergens);

  // Build messages array for Claude (exclude current message — already in history)
  const messages = history.slice(0, -1).map((m) => ({
    role: m.role === "USER" ? ("user" as const) : ("assistant" as const),
    content: m.content,
  }));
  messages.push({ role: "user", content: message });

  const sessionIdHeader = labSession.id;

  const stream = new ReadableStream({
    async start(controller) {
      let fullText = "";
      const encoder = new TextEncoder();

      try {
        const anthropicStream = await anthropic.messages.stream({
          model: "claude-opus-4-7",
          max_tokens: 8096,
          thinking: { type: "adaptive" },
          system: [
            {
              type: "text",
              text: systemPrompt,
              cache_control: { type: "ephemeral" },
            },
          ],
          messages,
        });

        for await (const event of anthropicStream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            const chunk = event.delta.text;
            fullText += chunk;
            controller.enqueue(encoder.encode(chunk));
          }
        }

        // Save assistant message after stream completes
        await db.labMessage.create({
          data: {
            sessionId: labSession.id,
            role: "ASSISTANT",
            content: fullText,
          },
        });

        await db.labSession.update({
          where: { id: labSession.id },
          data: { updatedAt: new Date() },
        });
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "AI error";
        controller.enqueue(encoder.encode(`\n\n[Error: ${errMsg}]`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Session-Id": sessionIdHeader,
      "Cache-Control": "no-cache",
      "Transfer-Encoding": "chunked",
    },
  });
}
