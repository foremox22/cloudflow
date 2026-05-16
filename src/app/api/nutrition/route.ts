import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

interface UsdaFood {
  description: string;
  foodNutrients: Array<{ nutrientId: number; value: number }>;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const query = req.nextUrl.searchParams.get("query");
  if (!query?.trim()) return NextResponse.json({ error: "query required" }, { status: 400 });

  const apiKey = process.env.USDA_API_KEY ?? "DEMO_KEY";

  try {
    const url = new URL("https://api.nal.usda.gov/fdc/v1/foods/search");
    url.searchParams.set("query", query.trim());
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("dataType", "SR Legacy,Foundation");
    url.searchParams.set("pageSize", "1");

    const res = await fetch(url.toString());

    if (!res.ok) {
      return NextResponse.json({ error: `USDA error: ${res.status}` }, { status: res.status });
    }

    const data = await res.json() as { foods?: UsdaFood[] };
    const food = data.foods?.[0];
    if (!food) return NextResponse.json({ error: "Not found in nutrition database" }, { status: 404 });

    // Nutrient ID 1008 = Energy (kcal); SR Legacy/Foundation values are per 100g
    const kcal = Math.round(food.foodNutrients.find(n => n.nutrientId === 1008)?.value ?? 0);
    const kj = Math.round(kcal * 4.184);

    return NextResponse.json({ kcal, kj, foodName: food.description });
  } catch {
    return NextResponse.json({ error: "Failed to reach nutrition database" }, { status: 502 });
  }
}
