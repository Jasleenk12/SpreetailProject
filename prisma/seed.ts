import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("password123", 10);

  const alice = await prisma.user.upsert({
    where: { email: "alice@example.com" },
    update: {},
    create: {
      email: "alice@example.com",
      name: "Alice",
      password,
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: "bob@example.com" },
    update: {},
    create: {
      email: "bob@example.com",
      name: "Bob",
      password,
    },
  });

  const charlie = await prisma.user.upsert({
    where: { email: "charlie@example.com" },
    update: {},
    create: {
      email: "charlie@example.com",
      name: "Charlie",
      password,
    },
  });

  const group = await prisma.group.upsert({
    where: { inviteCode: "demo-group-invite" },
    update: {},
    create: {
      name: "Apartment 4B",
      description: "Monthly shared expenses",
      inviteCode: "demo-group-invite",
      createdById: alice.id,
      members: {
        create: [
          { userId: alice.id, role: "admin" },
          { userId: bob.id, role: "member" },
          { userId: charlie.id, role: "member" },
        ],
      },
    },
  });

  const existingExpense = await prisma.expense.findFirst({
    where: { groupId: group.id, description: "Groceries" },
  });

  if (!existingExpense) {
    await prisma.expense.create({
      data: {
        groupId: group.id,
        paidById: alice.id,
        description: "Groceries",
        amount: 90,
        splitType: "EQUAL",
        splits: {
          create: [
            { userId: alice.id, amount: 30 },
            { userId: bob.id, amount: 30 },
            { userId: charlie.id, amount: 30 },
          ],
        },
      },
    });

    await prisma.expense.create({
      data: {
        groupId: group.id,
        paidById: bob.id,
        description: "Electricity Bill",
        amount: 120,
        splitType: "PERCENTAGE",
        splits: {
          create: [
            { userId: alice.id, amount: 48, percentage: 40 },
            { userId: bob.id, amount: 36, percentage: 30 },
            { userId: charlie.id, amount: 36, percentage: 30 },
          ],
        },
      },
    });
  }

  console.log("Seed complete!");
  console.log("Demo accounts (password: password123):");
  console.log("  alice@example.com");
  console.log("  bob@example.com");
  console.log("  charlie@example.com");
  console.log("Demo group invite code: demo-group-invite");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
