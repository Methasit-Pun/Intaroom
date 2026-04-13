import { PrismaClient } from "@prisma/client"

// Prevent multiple PrismaClient instances in Next.js hot-reload (dev mode).
// In production a new instance is created once per serverless function cold start.

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}
