import { test, expect } from "@playwright/test";

test("full fake-provider checkout journey", async ({ page }) => {
  // Navigate to the catalogue.
  await page.goto("/catalog");
  await expect(page.locator("h1")).toContainText("Catalogue");

  // Click into a product.
  await page.locator("article").first().click();
  await expect(page.locator("h1")).toBeVisible();

  // Add to cart.
  await page.locator('button:has-text("Add to cart")').click();

  // Go to cart.
  await page.locator('a:has-text("Cart")').click();
  await expect(page.locator("h1")).toContainText("Your cart");

  // Proceed to checkout (requires sign in).
  await page.locator('a:has-text("Proceed to checkout")').click();
  await expect(page.locator("h1")).toContainText("Sign in");

  // Sign in with the seeded customer.
  await page.locator('input[name="email"]').fill("buyer@example.test");
  await page.locator('input[name="password"]').fill("buyer-password-hash-placeholder");
  await page.locator('button:has-text("Sign in")').click();

  // Should be back on checkout review.
  await expect(page.locator("h1")).toContainText("Checkout review");

  // Place order.
  await page.locator('button:has-text("Place order")').click();

  // Should see order confirmation.
  await expect(page.locator("h1")).toContainText("Order confirmation");
  await expect(page.locator(".badge")).toContainText("PENDING_PAYMENT");
});
