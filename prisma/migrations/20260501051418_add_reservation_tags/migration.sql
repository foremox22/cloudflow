-- AlterTable
ALTER TABLE "reservations" ADD COLUMN     "allergenTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "dietaryTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "specialTags" TEXT[] DEFAULT ARRAY[]::TEXT[];
