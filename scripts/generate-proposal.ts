import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

const OUTPUT = path.join(process.cwd(), "Project_Proposal.pdf");
const doc = new PDFDocument({ margin: 50, size: "A4" });
doc.pipe(fs.createWriteStream(OUTPUT));

const ORANGE = "#f97316";
const DARK   = "#111827";
const GRAY   = "#6b7280";
const LIGHT  = "#f3f4f6";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function pageWidth() { return doc.page.width - 100; }

function h1(text: string) {
  doc.moveDown(0.5)
     .font("Helvetica-Bold").fontSize(20).fillColor(ORANGE)
     .text(text)
     .moveDown(0.3)
     .moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y)
     .strokeColor(ORANGE).lineWidth(1.5).stroke()
     .moveDown(0.5);
}

function h2(text: string) {
  doc.moveDown(0.4)
     .font("Helvetica-Bold").fontSize(14).fillColor(DARK)
     .text(text)
     .moveDown(0.2);
}

function h3(text: string) {
  doc.font("Helvetica-Bold").fontSize(11).fillColor(ORANGE).text(text).moveDown(0.1);
}

function body(text: string) {
  doc.font("Helvetica").fontSize(10).fillColor(DARK).text(text, { lineGap: 3 }).moveDown(0.2);
}

function bullet(items: string[]) {
  items.forEach(item => {
    doc.font("Helvetica").fontSize(10).fillColor(DARK)
       .text(`• ${item}`, { indent: 15, lineGap: 2 });
  });
  doc.moveDown(0.3);
}

function tableRow(col1: string, col2: string, col3?: string, header = false) {
  const y  = doc.y;
  const x1 = 50, x2 = col3 ? 220 : 230, x3 = col3 ? 390 : 0;
  const w1 = col3 ? 165 : 175, w2 = col3 ? 165 : pageWidth() - 175, w3 = col3 ? pageWidth() - 335 : 0;
  const h  = 18;

  if (header) {
    doc.rect(x1, y, pageWidth(), h).fill("#1f2937");
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#ffffff");
  } else {
    doc.font("Helvetica").fontSize(9).fillColor(DARK);
  }

  doc.text(col1, x1 + 4, y + 4, { width: w1, lineBreak: false });
  doc.text(col2, x2 + 4, y + 4, { width: w2, lineBreak: false });
  if (col3) doc.text(col3, x3 + 4, y + 4, { width: w3, lineBreak: false });

  doc.moveTo(x1, y + h).lineTo(x1 + pageWidth(), y + h)
     .strokeColor("#e5e7eb").lineWidth(0.5).stroke();
  doc.y = y + h + 1;
}

function phaseBadge(phase: string, title: string, weeks: string, done: boolean) {
  const y = doc.y;
  doc.rect(50, y, pageWidth(), 26)
     .fill(done ? "#052e16" : "#1f2937");
  doc.circle(70, y + 13, 10).fill(done ? "#16a34a" : ORANGE);
  doc.font("Helvetica-Bold").fontSize(9).fillColor("#ffffff")
     .text(phase, 65, y + 8, { width: 20, align: "center", lineBreak: false });
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#ffffff")
     .text(title, 88, y + 8, { lineBreak: false });
  doc.font("Helvetica").fontSize(9).fillColor(done ? "#86efac" : "#9ca3af")
     .text(done ? `✓ COMPLETED — ${weeks}` : weeks, 88, y + 18, { lineBreak: false });
  doc.y = y + 32;
}

// ─── Cover Page ───────────────────────────────────────────────────────────────
doc.rect(0, 0, doc.page.width, 200).fill("#030712");
doc.rect(0, 200, doc.page.width, 6).fill(ORANGE);

doc.font("Helvetica-Bold").fontSize(10).fillColor(ORANGE)
   .text("CONFIDENTIAL  •  PROJECT PROPOSAL", 50, 60, { align: "center", width: pageWidth() });
doc.font("Helvetica-Bold").fontSize(32).fillColor("#ffffff")
   .text("Restaurant Management", 50, 90, { align: "center", width: pageWidth() });
