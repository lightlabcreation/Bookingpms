const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Create admin user
  const adminPassword = await bcrypt.hash('Admin@123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@bookingpms.com' },
    update: {},
    create: {
      email: 'admin@bookingpms.com',
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      isActive: true
    }
  });
  console.log('Created admin user:', admin.email);

  // Create demo user
  const userPassword = await bcrypt.hash('User@123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'user@bookingpms.com' },
    update: {},
    create: {
      email: 'user@bookingpms.com',
      password: userPassword,
      firstName: 'Demo',
      lastName: 'User',
      role: 'USER',
      isActive: true
    }
  });
  console.log('Created demo user:', user.email);

  // Create sample resources
  const resources = [
    {
      name: 'Conference Room A',
      description: 'Large conference room with projector and whiteboard. Ideal for team meetings and presentations.',
      type: 'Meeting Room',
      capacity: 20,
      pricePerHour: 50.00,
      status: 'AVAILABLE',
      imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800'
    },
    {
      name: 'Conference Room B',
      description: 'Medium-sized meeting room with video conferencing capabilities.',
      type: 'Meeting Room',
      capacity: 10,
      pricePerHour: 35.00,
      status: 'AVAILABLE',
      imageUrl: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800'
    },
    {
      name: 'Private Office 1',
      description: 'Private office space for focused work. Includes desk, chair, and fast WiFi.',
      type: 'Office',
      capacity: 2,
      pricePerHour: 25.00,
      status: 'AVAILABLE',
      imageUrl: 'https://images.unsplash.com/photo-1497215842964-222b430dc094?w=800'
    },
    {
      name: 'Hot Desk Area',
      description: 'Open workspace with flexible seating. Perfect for co-working.',
      type: 'Workspace',
      capacity: 30,
      pricePerHour: 10.00,
      status: 'AVAILABLE',
      imageUrl: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800'
    },
    {
      name: 'Training Room',
      description: 'Large training room with 30 computer stations. Ideal for workshops and training sessions.',
      type: 'Training',
      capacity: 30,
      pricePerHour: 100.00,
      status: 'AVAILABLE',
      imageUrl: 'https://images.unsplash.com/photo-1540553016722-983e48a2cd10?w=800'
    },
    {
      name: 'Event Hall',
      description: 'Spacious event hall for conferences, seminars, and corporate events.',
      type: 'Event Space',
      capacity: 100,
      pricePerHour: 200.00,
      status: 'AVAILABLE',
      imageUrl: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=800'
    },
    {
      name: 'Podcast Studio',
      description: 'Professional podcast recording studio with soundproofing and equipment.',
      type: 'Studio',
      capacity: 4,
      pricePerHour: 75.00,
      status: 'AVAILABLE',
      imageUrl: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800'
    },
    {
      name: 'Photography Studio',
      description: 'Professional photography studio with lighting equipment and backdrops.',
      type: 'Studio',
      capacity: 6,
      pricePerHour: 80.00,
      status: 'AVAILABLE',
      imageUrl: 'https://images.unsplash.com/photo-1471341971476-ae15ff5dd4ea?w=800'
    }
  ];

  for (const resource of resources) {
    await prisma.resource.upsert({
      where: { id: resource.name.replace(/\s/g, '-').toLowerCase() },
      update: resource,
      create: resource
    });
  }
  console.log(`Created ${resources.length} sample resources`);

  // Create welcome notification for admin
  await prisma.notification.create({
    data: {
      userId: admin.id,
      title: 'Welcome to BookingPMS!',
      message: 'Welcome to the BookingPMS admin panel. You can manage resources, users, and view analytics from here.',
      isRead: false
    }
  });

  // Create welcome notification for user
  await prisma.notification.create({
    data: {
      userId: user.id,
      title: 'Welcome to BookingPMS!',
      message: 'Welcome to BookingPMS! Browse our resources and make your first booking.',
      isRead: false
    }
  });
  console.log('Created welcome notifications');

  // Create initial settings
  const settings = [
    { key: 'siteName', value: 'BookingPMS' },
    { key: 'siteDescription', value: 'Resource & Booking Management System' },
    { key: 'currency', value: 'USD' },
    { key: 'timezone', value: 'America/New_York' },
    { key: 'bookingMinHours', value: '1' },
    { key: 'bookingMaxHours', value: '8' },
    { key: 'bookingAdvanceDays', value: '30' },
    { key: 'emailNotifications', value: 'true' },
    { key: 'smsNotifications', value: 'false' }
  ];

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting
    });
  }
  console.log('Created initial settings');

  console.log('\n✅ Database seeded successfully!');
  console.log('\nDefault credentials:');
  console.log('─────────────────────');
  console.log('Admin: admin@bookingpms.com / Admin@123');
  console.log('User:  user@bookingpms.com / User@123');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
