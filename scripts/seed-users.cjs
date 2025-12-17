/**
 * Seed script to add production users to the database
 * Run with: node scripts/seed-users.cjs
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const usersToSeed = [
  {
    name: 'Sachin Vadhvana',
    email: 'sales.ex@shreenathjirasayan.com',
    role: 'admin',
    password: 'Cre8ive#2025',
  },
  {
    name: 'Jay Lakhani',
    email: 'jay@shreenathjirasayan.com',
    role: 'admin',
    password: 'Cre8ive#2025',
  },
  {
    name: 'Ashok Lakhani',
    email: 'ashok@shreenathjirasayan.com',
    role: 'admin',
    password: 'Cre8ive#2025',
  },
  {
    name: 'Rajeev Sharma',
    email: 'mktg@shreenathjirasayan.com',
    role: 'user',
    password: 'Cre8ive#2025',
  },
];

async function main() {
  console.log('Starting user seed...');

  for (const userData of usersToSeed) {
    try {
      const passwordHash = await bcrypt.hash(userData.password, 12);
      const firebaseUid = `seed-${Buffer.from(userData.email).toString('base64')}`;

      const user = await prisma.user.upsert({
        where: { email: userData.email },
        update: {
          name: userData.name,
          role: userData.role,
          passwordHash,
        },
        create: {
          email: userData.email,
          firebaseUid,
          name: userData.name,
          role: userData.role,
          passwordHash,
        },
      });

      console.log(`✓ ${userData.name} (${userData.email}) - ${userData.role}`);
    } catch (error) {
      console.error(`✗ Failed to seed ${userData.email}:`, error.message);
    }
  }

  console.log('User seed completed!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

