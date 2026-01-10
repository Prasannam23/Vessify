import prisma from "../db/prisma";
import bcrypt from "bcryptjs";
import { Decimal } from "@prisma/client/runtime/library";

async function seed() {
  console.log("🌱 Seeding database...");

  try {
    // Create test organizations
    const org1 = await prisma.organization.upsert({
      where: { slug: "test-org-1" },
      update: {},
      create: {
        name: "Test Organization 1",
        slug: "test-org-1",
        description: "First test organization",
      },
    });

    const org2 = await prisma.organization.upsert({
      where: { slug: "test-org-2" },
      update: {},
      create: {
        name: "Test Organization 2",
        slug: "test-org-2",
        description: "Second test organization",
      },
    });

    // Create test users
    const hashed1 = await bcrypt.hash("password123", 10);
    const user1 = await prisma.user.upsert({
      where: { email: "testuser1@example.com" },
      update: {},
      create: {
        email: "testuser1@example.com",
        name: "Test User 1",
        emailVerified: true,
        password: hashed1,
      },
    });

    const hashed2 = await bcrypt.hash("password123", 10);
    const user2 = await prisma.user.upsert({
      where: { email: "testuser2@example.com" },
      update: {},
      create: {
        email: "testuser2@example.com",
        name: "Test User 2",
        emailVerified: true,
        password: hashed2,
      },
    });

    // Add users to organizations
    await prisma.organizationMember.upsert({
      where: {
        userId_organizationId: {
          userId: user1.id,
          organizationId: org1.id,
        },
      },
      update: {},
      create: {
        userId: user1.id,
        organizationId: org1.id,
        role: "owner",
      },
    });

    await prisma.organizationMember.upsert({
      where: {
        userId_organizationId: {
          userId: user2.id,
          organizationId: org2.id,
        },
      },
      update: {},
      create: {
        userId: user2.id,
        organizationId: org2.id,
        role: "owner",
      },
    });

    // Create sample transactions for user1/org1
    await prisma.transaction.create({
      data: {
        userId: user1.id,
        organizationId: org1.id,
        date: new Date(2025, 11, 11),
        description: "STARBUCKS COFFEE MUMBAI",
        amount: new Decimal("420.00"),
        type: "debit",
        category: "food",
        balance: new Decimal("18420.50"),
        confidence: 0.95,
        rawText: "Date: 11 Dec 2025\nDescription: STARBUCKS COFFEE MUMBAI\nAmount: -420.00\nBalance after transaction: 18,420.50",
      },
    });

    await prisma.transaction.create({
      data: {
        userId: user1.id,
        organizationId: org1.id,
        date: new Date(2025, 11, 12),
        description: "Uber Ride * Airport Drop",
        amount: new Decimal("1250.00"),
        type: "debit",
        category: "transport",
        balance: new Decimal("17170.50"),
        confidence: 0.9,
        rawText: "Uber Ride * Airport Drop\n12/11/2025 → ₹1,250.00 debited\nAvailable Balance → ₹17,170.50",
      },
    });

    await prisma.transaction.create({
      data: {
        userId: user1.id,
        organizationId: org1.id,
        date: new Date(2025, 11, 10),
        description: "Amazon.in Order #403-1234567-8901234",
        amount: new Decimal("2999.00"),
        type: "debit",
        category: "shopping",
        balance: new Decimal("14171.50"),
        confidence: 0.88,
        rawText: "txn123 2025-12-10 Amazon.in Order #403-1234567-8901234 ₹2,999.00 Dr Bal 14171.50 Shopping",
      },
    });

    console.log("✅ Seed completed successfully!");
    console.log("📋 Test Users:");
    console.log(`   - Email: testuser1@example.com / password123 (Organization: ${org1.name})`);
    console.log(`   - Email: testuser2@example.com / password123 (Organization: ${org2.name})`);
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }
}

seed().then(() => {
  prisma.$disconnect();
});
