// @ts-nocheck
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: "postgresql://postgres:postgres@127.0.0.1:5432/rms_db" });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🍷  Seeding Drinks Menu...\n");

  // ── Helper: upsert a MenuItem directly (no recipe needed for packaged drinks) ─
  async function upsertItem(name: string, price: number, subcategory: string, sortOrder = 0) {
    const existing = await prisma.menuItem.findFirst({ where: { name } });
    if (existing) {
      await prisma.menuItem.update({ where: { id: existing.id }, data: { subcategory, sortOrder } });
      return;
    }
    await prisma.menuItem.create({
      data: { name, price, category: "BEVERAGE", subcategory, available: true, sortOrder },
    });
    console.log(`  ✓ ${name}  ($${price})`);
  }

  // ════════════════════════════════════════════════════════════════
  // 1. Update subcategory on existing mock cocktails / mocktails
  // ════════════════════════════════════════════════════════════════
  console.log("Updating existing beverage subcategories:");

  const cocktailNames = [
    "Whisky Highball", "Yuzu Margarita", "Tokyo Mule", "Miso Old Fashioned",
    "Sakura Spritz", "Matcha Espresso Martini", "Yuzu Sake Sour",
  ];
  await prisma.menuItem.updateMany({
    where: { name: { in: cocktailNames } },
    data: { subcategory: "Cocktail" },
  });

  const mocktailNames = ["Yuzu Lemonade", "Ginger Lychee Cooler", "Butterfly Pea Lemonade"];
  await prisma.menuItem.updateMany({
    where: { name: { in: mocktailNames } },
    data: { subcategory: "Mocktail" },
  });

  const teaNames = ["Ceremonial Matcha Latte", "Hojicha Latte"];
  await prisma.menuItem.updateMany({
    where: { name: { in: teaNames } },
    data: { subcategory: "Tea" },
  });
  console.log("  ✓ Existing items updated\n");

  // ════════════════════════════════════════════════════════════════
  // 2. Cocktails (actual menu)
  // ════════════════════════════════════════════════════════════════
  console.log("Cocktails:");
  await upsertItem("Peachrita",             23,   "Cocktail", 10);
  await upsertItem("Yuzu Love",             23,   "Cocktail", 11);
  await upsertItem("Japanese Old Fashioned",24,   "Cocktail", 12);
  await upsertItem("French Breeze",         22.5, "Cocktail", 13);
  await upsertItem("Passionfruit Fantasy",  23,   "Cocktail", 14);
  await upsertItem("Matcha Colada",         23,   "Cocktail", 15);
  await upsertItem("Espresso Martini",      22,   "Cocktail", 16);
  await upsertItem("Hazelnut Martini",      22,   "Cocktail", 17);

  // ════════════════════════════════════════════════════════════════
  // 3. Mocktail
  // ════════════════════════════════════════════════════════════════
  console.log("\nMocktails:");
  await upsertItem("Very Berry", 14, "Mocktail", 10);

  // ════════════════════════════════════════════════════════════════
  // 4. Wine — Sparkling
  // ════════════════════════════════════════════════════════════════
  console.log("\nWine — Sparkling:");
  await upsertItem("See Saw Prosecco (Glass)",                    13.5, "Wine", 10);
  await upsertItem("See Saw Prosecco (Bottle)",                   57,   "Wine", 11);
  await upsertItem("Angullong Chardonnay Pinot Noir (Glass)",     13.5, "Wine", 12);
  await upsertItem("Angullong Chardonnay Pinot Noir (Bottle)",    57,   "Wine", 13);
  await upsertItem("Stockman's Ridge Primrose 2022",              68,   "Wine", 14);
  await upsertItem("Logan M Cuvee 2021",                          78,   "Wine", 15);

  // ── White — Sauvignon Blanc
  console.log("\nWine — Sauvignon Blanc:");
  await upsertItem("Nashdale Lane Sauvignon Blanc (Glass)",       13.5, "Wine", 20);
  await upsertItem("Nashdale Lane Sauvignon Blanc (Bottle)",      57,   "Wine", 21);
  await upsertItem("Mayfield 'Sophie's Godmother' 2024",          60,   "Wine", 22);
  await upsertItem("Zinga Reserve Fume Blanc 2022",               65,   "Wine", 23);
  await upsertItem("Windowrie 'Sakura' Organic 2024",             59,   "Wine", 24);
  await upsertItem("Philip Shaw No 19 2023",                      61,   "Wine", 25);

  // ── White — Chardonnay
  console.log("\nWine — Chardonnay:");
  await upsertItem("Ross Hill 'Maya' Chardonnay (Glass)",         13.5, "Wine", 30);
  await upsertItem("Ross Hill 'Maya' Chardonnay (Bottle)",        57,   "Wine", 31);
  await upsertItem("Swinging Bridge 'Mrs Payten' 2024",           67,   "Wine", 32);
  await upsertItem("Rowlee Chardonnay 2025",                      69,   "Wine", 33);
  await upsertItem("Colmar Estate Block 2 Chardonnay 2022",       95,   "Wine", 34);

  // ── White — Pinot Gris & Blend
  console.log("\nWine — Pinot Gris & Blend:");
  await upsertItem("Heifer Station Pinot Gris (Glass)",           14,   "Wine", 40);
  await upsertItem("Heifer Station Pinot Gris (Bottle)",          60,   "Wine", 41);
  await upsertItem("Rowlee Pinot Gris 2024",                      65,   "Wine", 42);
  await upsertItem("Ross Hill Pinnacle Pinot Gris 2024",          69,   "Wine", 43);
  await upsertItem("Gilbert 'Blanc' PG Riesling Gewurz 2022",    60,   "Wine", 44);

  // ── White — Riesling
  console.log("\nWine — Riesling:");
  await upsertItem("Swinging Bridge 'Eliza' Riesling (Glass)",    14,   "Wine", 50);
  await upsertItem("Swinging Bridge 'Eliza' Riesling (Bottle)",   60,   "Wine", 51);
  await upsertItem("Nashdale Lane Medium Dry Riesling 2023",      63,   "Wine", 52);
  await upsertItem("Brangayne Riesling 2023",                     65,   "Wine", 53);
  await upsertItem("Colmar Estate Block 5 Riesling 2023",         88,   "Wine", 54);

  // ── White — Other
  console.log("\nWine — White Other:");
  await upsertItem("Rosnay Organic Semillon 2016",                57,   "Wine", 60);
  await upsertItem("Angullong Verdelho 2023",                     58,   "Wine", 61);
  await upsertItem("Orange Mountain Interval Viognier 2021",      62,   "Wine", 62);
  await upsertItem("Stockman's Ridge Rider Gruner Veltliner 2022",59,   "Wine", 63);
  await upsertItem("Slow Wine 'Tribus' PG Riesling Gewurz 2023",  60,   "Wine", 64);

  // ── Rosé
  console.log("\nWine — Rosé:");
  await upsertItem("See Saw Rosé (Glass)",                        13.5, "Wine", 70);
  await upsertItem("See Saw Rosé (Bottle)",                       57,   "Wine", 71);
  await upsertItem("Mayfield 'Five Rows' Rosé 2023",              60,   "Wine", 72);

  // ── Red — Shiraz
  console.log("\nWine — Shiraz:");
  await upsertItem("Nashdale Lane Shiraz (Glass)",                14,   "Wine", 80);
  await upsertItem("Nashdale Lane Shiraz (Bottle)",               60,   "Wine", 81);
  await upsertItem("Heifer Station Shiraz 2023",                  65,   "Wine", 82);
  await upsertItem("Zinga Single Vineyard Shiraz 2021",           65,   "Wine", 83);
  await upsertItem("Angullong 'Crossing Reserve' Shiraz 2022",    85,   "Wine", 84);
  await upsertItem("Orange Mountain '1397' Shiraz Viognier 2023", 82,   "Wine", 85);

  // ── Red — Pinot Noir
  console.log("\nWine — Pinot Noir:");
  await upsertItem("Philip Shaw 'The Wire Walker' (Glass)",       14,   "Wine", 90);
  await upsertItem("Philip Shaw 'The Wire Walker' (Bottle)",      60,   "Wine", 91);
  await upsertItem("Slow Wine Co Pinot Noir 2021",                68,   "Wine", 92);
  await upsertItem("Ross Hill Pinnacle Pinot Noir 2023",          80,   "Wine", 93);
  await upsertItem("Gilbert 'Rouge' PN Shiraz Meunier 2022",      60,   "Wine", 94);

  // ── Red — Cabernet & Other
  console.log("\nWine — Cabernet & Other Reds:");
  await upsertItem("Cooks Lot Cabernet Merlot 8989 (Glass)",      13.5, "Wine", 100);
  await upsertItem("Cooks Lot Cabernet Merlot 8989 (Bottle)",     57,   "Wine", 101);
  await upsertItem("Cargo Road Cabernet Sauvignon 2022",          62,   "Wine", 102);
  await upsertItem("Brangayne 'Tristan' Cab Sav Shiraz Merlot",   68,   "Wine", 103);
  await upsertItem("Self Made-up Man 2018",                       115,  "Wine", 104);
  await upsertItem("Slow Wine Co Merlot 2019",                    68,   "Wine", 105);
  await upsertItem("Logan Weemala Tempranillo 2022",              58,   "Wine", 106);
  await upsertItem("Angullong 'Fossil Hill' Barbera 2023",        63,   "Wine", 107);
  await upsertItem("Swinging Bridge '#009' Gamay 2024",           65,   "Wine", 108);
  await upsertItem("Rowlee Nebbiolo 2023",                        125,  "Wine", 109);

  // ════════════════════════════════════════════════════════════════
  // 5. Beer & Cider
  // ════════════════════════════════════════════════════════════════
  console.log("\nBeer & Cider:");
  await upsertItem("Asahi Tap (300ml)",                           12.5, "Beer", 10);
  await upsertItem("Sapporo",                                     10.5, "Beer", 11);
  await upsertItem("Asahi (Bottle)",                              10.5, "Beer", 12);
  await upsertItem("Kirin Ichiban Shibori",                       10.5, "Beer", 13);
  await upsertItem("Yebisu Premium Black",                        16.5, "Beer", 14);
  await upsertItem("Rogers' Amber Ale",                           10.5, "Beer", 15);
  await upsertItem("Cascade Light",                               9,    "Beer", 16);
  await upsertItem("Small Acres Cyder Pink Lady",                 11,   "Beer", 17);
  await upsertItem("Small Acres Cyder Golden Knot (Non-Alc)",     10.5, "Beer", 18);

  // ════════════════════════════════════════════════════════════════
  // 6. Spirits
  // ════════════════════════════════════════════════════════════════
  console.log("\nSpirits — Vodka:");
  await upsertItem("Smirnoff Vodka",                              12,   "Spirit", 10);
  await upsertItem("Grey Goose Vodka",                            14,   "Spirit", 11);
  await upsertItem("Belvedere Vodka",                             15,   "Spirit", 12);

  console.log("\nSpirits — Gin:");
  await upsertItem("Tanqueray Gin",                               12,   "Spirit", 20);
  await upsertItem("Bombay Sapphire Gin",                         13,   "Spirit", 21);
  await upsertItem("Tanqueray 10 Gin",                            14,   "Spirit", 22);
  await upsertItem("Hendrick's Gin",                              14,   "Spirit", 23);

  console.log("\nSpirits — Rum:");
  await upsertItem("Bacardi White Rum",                           12,   "Spirit", 30);
  await upsertItem("Bacardi Gold Rum",                            12.5, "Spirit", 31);
  await upsertItem("Kraken Rum",                                  13,   "Spirit", 32);

  console.log("\nSpirits — Tequila:");
  await upsertItem("El Jimador Reposado Tequila",                 12,   "Spirit", 40);
  await upsertItem("El Jimador Blanco Tequila",                   12.5, "Spirit", 41);

  console.log("\nSpirits — Japanese Whiskey:");
  await upsertItem("Suntory Toki Whisky",                         16,   "Spirit", 50);
  await upsertItem("Nikka Single Malt Yoichi",                    21,   "Spirit", 51);
  await upsertItem("Hakushu Distiller's Reserve",                 25,   "Spirit", 52);
  await upsertItem("Hibiki Harmony Master's Select",              32,   "Spirit", 53);

  console.log("\nSpirits — Whisky & Whiskey:");
  await upsertItem("Johnnie Walker Black",                        13,   "Spirit", 60);
  await upsertItem("Monkey Shoulder",                             13,   "Spirit", 61);
  await upsertItem("Maker's Mark",                                13,   "Spirit", 62);
  await upsertItem("Jack Daniel's",                               13,   "Spirit", 63);
  await upsertItem("Jim Beam Rye",                                13,   "Spirit", 64);
  await upsertItem("Canadian Club",                               13,   "Spirit", 65);
  await upsertItem("Jameson's Irish Whiskey",                     13,   "Spirit", 66);

  console.log("\nSpirits — Aperitif & Digestive:");
  await upsertItem("Aperol",                                      11.5, "Spirit", 70);
  await upsertItem("Pimm's",                                      11.5, "Spirit", 71);
  await upsertItem("Campari",                                     11.5, "Spirit", 72);
  await upsertItem("Baileys",                                     11.5, "Spirit", 73);
  await upsertItem("Kahlua",                                      11.5, "Spirit", 74);
  await upsertItem("Disaronno Amaretto",                          11.5, "Spirit", 75);
  await upsertItem("Cointreau",                                   11.5, "Spirit", 76);
  await upsertItem("Chambord",                                    12.5, "Spirit", 77);

  // ════════════════════════════════════════════════════════════════
  // 7. Sake, Shochu & Umeshu
  // ════════════════════════════════════════════════════════════════
  console.log("\nSake:");
  await upsertItem("Suishin Hot Sake / Junmai (300ml)",           29,   "Sake", 10);
  await upsertItem("Otokoyama Cold Sake / Tokubetsu Junmai",      33,   "Sake", 11);
  await upsertItem("Urakasumi Cold Sake / Junmai",                34,   "Sake", 12);
  await upsertItem("Ippin Cold Sake / Junmai Daiginjo",           37,   "Sake", 13);
  await upsertItem("Hakutsuru Sayuri Nigori",                     27,   "Sake", 14);

  console.log("\nShochu:");
  await upsertItem("Iichiko Silhouette Shochu",                   13,   "Sake", 20);
  await upsertItem("Kaido Shochu",                                13,   "Sake", 21);
  await upsertItem("Kurouma Mugi Shochu",                         13,   "Sake", 22);

  console.log("\nUmeshu:");
  await upsertItem("Choya Umeshu (Plum Wine)",                    11,   "Sake", 30);

  // ════════════════════════════════════════════════════════════════
  // 8. Soft Drinks
  // ════════════════════════════════════════════════════════════════
  console.log("\nSoft Drinks:");
  await upsertItem("Coke",                                        5,    "Soft Drink", 10);
  await upsertItem("Coke No Sugar",                               5,    "Soft Drink", 11);
  await upsertItem("Lemonade",                                    5,    "Soft Drink", 12);
  await upsertItem("Lemon Squash",                                5,    "Soft Drink", 13);
  await upsertItem("Ginger Beer",                                 5,    "Soft Drink", 14);
  await upsertItem("Lemon Lime Bitters",                          6.5,  "Soft Drink", 15);
  await upsertItem("Pink Lemonade / Raspberry",                   6.5,  "Soft Drink", 16);

  // ════════════════════════════════════════════════════════════════
  // 9. Tea
  // ════════════════════════════════════════════════════════════════
  console.log("\nTea:");
  await upsertItem("Green Tea (Genmai / Brown Rice)",             5,    "Tea", 10);
  await upsertItem("Jasmine Tea",                                 5,    "Tea", 11);
  await upsertItem("Chamomile Tea",                               5,    "Tea", 12);
  await upsertItem("Yuzu Honey Tea",                              6.5,  "Tea", 13);

  // ════════════════════════════════════════════════════════════════
  // 10. Juice
  // ════════════════════════════════════════════════════════════════
  console.log("\nJuice:");
  await upsertItem("Apple Juice",                                 5,    "Juice", 10);
  await upsertItem("Orange Juice",                                5,    "Juice", 11);
  await upsertItem("Cranberry Juice",                             5,    "Juice", 12);
  await upsertItem("Pineapple Juice",                             5,    "Juice", 13);

  // ════════════════════════════════════════════════════════════════
  // 11. Water
  // ════════════════════════════════════════════════════════════════
  console.log("\nWater:");
  await upsertItem("San Pellegrino Sparkling 750ml",              9.5,  "Water", 10);

  console.log("\n✅  Drinks menu seeding complete.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
