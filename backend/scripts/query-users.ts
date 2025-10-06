import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      isBot: true,
      totalGames: true,
      totalWins: true
    }
  });
  
  console.log(JSON.stringify(users, null, 2));
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => {
    console.error(e);
    prisma.$disconnect();
  });
