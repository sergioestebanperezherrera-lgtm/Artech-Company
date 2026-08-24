import "dotenv/config";
import { prisma } from "../src/config/prisma";
import { seedRbac } from "../prisma/seed-rbac";

async function main() {
  const result = await seedRbac(prisma);
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
