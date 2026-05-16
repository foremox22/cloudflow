-- Add CENTRAL_KITCHEN to RestaurantType enum
ALTER TYPE "RestaurantType" ADD VALUE 'CENTRAL_KITCHEN';

-- Create DistributionStatus enum
CREATE TYPE "DistributionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'DISPATCHED', 'RECEIVED', 'CANCELLED');

-- Create central_kitchen_links
CREATE TABLE "central_kitchen_links" (
  "centralKitchenId"   TEXT NOT NULL,
  "linkedRestaurantId" TEXT NOT NULL,
  "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "central_kitchen_links_pkey" PRIMARY KEY ("centralKitchenId", "linkedRestaurantId")
);

ALTER TABLE "central_kitchen_links"
  ADD CONSTRAINT "central_kitchen_links_centralKitchenId_fkey"
  FOREIGN KEY ("centralKitchenId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "central_kitchen_links"
  ADD CONSTRAINT "central_kitchen_links_linkedRestaurantId_fkey"
  FOREIGN KEY ("linkedRestaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create distribution_requests
CREATE TABLE "distribution_requests" (
  "id"               TEXT NOT NULL,
  "fromRestaurantId" TEXT NOT NULL,
  "centralKitchenId" TEXT NOT NULL,
  "status"           "DistributionStatus" NOT NULL DEFAULT 'DRAFT',
  "neededBy"         TIMESTAMP(3),
  "notes"            TEXT,
  "createdById"      TEXT NOT NULL,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "distribution_requests_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "distribution_requests"
  ADD CONSTRAINT "distribution_requests_fromRestaurantId_fkey"
  FOREIGN KEY ("fromRestaurantId") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "distribution_requests"
  ADD CONSTRAINT "distribution_requests_centralKitchenId_fkey"
  FOREIGN KEY ("centralKitchenId") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "distribution_requests"
  ADD CONSTRAINT "distribution_requests_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Create distribution_items
CREATE TABLE "distribution_items" (
  "id"             TEXT NOT NULL,
  "requestId"      TEXT NOT NULL,
  "ckIngredientId" TEXT NOT NULL,
  "ingredientName" TEXT NOT NULL,
  "unit"           "Unit" NOT NULL DEFAULT 'KG',
  "requestedQty"   DOUBLE PRECISION NOT NULL,
  "approvedQty"    DOUBLE PRECISION,
  "dispatchedQty"  DOUBLE PRECISION,
  "receivedQty"    DOUBLE PRECISION,
  CONSTRAINT "distribution_items_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "distribution_items"
  ADD CONSTRAINT "distribution_items_requestId_fkey"
  FOREIGN KEY ("requestId") REFERENCES "distribution_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "distribution_items"
  ADD CONSTRAINT "distribution_items_ckIngredientId_fkey"
  FOREIGN KEY ("ckIngredientId") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
