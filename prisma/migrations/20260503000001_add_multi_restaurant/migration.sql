-- CreateTable
CREATE TABLE "restaurants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restaurants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_restaurants" (
    "userId" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'WAITER',

    CONSTRAINT "user_restaurants_pkey" PRIMARY KEY ("userId","restaurantId")
);

-- AddForeignKey for user_restaurants
ALTER TABLE "user_restaurants" ADD CONSTRAINT "user_restaurants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_restaurants" ADD CONSTRAINT "user_restaurants_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed default restaurant
INSERT INTO "restaurants" ("id", "name", "updatedAt") VALUES ('clrestaurant00000000000001', 'My Restaurant', CURRENT_TIMESTAMP);

-- Enroll all existing users into the default restaurant
INSERT INTO "user_restaurants" ("userId", "restaurantId", "role")
SELECT "id", 'clrestaurant00000000000001', "role" FROM "users";

-- AlterTable: tables (remove old unique, add restaurantId, add composite unique)
ALTER TABLE "tables" ADD COLUMN "restaurantId" TEXT;
UPDATE "tables" SET "restaurantId" = 'clrestaurant00000000000001';
ALTER TABLE "tables" ALTER COLUMN "restaurantId" SET NOT NULL;
DROP INDEX IF EXISTS "tables_number_key";
CREATE UNIQUE INDEX "tables_restaurantId_number_key" ON "tables"("restaurantId", "number");
ALTER TABLE "tables" ADD CONSTRAINT "tables_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable: ingredients
ALTER TABLE "ingredients" ADD COLUMN "restaurantId" TEXT;
UPDATE "ingredients" SET "restaurantId" = 'clrestaurant00000000000001';
ALTER TABLE "ingredients" ALTER COLUMN "restaurantId" SET NOT NULL;
DROP INDEX IF EXISTS "ingredients_name_key";
CREATE UNIQUE INDEX "ingredients_restaurantId_name_key" ON "ingredients"("restaurantId", "name");
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable: recipes
ALTER TABLE "recipes" ADD COLUMN "restaurantId" TEXT;
UPDATE "recipes" SET "restaurantId" = 'clrestaurant00000000000001';
ALTER TABLE "recipes" ALTER COLUMN "restaurantId" SET NOT NULL;
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable: menu_items
ALTER TABLE "menu_items" ADD COLUMN "restaurantId" TEXT;
UPDATE "menu_items" SET "restaurantId" = 'clrestaurant00000000000001';
ALTER TABLE "menu_items" ALTER COLUMN "restaurantId" SET NOT NULL;
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable: orders
ALTER TABLE "orders" ADD COLUMN "restaurantId" TEXT;
UPDATE "orders" SET "restaurantId" = 'clrestaurant00000000000001';
ALTER TABLE "orders" ALTER COLUMN "restaurantId" SET NOT NULL;
ALTER TABLE "orders" ADD CONSTRAINT "orders_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable: reservations
ALTER TABLE "reservations" ADD COLUMN "restaurantId" TEXT;
UPDATE "reservations" SET "restaurantId" = 'clrestaurant00000000000001';
ALTER TABLE "reservations" ALTER COLUMN "restaurantId" SET NOT NULL;
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable: foh_items
ALTER TABLE "foh_items" ADD COLUMN "restaurantId" TEXT;
UPDATE "foh_items" SET "restaurantId" = 'clrestaurant00000000000001';
ALTER TABLE "foh_items" ALTER COLUMN "restaurantId" SET NOT NULL;
DROP INDEX IF EXISTS "foh_items_name_key";
CREATE UNIQUE INDEX "foh_items_restaurantId_name_key" ON "foh_items"("restaurantId", "name");
ALTER TABLE "foh_items" ADD CONSTRAINT "foh_items_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable: stock_transactions
ALTER TABLE "stock_transactions" ADD COLUMN "restaurantId" TEXT;
UPDATE "stock_transactions" SET "restaurantId" = 'clrestaurant00000000000001';
ALTER TABLE "stock_transactions" ALTER COLUMN "restaurantId" SET NOT NULL;
ALTER TABLE "stock_transactions" ADD CONSTRAINT "stock_transactions_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable: suppliers
ALTER TABLE "suppliers" ADD COLUMN "restaurantId" TEXT;
UPDATE "suppliers" SET "restaurantId" = 'clrestaurant00000000000001';
ALTER TABLE "suppliers" ALTER COLUMN "restaurantId" SET NOT NULL;
DROP INDEX IF EXISTS "suppliers_name_key";
CREATE UNIQUE INDEX "suppliers_restaurantId_name_key" ON "suppliers"("restaurantId", "name");
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable: purchase_orders
ALTER TABLE "purchase_orders" ADD COLUMN "restaurantId" TEXT;
UPDATE "purchase_orders" SET "restaurantId" = 'clrestaurant00000000000001';
ALTER TABLE "purchase_orders" ALTER COLUMN "restaurantId" SET NOT NULL;
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable: notifications
ALTER TABLE "notifications" ADD COLUMN "restaurantId" TEXT;
UPDATE "notifications" SET "restaurantId" = 'clrestaurant00000000000001';
ALTER TABLE "notifications" ALTER COLUMN "restaurantId" SET NOT NULL;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable: prep_tasks
ALTER TABLE "prep_tasks" ADD COLUMN "restaurantId" TEXT;
UPDATE "prep_tasks" SET "restaurantId" = 'clrestaurant00000000000001';
ALTER TABLE "prep_tasks" ALTER COLUMN "restaurantId" SET NOT NULL;
ALTER TABLE "prep_tasks" ADD CONSTRAINT "prep_tasks_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable: prep_routines
ALTER TABLE "prep_routines" ADD COLUMN "restaurantId" TEXT;
UPDATE "prep_routines" SET "restaurantId" = 'clrestaurant00000000000001';
ALTER TABLE "prep_routines" ALTER COLUMN "restaurantId" SET NOT NULL;
ALTER TABLE "prep_routines" ADD CONSTRAINT "prep_routines_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable: lab_sessions
ALTER TABLE "lab_sessions" ADD COLUMN "restaurantId" TEXT;
UPDATE "lab_sessions" SET "restaurantId" = 'clrestaurant00000000000001';
ALTER TABLE "lab_sessions" ALTER COLUMN "restaurantId" SET NOT NULL;
ALTER TABLE "lab_sessions" ADD CONSTRAINT "lab_sessions_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
