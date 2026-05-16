-- AlterTable
ALTER TABLE "recipes" ADD COLUMN     "dietaryTags" TEXT[] DEFAULT ARRAY[]::TEXT[];
