import { PrismaClient } from "@prisma/client";

let global = {};

const prisma = global.prisma || new PrismaClient();

if (process.env.NODE_ENV === "production") global.prisma = prisma;

export default prisma;