doc.font("Helvetica-Bold").fontSize(32).fillColor(ORANGE)
   .text("System (RMS)", 50, 130, { align: "center", width: pageWidth() });

doc.y = 220;
doc.font("Helvetica").fontSize(10).fillColor(GRAY)
   .text(`Prepared: ${new Date().toLocaleDateString("en-AU", { year: "numeric", month: "long", day: "numeric" })}`, { align: "center" });

doc.moveDown(2);

// ─── 1. Executive Summary ─────────────────────────────────────────────────────
h1("1. Executive Summary");
body(
  "A full-stack web application that unifies restaurant operations into a single platform — " +
  "covering the kitchen, front of house, purchasing, and creative development. " +
  "The system eliminates manual processes, reduces waste, and gives management real-time " +
  "visibility across all departments."
);
body(
  "Built on Next.js 15, PostgreSQL, and the Claude AI API, the RMS is designed for " +
  "modern restaurant groups that want to move from fragmented spreadsheets and paper " +
  "processes to a unified, data-driven operation."
);

// ─── 2. Core Modules ──────────────────────────────────────────────────────────
h1("2. Core Modules");
tableRow("#", "Module", "Purpose", true);
tableRow("1", "Recipe Management",    "Central recipe library with costing, versioning & allergens");
tableRow("2", "POS (Point of Sale)",  "Table orders, payments, splits, KDS integration");
tableRow("3", "Kitchen Stock Mgmt",   "Ingredient inventory, consumption tracking, wastage");
tableRow("4", "FOH Stock Mgmt",       "Beverages, packaging & front-of-house supplies");
tableRow("5", "Supplier Auto-Order",  "Smart reorder triggers based on par levels");
tableRow("6", "Kitchen Lab (AI)",     "AI-assisted new menu creation with chef collaboration");
tableRow("7", "Analytics & Reports",  "Costs, sales, waste, supplier performance dashboards");
tableRow("8", "Staff & Role Mgmt",    "Roles: Admin, Manager, Chef, Sous-Chef, Waiter, Bartender");

doc.moveDown(0.5);

// ─── 3. Goals & Success Metrics ───────────────────────────────────────────────
h1("3. Goals & Success Metrics");
tableRow("Goal", "Target Metric", undefined, true);
tableRow("Reduce stock waste",         "Wastage cost < 3% of revenue");
tableRow("Eliminate stockouts",        "Zero emergency orders per month");
tableRow("Speed up table ordering",    "Table-to-kitchen ticket < 30 seconds");
tableRow("Empower culinary creativity","New menu item prototype cycle < 1 day");
tableRow("Financial visibility",       "Real-time food cost % per dish");

doc.moveDown(0.5);

// ─── 4. Tech Stack ────────────────────────────────────────────────────────────
h1("4. Technology Stack");

h2("Frontend");
tableRow("Layer", "Technology", "Reason", true);
tableRow("Framework",    "Next.js 15 (App Router)",  "SSR for speed, API routes built-in");
tableRow("Language",     "TypeScript",                "Full-stack type safety");
tableRow("UI Library",   "shadcn/ui + Tailwind CSS",  "Fast, customizable, accessible");
tableRow("State",        "Zustand",                   "Lightweight, suits POS real-time state");
tableRow("Real-time",    "Socket.io",                 "POS → KDS live ticket updates");
tableRow("Forms",        "React Hook Form + Zod",     "Shared validation with backend");
doc.moveDown(0.4);

h2("Backend & Database");
tableRow("Layer", "Technology", "Reason", true);
tableRow("Runtime",      "Node.js (Next.js API)",    "Unified monorepo codebase");
tableRow("ORM",          "Prisma 7",                 "Type-safe DB access, clean migrations");
tableRow("Auth",         "NextAuth v5",              "JWT sessions, role-based access");
tableRow("Queue",        "BullMQ + Redis",           "Auto-ordering jobs, async tasks");
tableRow("Primary DB",   "PostgreSQL 17",            "ACID, relational, perfect for POS/inventory");
tableRow("Cache",        "Redis",                    "Sessions, real-time POS state, job queue");
tableRow("AI",           "Claude API (Sonnet 4.6)",  "Kitchen Lab recipe generation & analysis");
doc.moveDown(0.5);

