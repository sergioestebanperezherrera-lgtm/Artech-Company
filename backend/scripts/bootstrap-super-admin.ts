import "dotenv/config";
import { prisma } from "../src/config/prisma";
import { bootstrapFirstSuperAdminByEmail } from "../src/modules/admin/admin.bootstrap";
import { validateProductionBootstrapRequest } from "./bootstrap-super-admin.guard";

async function main() {
  const { email } = validateProductionBootstrapRequest(
    process.argv.slice(2),
    process.env,
  );
  const result = await bootstrapFirstSuperAdminByEmail(prisma, email);

  console.log(
    `${result.role} ${result.created ? "granted to" : "already assigned to"} ${result.email}.`,
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Bootstrap failed.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
