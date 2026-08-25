-- Run read-only before deploying Phase 5A. BLOCKING rows prevent snapshot
-- backfills; REVIEW rows survive via NOT VALID but should be investigated.
SELECT 'BLOCKING' AS severity, 'sale_items_without_product_snapshot_source' AS check_name, COUNT(*) AS issue_count
FROM "SaleItem" AS item
LEFT JOIN "Product" AS product ON product."id" = item."productId"
WHERE product."id" IS NULL OR product."name" IS NULL OR product."sku" IS NULL
UNION ALL
SELECT 'REVIEW', 'legacy_pos_without_cash_session', COUNT(*)
FROM "Sale"
WHERE "channel" = 'POS'
UNION ALL
SELECT 'REVIEW', 'invalid_sale_amounts', COUNT(*)
FROM "Sale"
WHERE "subtotal" < 0 OR "discount" < 0 OR "total" < 0
  OR "total" <> "subtotal" - "discount"
UNION ALL
SELECT 'REVIEW', 'invalid_sale_items', COUNT(*)
FROM "SaleItem"
WHERE "quantity" <= 0 OR "unitPrice" < 0
  OR "subtotal" <> "unitPrice" * "quantity"
UNION ALL
SELECT 'REVIEW', 'invalid_payments', COUNT(*)
FROM "Payment"
WHERE "amount" <= 0
UNION ALL
SELECT 'REVIEW', 'invalid_inventory_movements', COUNT(*)
FROM "InventoryMovement"
WHERE "quantity" <= 0
ORDER BY severity, check_name;