// ─── 5. System Architecture ───────────────────────────────────────────────────
h1("5. System Architecture");
h2("Modular Monolith (Microservices-ready)");
body(
  "The system starts as a well-structured monolith — faster to build and easier to debug — " +
  "with each module isolated into its own service layer so it can be extracted into an " +
  "independent microservice as the product scales."
);

const archLines = [
  "  ┌─────────────────────────────────────────────────────┐",
  "  │              CLIENT LAYER                           │",
  "  │  Next.js Web  │  Kitchen Display (KDS)  │  POS iPad │",
  "  └──────────────────────┬──────────────────────────────┘",
  "                         │ HTTPS / WebSocket",
  "  ┌──────────────────────▼──────────────────────────────┐",
  "  │           API GATEWAY (Next.js API Routes)          │",
  "  │       Auth Middleware │ Rate Limiting │ Logging      │",
  "  └──┬─────────┬─────────┬──────────┬───────────────────┘",
  "     │         │         │          │",
  "  ┌──▼──┐  ┌──▼──┐  ┌──▼──┐  ┌──▼──────────┐",
  "  │ POS │  │Stock│  │Recipe│  │  AI Lab      │",
  "  │ Svc │  │ Svc │  │ Svc  │  │  (Claude)    │",
  "  └──┬──┘  └──┬──┘  └──┬──┘  └──────────────┘",
  "     └────────┴─────────┘",
  "              │",
  "  ┌───────────▼──────────┐",
  "  │   PostgreSQL  │ Redis │",
  "  └──────────────────────┘",
];
doc.font("Courier").fontSize(8).fillColor("#374151");
archLines.forEach(line => doc.text(line, { lineGap: 1 }));
doc.moveDown(0.5);

// ─── 6. Database Schema ───────────────────────────────────────────────────────
doc.addPage();
h1("6. Database Schema (Key Entities)");

const entities = [
  { name: "users",             desc: "Staff accounts with roles (ADMIN, MANAGER, CHEF, SOUS_CHEF, WAITER, BARTENDER)" },
  { name: "ingredients",       desc: "Ingredient library with unit, cost, stock level, par level, reorder point" },
  { name: "allergens",         desc: "Allergen master list linked to both ingredients and recipes" },
  { name: "recipes",           desc: "Recipe cards with category, prep/cook time, servings, selling price" },
  { name: "recipe_ingredients",desc: "Junction: recipe → ingredient with quantity and unit" },
  { name: "recipe_allergens",  desc: "Junction: recipe → allergen (auto-derived + manual)" },
  { name: "recipe_versions",   desc: "Full JSON snapshot saved every time a recipe is edited" },
  { name: "tables",            desc: "Restaurant floor plan — section, capacity, status" },
  { name: "orders",            desc: "POS orders linked to table, server, open/close timestamps" },
  { name: "order_items",       desc: "Individual line items with status (PENDING→COOKING→READY→SERVED)" },
  { name: "menu_items",        desc: "Published menu items linked to recipes with live pricing" },
  { name: "foh_items",         desc: "FOH inventory: beverages, packaging, front supplies" },
  { name: "stock_transactions",desc: "Audit log of every stock movement (IN / OUT / WASTE / ADJUST)" },
  { name: "suppliers",         desc: "Supplier directory with lead times and contact info" },
  { name: "purchase_orders",   desc: "POs with status (DRAFT→SENT→CONFIRMED→RECEIVED)" },
  { name: "lab_sessions",      desc: "AI Kitchen Lab conversations — brief, messages, output recipe" },
];
entities.forEach((e, i) => {
  doc.rect(50, doc.y, pageWidth(), 20).fill(i % 2 === 0 ? LIGHT : "#ffffff");
  doc.font("Courier-Bold").fontSize(9).fillColor("#1d4ed8").text(e.name, 56, doc.y + 5, { width: 165, lineBreak: false });
  doc.font("Helvetica").fontSize(9).fillColor(DARK).text(e.desc, 224, doc.y + 5, { width: pageWidth() - 175, lineBreak: false });
  doc.y += 21;
});
doc.moveDown(0.5);

