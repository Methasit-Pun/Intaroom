import path from "path"
import { defineConfig } from "prisma/config"

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  datasource: {
    url: process.env.DIRECT_URL ?? "postgresql://dummy:dummy@localhost:5432/dummy",
  },
})
