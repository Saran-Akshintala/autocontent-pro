const { PrismaClient } = require('@prisma/client');

async function debugDatabase() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Debugging database contents...\n');

    // Check tenants
    const tenants = await prisma.tenant.findMany();
    console.log('Tenants:');
    tenants.forEach(t => console.log(`  - ${t.id}: ${t.name}`));

    // Check posts
    const posts = await prisma.post.findMany({
      include: {
        brand: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    console.log('\nPosts:');
    posts.forEach(p => console.log(`  - ${p.id}: ${p.title} (tenant: ${p.tenantId}, brand: ${p.brand?.name})`));

    // Check brands
    const brands = await prisma.brand.findMany();
    console.log('\nBrands:');
    brands.forEach(b => console.log(`  - ${b.id}: ${b.name} (tenant: ${b.tenantId})`));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugDatabase();
