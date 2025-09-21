import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  try {
    // Create demo tenant
    console.log('Creating demo tenant...');
    const tenant = await prisma.tenant.upsert({
      where: { id: 'demo-tenant' },
      update: {},
      create: {
        id: 'demo-tenant',
        name: 'Demo Company',
        plan: 'PROFESSIONAL',
        whatsappMode: 'ADVANCED',
      },
    });

    console.log(`✅ Created tenant: ${tenant.name}`);

    // Create owner user
    console.log('Creating owner user...');
    const hashedPassword = await argon2.hash('Pass@123');
    
    const user = await prisma.user.upsert({
      where: { email: 'owner@demo.io' },
      update: {},
      create: {
        email: 'owner@demo.io',
        password: hashedPassword,
        firstName: 'Demo',
        lastName: 'Owner',
      },
    });

    console.log(`✅ Created user: ${user.email}`);

    // Create user-tenant relationship
    console.log('Creating user-tenant relationship...');
    const userTenant = await prisma.userTenant.upsert({
      where: {
        userId_tenantId: {
          userId: user.id,
          tenantId: tenant.id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        tenantId: tenant.id,
        role: 'OWNER',
      },
    });

    console.log(`✅ Created user-tenant relationship with role: ${userTenant.role}`);

    // Create multiple demo brands
    console.log('Creating demo brands...');
    
    const brandsData = [
      {
        id: 'techstartup-brand',
        name: 'TechStartup Co',
        timezone: 'America/Los_Angeles',
        colors: { primary: '#6366F1', secondary: '#8B5CF6', accent: '#EC4899', neutral: '#6B7280' },
        fonts: { heading: 'Inter', body: 'Inter', accent: 'Poppins' },
        logoUrl: 'https://via.placeholder.com/200x80/6366F1/FFFFFF?text=TechStartup'
      },
      {
        id: 'ecommerce-brand',
        name: 'ShopSmart',
        timezone: 'America/New_York',
        colors: { primary: '#059669', secondary: '#10B981', accent: '#F59E0B', neutral: '#6B7280' },
        fonts: { heading: 'Poppins', body: 'Inter', accent: 'Playfair Display' },
        logoUrl: 'https://via.placeholder.com/200x80/059669/FFFFFF?text=ShopSmart'
      },
      {
        id: 'fitness-brand',
        name: 'FitLife Studio',
        timezone: 'America/Chicago',
        colors: { primary: '#DC2626', secondary: '#EF4444', accent: '#F97316', neutral: '#6B7280' },
        fonts: { heading: 'Montserrat', body: 'Inter', accent: 'Oswald' },
        logoUrl: 'https://via.placeholder.com/200x80/DC2626/FFFFFF?text=FitLife'
      },
      {
        id: 'restaurant-brand',
        name: 'Bella Vista Restaurant',
        timezone: 'Europe/Rome',
        colors: { primary: '#92400E', secondary: '#D97706', accent: '#DC2626', neutral: '#6B7280' },
        fonts: { heading: 'Playfair Display', body: 'Inter', accent: 'Dancing Script' },
        logoUrl: 'https://via.placeholder.com/200x80/92400E/FFFFFF?text=BellaVista'
      },
      {
        id: 'consulting-brand',
        name: 'Strategic Solutions',
        timezone: 'America/New_York',
        colors: { primary: '#1E40AF', secondary: '#3B82F6', accent: '#6366F1', neutral: '#6B7280' },
        fonts: { heading: 'Inter', body: 'Inter', accent: 'Merriweather' },
        logoUrl: 'https://via.placeholder.com/200x80/1E40AF/FFFFFF?text=Strategic'
      }
    ];

    const brands: any[] = [];
    for (const brandData of brandsData) {
      const brand = await prisma.brand.upsert({
        where: { id: brandData.id },
        update: {},
        create: {
          id: brandData.id,
          tenantId: tenant.id,
          name: brandData.name,
          timezone: brandData.timezone,
        },
      });

      // Create brand kit for each brand
      await prisma.brandKit.upsert({
        where: { brandId: brand.id },
        update: {},
        create: {
          brandId: brand.id,
          colors: brandData.colors,
          fonts: brandData.fonts,
          logoUrl: brandData.logoUrl,
        },
      });

      brands.push(brand);
      console.log(`✅ Created brand: ${brand.name}`);
    }

    // Use the first brand for sample posts
    const primaryBrand = brands[0];

    // Create sample posts
    console.log('Creating sample posts...');
    const posts = await Promise.all([
      prisma.post.create({
        data: {
          tenantId: tenant.id,
          brandId: primaryBrand.id,
          title: 'Welcome to AutoContent Pro!',
          content: {
            hook: 'We are excited to announce the launch of AutoContent Pro! 🚀',
            body: 'Your next-generation social media automation platform is here. Streamline your content creation, scheduling, and analytics all in one place.',
            hashtags: ['#AutoContent', '#SocialMedia', '#Automation', '#Launch'],
            platforms: ['INSTAGRAM', 'LINKEDIN', 'TWITTER']
          },
          status: 'PUBLISHED',
          publishedAt: new Date(),
        },
      }),
      prisma.post.create({
        data: {
          tenantId: tenant.id,
          brandId: primaryBrand.id,
          title: 'Tips for Better Social Media Engagement',
          content: {
            hook: '5 proven strategies to boost your social media engagement 📈',
            body: '1. Post consistently\n2. Use relevant hashtags\n3. Engage with your audience\n4. Share valuable content\n5. Analyze your performance\n\nWhich tip will you try first?',
            hashtags: ['#SocialMediaTips', '#Engagement', '#Marketing', '#Strategy'],
            platforms: ['INSTAGRAM', 'FACEBOOK', 'LINKEDIN']
          },
          status: 'SCHEDULED',
        },
      }),
      prisma.post.create({
        data: {
          tenantId: tenant.id,
          brandId: primaryBrand.id,
          title: 'Behind the Scenes: Our Development Process',
          content: {
            hook: 'Take a look behind the scenes at AutoContent Pro development 👨‍💻',
            body: 'Our team is passionate about creating the best social media automation tools for businesses of all sizes. From ideation to deployment, every feature is crafted with care.',
            hashtags: ['#BehindTheScenes', '#Development', '#TeamWork', '#Tech'],
            platforms: ['LINKEDIN', 'TWITTER']
          },
          status: 'DRAFT',
        },
      }),
    ]);

    console.log(`✅ Created ${posts.length} sample posts`);

    // Create sample WhatsApp session
    console.log('Creating WhatsApp session...');
    const whatsappSession = await prisma.whatsAppSession.create({
      data: {
        tenantId: tenant.id,
        sessionId: `demo-session-${Date.now()}`,
        isActive: false,
        metadata: {
          clientInfo: {
            platform: 'demo',
            version: '1.0.0',
          },
        },
      },
    });

    console.log(`✅ Created WhatsApp session: ${whatsappSession.sessionId}`);

    // Create sample analytics data
    console.log('Creating sample analytics...');
    const analytics = await Promise.all(
      posts.slice(0, 2).map((post, index) =>
        prisma.postAnalytics.create({
          data: {
            postId: post.id,
            channelType: index === 0 ? 'FACEBOOK' : 'INSTAGRAM',
            impressions: Math.floor(Math.random() * 1000) + 100,
            reach: Math.floor(Math.random() * 800) + 80,
            engagement: Math.floor(Math.random() * 100) + 10,
            clicks: Math.floor(Math.random() * 50) + 5,
            shares: Math.floor(Math.random() * 20) + 1,
            comments: Math.floor(Math.random() * 15) + 1,
            likes: Math.floor(Math.random() * 80) + 10,
            recordedAt: new Date(),
          },
        })
      )
    );

    console.log(`✅ Created ${analytics.length} analytics records`);

    console.log('\n🎉 Database seeded successfully!');
    console.log('\n📊 Summary:');
    console.log(`- Tenant: ${tenant.name} (${tenant.plan})`);
    console.log(`- User: ${user.email} (${userTenant.role})`);
    console.log(`- Brands: ${brands.length} created`);
    console.log(`- Posts: ${posts.length}`);
    console.log(`- WhatsApp Session: ${whatsappSession.sessionId}`);
    console.log(`- Analytics: ${analytics.length} records`);
    console.log('\n🔑 Login Credentials:');
    console.log(`Email: owner@demo.io`);
    console.log(`Password: Pass@123`);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
