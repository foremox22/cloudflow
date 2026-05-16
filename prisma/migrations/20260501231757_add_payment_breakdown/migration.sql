-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "cardPaid" DOUBLE PRECISION,
ADD COLUMN     "cashPaid" DOUBLE PRECISION,
ADD COLUMN     "voucherCode" TEXT,
ADD COLUMN     "voucherPaid" DOUBLE PRECISION;
