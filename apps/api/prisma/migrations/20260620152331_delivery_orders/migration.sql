-- AlterEnum
ALTER TYPE "OrderType" ADD VALUE 'DELIVERY';

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "customerAddress" TEXT;
