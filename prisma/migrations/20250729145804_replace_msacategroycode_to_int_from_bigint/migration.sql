/*
  Warnings:

  - You are about to alter the column `msaCategoryCode` on the `Products` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.

*/
-- AlterTable
ALTER TABLE "Products" ALTER COLUMN "msaCategoryCode" SET DATA TYPE INTEGER;
