import { PrismaClient } from "@prisma/client";
import { bootstrapPlatformAdmin } from "./seed-platform-admin";

const prisma = new PrismaClient();

bootstrapPlatformAdmin(prisma, process.env)
  .then(() => console.log("Platform administrator bootstrap complete."))
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
