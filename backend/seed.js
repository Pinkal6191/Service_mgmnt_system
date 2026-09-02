const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  await prisma.user.upsert({
    where: { email: 'admin@fsm.com' },
    update: {},
    create: {
      email: 'admin@fsm.com',
      password_hash: hashedPassword,
      full_name: 'Master Admin',
      phone: '1234567890',
      role: 'MASTER_ADMIN'
    }
  });

  console.log('Seed completed: Master Admin created. (admin@fsm.com / admin123)');
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
