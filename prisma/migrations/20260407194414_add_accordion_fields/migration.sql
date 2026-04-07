/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `NewsletterSubscriber` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "details" TEXT,
ADD COLUMN     "howToUse" TEXT,
ADD COLUMN     "shippingInfo" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_email_key" ON "NewsletterSubscriber"("email");
