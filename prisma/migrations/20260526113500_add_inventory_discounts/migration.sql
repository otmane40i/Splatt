ALTER TABLE "Product" ADD COLUMN "stockQuantity" INTEGER;
ALTER TABLE "Product" ADD COLUMN "bundleQuantity" INTEGER;
ALTER TABLE "Product" ADD COLUMN "bundlePrice" INTEGER;

CREATE TABLE "DiscountCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "minTotal" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "usageLimit" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "DiscountCode_code_key" ON "DiscountCode"("code");
