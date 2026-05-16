import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Header from "@/components/layout/Header";
import { BookOpen, Package, ShoppingCart, Users } from "lucide-react";

async function getStats() {
  const [recipes, ingredients, users] = await Promise.all([
    db.recipe.count({ where: { active: true } }),
    db.ingredient.count({ where: { active: true } }),
    db.user.count({ where: { active: true } }),
  ]);
  return { recipes, ingredients, users };
}

export default async function DashboardPage() {
  const session = await auth();
  const stats = await getStats();
  const userName = session?.user?.name?.split(" ")[0] ?? "Chef";

  const cards = [
    { label: "Active Recipes", value: stats.recipes, icon: BookOpen, color: "text-orange-400", bg: "bg-orange-500/10" },
    { label: "Ingredients", value: stats.ingredients, icon: Package, color: "text-blue-400", bg: "bg-blue-500/10" },
    { label: "Team Members", value: stats.users, icon: Users, color: "text-purple-400", bg: "bg-purple-500/10" },
    { label: "Open Orders", value: 0, icon: ShoppingCart, color: "text-green-400", bg: "bg-green-500/10" },
  ];

  return (
    <>
      <Header title="Dashboard" />
      <div className="p-6 space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-white">Good day, {userName}</h2>
          <p className="text-gray-400 text-sm mt-1">Here's an overview of your restaurant.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-gray-400">{card.label}</p>
                  <div className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center`}>
                    <Icon size={18} className={card.color} />
                  </div>
                </div>
                <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
              </div>
            );
          })}
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-2">Phase 1 — Foundation</h3>
          <p className="text-gray-400 text-sm">
            Auth, Recipes, and Ingredient management are live. POS, Stock, Suppliers, and Kitchen Lab coming in Phase 2–4.
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {["Auth", "Recipes", "Ingredients", "POS", "Stock", "AI Lab"].map((m, i) => (
              <div
                key={m}
                className={`text-xs px-3 py-1.5 rounded-full text-center font-medium ${
                  i < 3 ? "bg-green-500/15 text-green-400" : "bg-gray-800 text-gray-500"
                }`}
              >
                {i < 3 ? "✓ " : ""}{m}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
