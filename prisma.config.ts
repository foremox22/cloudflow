import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Use DIRECT_URL (session pooler, port 5432) for migrate — transaction
    // pooler (port 6543) hangs on DDL statements. Runtime client in db.ts
    // uses DATABASE_URL directly via PrismaPg adapter, unaffected by this.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/rms_db",
  },
});
