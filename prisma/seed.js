const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Clear existing data
  await prisma.auditLog.deleteMany();
  await prisma.messageLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.resourceBlock.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.user.deleteMany();
  await prisma.setting.deleteMany();

  console.log('Cleared existing data');

  // Create Admin User
  const adminPassword = await bcrypt.hash('Admin@123', 10);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@bookingpms.com',
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      isActive: true
    }
  });
  console.log('Created admin user:', admin.email);

  // Create Regular User
  const userPassword = await bcrypt.hash('User@123', 10);
  const user = await prisma.user.create({
    data: {
      email: 'user@bookingpms.com',
      password: userPassword,
      firstName: 'John',
      lastName: 'Doe',
      role: 'USER',
      isActive: true
    }
  });
  console.log('Created regular user:', user.email);

  // Create Additional Users
  const user2 = await prisma.user.create({
    data: {
      email: 'jane@example.com',
      password: userPassword,
      firstName: 'Jane',
      lastName: 'Smith',
      role: 'USER',
      isActive: true
    }
  });

  const user3 = await prisma.user.create({
    data: {
      email: 'bob@example.com',
      password: userPassword,
      firstName: 'Bob',
      lastName: 'Wilson',
      role: 'USER',
      isActive: true
    }
  });

  console.log('Created additional users');

  // Create Resources
  const resources = await Promise.all([
    prisma.resource.create({
      data: {
        name: 'Conference Room A',
        description: 'Large conference room with projector and video conferencing capabilities. Seats up to 20 people.',
        type: 'MEETING_ROOM',
        capacity: 20,
        pricePerHour: 50.00,
        status: 'AVAILABLE',
        imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800'
      }
    }),
    prisma.resource.create({
      data: {
        name: 'Conference Room B',
        description: 'Medium-sized conference room perfect for team meetings. Seats up to 10 people.',
        type: 'MEETING_ROOM',
        capacity: 10,
        pricePerHour: 35.00,
        status: 'AVAILABLE',
        imageUrl: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800'
      }
    }),
    prisma.resource.create({
      data: {
        name: 'Executive Boardroom',
        description: 'Premium boardroom with leather chairs and advanced AV equipment. Seats up to 12 people.',
        type: 'MEETING_ROOM',
        capacity: 12,
        pricePerHour: 75.00,
        status: 'AVAILABLE',
        imageUrl: 'https://images.unsplash.com/photo-1577412647305-991150c7d163?w=800'
      }
    }),
    prisma.resource.create({
      data: {
        name: 'Hot Desk Area 1',
        description: 'Open workspace with 5 hot desks. Includes high-speed WiFi and power outlets.',
        type: 'HOT_DESK',
        capacity: 5,
        pricePerHour: 10.00,
        status: 'AVAILABLE',
        imageUrl: 'https://images.unsplash.com/photo-1497215842964-222b430dc094?w=800'
      }
    }),
    prisma.resource.create({
      data: {
        name: 'Private Office Suite',
        description: 'Fully furnished private office with desk, chair, and storage. Ideal for focused work.',
        type: 'PRIVATE_OFFICE',
        capacity: 2,
        pricePerHour: 25.00,
        status: 'AVAILABLE',
        imageUrl: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=800'
      }
    }),
    prisma.resource.create({
      data: {
        name: 'Training Room',
        description: 'Large training room with whiteboard, projector, and flexible seating. Seats up to 30 people.',
        type: 'TRAINING_ROOM',
        capacity: 30,
        pricePerHour: 60.00,
        status: 'AVAILABLE',
        imageUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800'
      }
    }),
    prisma.resource.create({
      data: {
        name: 'Podcast Studio',
        description: 'Soundproofed studio with professional recording equipment. Perfect for podcasts and recordings.',
        type: 'STUDIO',
        capacity: 4,
        pricePerHour: 40.00,
        status: 'AVAILABLE',
        imageUrl: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800'
      }
    }),
    prisma.resource.create({
      data: {
        name: 'Event Space',
        description: 'Large open space for events, workshops, and gatherings. Capacity up to 100 people.',
        type: 'EVENT_SPACE',
        capacity: 100,
        pricePerHour: 150.00,
        status: 'AVAILABLE',
        imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800'
      }
    }),
    prisma.resource.create({
      data: {
        name: 'Phone Booth 1',
        description: 'Private phone booth for calls and video meetings. Soundproofed and comfortable.',
        type: 'PHONE_BOOTH',
        capacity: 1,
        pricePerHour: 8.00,
        status: 'AVAILABLE',
        imageUrl: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800'
      }
    }),
    prisma.resource.create({
      data: {
        name: 'Maintenance Room',
        description: 'Currently under maintenance and unavailable for booking.',
        type: 'MEETING_ROOM',
        capacity: 8,
        pricePerHour: 30.00,
        status: 'MAINTENANCE',
        imageUrl: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=800'
      }
    })
  ]);

  console.log(`Created ${resources.length} resources`);

  // Create Sample Bookings
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const bookings = await Promise.all([
    // Confirmed booking for tomorrow
    prisma.booking.create({
      data: {
        userId: user.id,
        resourceId: resources[0].id,
        startTime: new Date(tomorrow.setHours(9, 0, 0, 0)),
        endTime: new Date(tomorrow.setHours(11, 0, 0, 0)),
        totalPrice: 100.00,
        status: 'CONFIRMED',
        notes: 'Team standup meeting'
      }
    }),
    // Pending booking for next week
    prisma.booking.create({
      data: {
        userId: user.id,
        resourceId: resources[2].id,
        startTime: new Date(nextWeek.setHours(14, 0, 0, 0)),
        endTime: new Date(nextWeek.setHours(17, 0, 0, 0)),
        totalPrice: 225.00,
        status: 'PENDING',
        notes: 'Client presentation'
      }
    }),
    // Completed past booking
    prisma.booking.create({
      data: {
        userId: user2.id,
        resourceId: resources[1].id,
        startTime: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        endTime: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
        totalPrice: 105.00,
        status: 'COMPLETED',
        notes: 'Project planning session'
      }
    }),
    // Cancelled booking
    prisma.booking.create({
      data: {
        userId: user3.id,
        resourceId: resources[4].id,
        startTime: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
        endTime: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
        totalPrice: 100.00,
        status: 'CANCELLED',
        notes: 'Rescheduled to next month'
      }
    })
  ]);

  console.log(`Created ${bookings.length} bookings`);

  // Create Resource Blocks (maintenance periods)
  const blocks = await Promise.all([
    prisma.resourceBlock.create({
      data: {
        resourceId: resources[0].id,
        startTime: new Date(nextWeek.getTime() + 2 * 24 * 60 * 60 * 1000),
        endTime: new Date(nextWeek.getTime() + 2 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000),
        reason: 'Scheduled maintenance',
        createdBy: admin.id
      }
    }),
    prisma.resourceBlock.create({
      data: {
        resourceId: resources[5].id,
        startTime: new Date(nextWeek.getTime() + 5 * 24 * 60 * 60 * 1000),
        endTime: new Date(nextWeek.getTime() + 6 * 24 * 60 * 60 * 1000),
        reason: 'Private event reservation',
        createdBy: admin.id
      }
    })
  ]);

  console.log(`Created ${blocks.length} resource blocks`);

  // Create Welcome Notifications
  await Promise.all([
    prisma.notification.create({
      data: {
        userId: user.id,
        type: 'WELCOME',
        title: 'Welcome to BookingPMS!',
        message: 'Thank you for joining BookingPMS. Start exploring and booking resources today!',
        isRead: false
      }
    }),
    prisma.notification.create({
      data: {
        userId: user.id,
        type: 'BOOKING_CREATED',
        title: 'Booking Confirmed',
        message: `Your booking for ${resources[0].name} has been confirmed.`,
        isRead: false,
        metadata: { bookingId: bookings[0].id }
      }
    }),
    prisma.notification.create({
      data: {
        userId: user2.id,
        type: 'WELCOME',
        title: 'Welcome to BookingPMS!',
        message: 'Thank you for joining BookingPMS. Start exploring and booking resources today!',
        isRead: true
      }
    }),
    prisma.notification.create({
      data: {
        userId: user3.id,
        type: 'BOOKING_CANCELLED',
        title: 'Booking Cancelled',
        message: `Your booking for ${resources[4].name} has been cancelled.`,
        isRead: false,
        metadata: { bookingId: bookings[3].id }
      }
    })
  ]);

  console.log('Created notifications');

  // Create Audit Logs
  await Promise.all([
    prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: 'LOGIN',
        entity: 'User',
        entityId: admin.id,
        ipAddress: '127.0.0.1',
        details: { email: admin.email }
      }
    }),
    prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'REGISTER',
        entity: 'User',
        entityId: user.id,
        ipAddress: '192.168.1.100',
        details: { email: user.email }
      }
    }),
    prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'BOOKING_CREATE',
        entity: 'Booking',
        entityId: bookings[0].id,
        ipAddress: '192.168.1.100',
        details: { resourceName: resources[0].name }
      }
    }),
    prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: 'RESOURCE_CREATE',
        entity: 'Resource',
        entityId: resources[0].id,
        ipAddress: '127.0.0.1',
        details: { resourceName: resources[0].name, type: resources[0].type }
      }
    })
  ]);

  console.log('Created audit logs');

  // Create System Settings
  await Promise.all([
    prisma.setting.create({
      data: {
        key: 'site_name',
        value: 'BookingPMS',
        type: 'string'
      }
    }),
    prisma.setting.create({
      data: {
        key: 'booking_advance_days',
        value: '30',
        type: 'number'
      }
    }),
    prisma.setting.create({
      data: {
        key: 'cancellation_hours',
        value: '24',
        type: 'number'
      }
    }),
    prisma.setting.create({
      data: {
        key: 'currency',
        value: 'USD',
        type: 'string'
      }
    }),
    prisma.setting.create({
      data: {
        key: 'timezone',
        value: 'UTC',
        type: 'string'
      }
    }),
    prisma.setting.create({
      data: {
        key: 'email_notifications_enabled',
        value: 'true',
        type: 'boolean'
      }
    })
  ]);

  console.log('Created system settings');

  console.log('\n=== Seed completed successfully! ===\n');
  console.log('Login credentials:');
  console.log('-------------------');
  console.log('Admin: admin@bookingpms.com / Admin@123');
  console.log('User: user@bookingpms.com / User@123');
  console.log('');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
