-- AlterEnum
ALTER TYPE "OrderItemStatus" ADD VALUE 'VOID';

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "voidReason" TEXT;
