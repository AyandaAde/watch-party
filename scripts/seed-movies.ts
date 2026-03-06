import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const demoMovies = [
  {
    title: 'Big Buck Bunny',
    blobUrl: 'https://commondatastorage.googleapis.com/gtv-videos-library/sample/BigBuckBunny.mp4',
    duration: 596,
    uploadedBy: 'system',
    isDemo: true,
    size: 305000000,
  },
  {
    title: 'Elephants Dream',
    blobUrl: 'https://commondatastorage.googleapis.com/gtv-videos-library/sample/ElephantsDream.mp4',
    duration: 654,
    uploadedBy: 'system',
    isDemo: true,
    size: 200000000,
  },
  {
    title: 'For Bigger Blazes',
    blobUrl: 'https://commondatastorage.googleapis.com/gtv-videos-library/sample/ForBiggerBlazes.mp4',
    duration: 15,
    uploadedBy: 'system',
    isDemo: true,
    size: 100000000,
  },
  {
    title: 'Sintel',
    blobUrl: 'https://commondatastorage.googleapis.com/gtv-videos-library/sample/Sintel.mp4',
    duration: 888,
    uploadedBy: 'system',
    isDemo: true,
    size: 400000000,
  },
];

async function main() {
  console.log('Seeding demo movies...');

  for (const movie of demoMovies) {
    const existing = await prisma.movie.findFirst({
      where: { title: movie.title },
    });

    if (!existing) {
      await prisma.movie.create({
        data: movie,
      });
      console.log(`Created movie: ${movie.title}`);
    } else {
      console.log(`Movie already exists: ${movie.title}`);
    }
  }

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
