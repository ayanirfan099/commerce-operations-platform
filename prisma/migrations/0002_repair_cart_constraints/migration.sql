-- The application retrieves authenticated and guest carts through findUnique.
-- PostgreSQL permits multiple NULL values in a unique index, so users without
-- carts and non-guest carts remain valid.

-- CreateIndex
CREATE UNIQUE INDEX "Cart_userId_key" ON "Cart"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Cart_sessionId_key" ON "Cart"("sessionId");
