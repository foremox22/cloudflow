-- CreateEnum
CREATE TYPE "PrepTaskType" AS ENUM ('ROUTINE', 'URGENT');

-- CreateEnum
CREATE TYPE "PrepStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'DONE', 'CANCELLED');

-- AlterTable
ALTER TABLE "ingredients" ADD COLUMN     "batchYield" DOUBLE PRECISION,
ADD COLUMN     "prepRecipeId" TEXT;

-- CreateTable
CREATE TABLE "prep_tasks" (
    "id" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "type" "PrepTaskType" NOT NULL DEFAULT 'ROUTINE',
    "status" "PrepStatus" NOT NULL DEFAULT 'PENDING',
    "targetQty" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "scheduledFor" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prep_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prep_routines" (
    "id" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "targetQty" DOUBLE PRECISION NOT NULL,
    "daysOfWeek" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5]::INTEGER[],
    "triggerTime" TEXT NOT NULL DEFAULT '08:00',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prep_routines_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_prepRecipeId_fkey" FOREIGN KEY ("prepRecipeId") REFERENCES "recipes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prep_tasks" ADD CONSTRAINT "prep_tasks_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prep_tasks" ADD CONSTRAINT "prep_tasks_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prep_routines" ADD CONSTRAINT "prep_routines_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
