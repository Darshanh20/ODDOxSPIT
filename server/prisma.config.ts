// Prisma config for migrations. Uses environment variable for the DB URL.
import "dotenv/config";

export default {
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  migrate: {
    adapter: {
      provider: "postgresql",
      url: process.env.DATABASE_URL,
    },
  },
};