// ─── 7. Project Timeline ──────────────────────────────────────────────────────
h1("7. Implementation Roadmap");

phaseBadge("1", "Foundation — Auth, Recipes, DB Schema, Base UI",       "Weeks 1–4   (COMPLETED)", true);
doc.moveDown(0.1);
phaseBadge("2", "Operations Core — POS, Kitchen Stock, FOH Stock",       "Weeks 5–10", false);
doc.moveDown(0.1);
phaseBadge("3", "Intelligence Layer — Auto-Ordering, Supplier Portal",   "Weeks 11–15", false);
doc.moveDown(0.1);
phaseBadge("4", "AI Kitchen Lab — Claude Integration, Chef Collab Tools","Weeks 16–20", false);
doc.moveDown(0.1);
phaseBadge("5", "Analytics & Polish — Dashboards, Reports, Mobile QA",  "Weeks 21–24", false);

doc.moveDown(0.8);
h2("Timeline Summary");
tableRow("Phase", "Deliverable", "Target", true);
tableRow("1 (Done)",   "Auth, Recipes, Ingredients, Base UI",     "Week 4");
tableRow("2",          "POS, KDS, Kitchen & FOH Stock",           "Week 10");
tableRow("3",          "Supplier auto-ordering, PO workflow",     "Week 15");
tableRow("4",          "AI Kitchen Lab (Claude API)",             "Week 20");
tableRow("5",          "Analytics, Reports, Mobile optimization", "Week 24");

doc.moveDown(0.5);

// ─── 8. Security Design ───────────────────────────────────────────────────────
h1("8. Security Design");
tableRow("Concern", "Solution", undefined, true);
tableRow("Authentication",   "JWT sessions via NextAuth v5, HttpOnly cookies");
tableRow("Authorization",    "Role-based middleware on every API route");
tableRow("SQL Injection",    "Prisma parameterised queries — no raw SQL");
tableRow("XSS",              "React escapes by default; CSP headers via Next.js");
tableRow("Secrets",          "Environment variables only, never committed to git");
tableRow("POS Integrity",    "Server-side price validation — client never sets price");
tableRow("Audit Trail",      "Every stock/order mutation logged with user + timestamp");

doc.moveDown(0.5);

// ─── 9. Team Roles ────────────────────────────────────────────────────────────
h1("9. User Roles & Permissions");
tableRow("Role", "Primary Access", undefined, true);
tableRow("ADMIN",      "Full system access, user management, all settings");
tableRow("MANAGER",    "All ops: approve POs, view analytics, manage menu");
tableRow("CHEF",       "Recipes, Kitchen Stock, Kitchen Lab, KDS");
tableRow("SOUS_CHEF",  "Recipes (read/update), Kitchen Stock, KDS");
tableRow("WAITER",     "POS only — create orders, mark items served");
tableRow("BARTENDER",  "POS (bar tab), FOH Stock");

doc.moveDown(0.5);

// ─── Footer on last page ──────────────────────────────────────────────────────
const bottomY = doc.page.height - 50;
doc.moveTo(50, bottomY - 10).lineTo(doc.page.width - 50, bottomY - 10)
   .strokeColor("#e5e7eb").lineWidth(0.5).stroke();
doc.font("Helvetica").fontSize(8).fillColor(GRAY)
   .text(
     `Restaurant Management System — Project Proposal  •  Generated ${new Date().toLocaleDateString()}  •  Confidential`,
     50, bottomY, { align: "center", width: pageWidth() }
   );

doc.end();
console.log(`PDF saved → ${OUTPUT}`);
