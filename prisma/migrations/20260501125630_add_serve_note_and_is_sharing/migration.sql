-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "isSharing" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "serveNote" TEXT;
