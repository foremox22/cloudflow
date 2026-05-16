-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "specialRequests" TEXT[] DEFAULT ARRAY[]::TEXT[];
