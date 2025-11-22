const { PrismaClient } = require('@prisma/client');

// Create a single PrismaClient instance and reuse it across the app
const prisma = global.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

module.exports = prisma;
