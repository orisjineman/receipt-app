-- AlterTable
ALTER TABLE "Receipt" ADD COLUMN     "categoryId" TEXT;

-- CreateIndex
CREATE INDEX "Receipt_categoryId_idx" ON "Receipt"("categoryId");

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
