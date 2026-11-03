import { PrismaClient, UserRole, DiscountType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // ---- Users (fictional) ----
  const admin = await prisma.user.upsert({
    where: { email: "admin@example.test" },
    update: {},
    create: {
      email: "admin@example.test",
      name: "Store Administrator",
      role: UserRole.ADMIN,
      passwordHash: "admin-password-hash-placeholder",
    },
  });

  await prisma.user.upsert({
    where: { email: "buyer@example.test" },
    update: {},
    create: {
      email: "buyer@example.test",
      name: "Alex Buyer",
      role: UserRole.CUSTOMER,
      passwordHash: "buyer-password-hash-placeholder",
    },
  });

  // ---- Categories ----
  const homeLiving = await prisma.category.create({
    data: {
      name: "Home & Living",
      slug: "home-living",
      description: "Fictional goods for the home.",
    },
  });

  const kitchen = await prisma.category.create({
    data: {
      name: "Kitchen",
      slug: "kitchen",
      description: "Fictional kitchen essentials.",
    },
  });

  await prisma.category.create({
    data: {
      name: "Apparel",
      slug: "apparel",
      description: "Fictional clothing.",
      parentId: homeLiving.id,
    },
  });

  // ---- Products, variants, prices, inventory ----
  const products = [
    {
      name: "Ceramic Mug",
      slug: "ceramic-mug",
      categorySlug: "kitchen",
      description: "A fictional hand-thrown ceramic mug.",
      variants: [
        { sku: "MUG-001", name: "White", price: 1200, quantity: 24 },
        { sku: "MUG-002", name: "Navy", price: 1200, quantity: 18 },
      ],
    },
    {
      name: "Linen Throw",
      slug: "linen-throw",
      categorySlug: "home-living",
      description: "A fictional woven linen throw blanket.",
      variants: [
        { sku: "THROW-001", name: "Sand", price: 4800, quantity: 12 },
        { sku: "THROW-002", name: "Slate", price: 4800, quantity: 6 },
      ],
    },
    {
      name: "Olive Wood Board",
      slug: "olive-wood-board",
      categorySlug: "kitchen",
      description: "A fictional olive-wood cutting board.",
      variants: [
        { sku: "BOARD-001", name: "Small", price: 3200, quantity: 8 },
        { sku: "BOARD-002", name: "Large", price: 5400, quantity: 3 },
      ],
    },
    {
      name: "Cotton T-Shirt",
      slug: "cotton-t-shirt",
      categorySlug: "apparel",
      description: "A fictional organic-cotton t-shirt.",
      variants: [
        { sku: "TSHIRT-001", name: "M / White", price: 2400, quantity: 30 },
        { sku: "TSHIRT-002", name: "L / Black", price: 2400, quantity: 2 },
      ],
    },
  ];

  for (const p of products) {
    const category = await prisma.category.findFirst({
      where: { slug: p.categorySlug },
    });
    if (!category) continue;

    const product = await prisma.product.create({
      data: {
        name: p.name,
        slug: p.slug,
        description: p.description,
        sku: p.slug.toUpperCase(),
        categoryId: category.id,
        isActive: true,
      },
    });

    for (const v of p.variants) {
      const variant = await prisma.productVariant.create({
        data: {
          productId: product.id,
          sku: v.sku,
          name: v.name,
          isActive: true,
        },
      });

      await prisma.price.create({
        data: {
          variantId: variant.id,
          amount: v.price,
          currency: "usd",
        },
      });

      const location = await prisma.inventoryLocation.create({
        data: {
          variantId: variant.id,
          name: "Main Warehouse",
          quantity: v.quantity,
          reserved: 0,
          lowStockThreshold: 5,
        },
      });

      await prisma.inventoryLedgerEntry.create({
        data: {
          locationId: location.id,
          variantId: variant.id,
          change: v.quantity,
          reason: "restock",
          actorId: admin.id,
        },
      });
    }
  }

  // ---- Discount codes (bounded v1) ----
  await prisma.discountCode.upsert({
    where: { code: "WELCOME10" },
    update: {},
    create: {
      code: "WELCOME10",
      type: DiscountType.PERCENTAGE,
      value: 10,
      minSubtotal: 0,
      usageLimit: 100,
      validFrom: new Date("2024-01-01"),
      validTo: new Date("2026-12-31"),
      isActive: true,
    },
  });

  console.log("Seed complete.");
  console.log("Admin:", admin.email);
  console.log("Customer: buyer@example.test");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
