-- CreateEnum
CREATE TYPE "RestaurantType" AS ENUM ('CAFE', 'DINE_IN', 'TAKEAWAY');

-- AlterTable
ALTER TABLE "restaurants" ADD COLUMN "type" "RestaurantType" NOT NULL DEFAULT 'DINE_IN';
