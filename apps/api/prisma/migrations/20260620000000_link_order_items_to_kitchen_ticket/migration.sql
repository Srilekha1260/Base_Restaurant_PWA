-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "kitchenTicketId" TEXT;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_kitchenTicketId_fkey" FOREIGN KEY ("kitchenTicketId") REFERENCES "kitchen_tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: for existing orders that have exactly one kitchen ticket, link all
-- of that order's items to it (unambiguous). Orders with multiple legacy tickets
-- are left null and should be re-seeded.
UPDATE "order_items" oi
SET "kitchenTicketId" = kt."id"
FROM "kitchen_tickets" kt
WHERE kt."orderId" = oi."orderId"
  AND oi."kitchenTicketId" IS NULL
  AND (SELECT COUNT(*) FROM "kitchen_tickets" k2 WHERE k2."orderId" = oi."orderId") = 1;
