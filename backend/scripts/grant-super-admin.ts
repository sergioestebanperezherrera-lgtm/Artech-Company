import "dotenv/config";
import { prisma } from "../src/config/prisma";
import { grantSuperAdminByEmail } from "../src/modules/admin/admin.grant";

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "This development grant script is disabled when NODE_ENV=production.",
    );
  }

  const email = process.argv[2];

  if (!email) {
    throw new Error("Usage: npm run admin:grant -- <existing-user-email>");
  }

  const result = await grantSuperAdminByEmail(prisma, email);
  console.log(
    `${result.role} ${result.created ? "granted to" : "already assigned to"} ${result.email}.`,
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
