// Prisma config for migrations. Uses environment variable for the DB URL.
import "dotenv/config";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is not set");

export default {
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  migrate: {
    adapter: {
      provider: "postgresql",
      url: databaseUrl,
    },
  },
};
