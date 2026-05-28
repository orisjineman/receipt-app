-- AlterTable
ALTER TABLE "Receipt" ADD COLUMN     "suggestedCategory" TEXT;

-- CreateTable
CREATE TABLE "Setting" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "monthlyBudget" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);
