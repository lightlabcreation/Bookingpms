const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Analytics Service
 * Handles admin analytics and dashboard data
 */
class AnalyticsService {
  /**
   * Get dashboard overview statistics
   */
  static async getDashboardStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      totalUsers,
      activeUsers,
      newUsersThisMonth,
      newUsersLastMonth,
      totalBookings,
      activeBookings,
      bookingsThisMonth,
      bookingsLastMonth,
      totalResources,
      availableResources,
      revenueThisMonth,
      revenueLastMonth
    ] = await Promise.all([
      // Total users
      prisma.user.count(),
      // Active users
      prisma.user.count({ where: { isActive: true } }),
      // New users this month
      prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
      // New users last month
      prisma.user.count({
        where: {
          createdAt: { gte: startOfLastMonth, lte: endOfLastMonth }
        }
      }),
      // Total bookings
      prisma.booking.count(),
      // Active bookings (confirmed and upcoming)
      prisma.booking.count({
        where: {
          status: 'CONFIRMED',
          endTime: { gte: now }
        }
      }),
      // Bookings this month
      prisma.booking.count({
        where: { createdAt: { gte: startOfMonth } }
      }),
      // Bookings last month
      prisma.booking.count({
        where: {
          createdAt: { gte: startOfLastMonth, lte: endOfLastMonth }
        }
      }),
      // Total resources
      prisma.resource.count(),
      // Available resources
      prisma.resource.count({ where: { status: 'AVAILABLE' } }),
      // Revenue this month
      prisma.booking.aggregate({
        where: {
          status: { not: 'CANCELLED' },
          createdAt: { gte: startOfMonth }
        },
        _sum: { totalPrice: true }
      }),
      // Revenue last month
      prisma.booking.aggregate({
        where: {
          status: { not: 'CANCELLED' },
          createdAt: { gte: startOfLastMonth, lte: endOfLastMonth }
        },
        _sum: { totalPrice: true }
      })
    ]);

    // Calculate growth percentages
    const userGrowth = newUsersLastMonth > 0
      ? ((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth * 100).toFixed(1)
      : newUsersThisMonth > 0 ? 100 : 0;

    const bookingGrowth = bookingsLastMonth > 0
      ? ((bookingsThisMonth - bookingsLastMonth) / bookingsLastMonth * 100).toFixed(1)
      : bookingsThisMonth > 0 ? 100 : 0;

    const currentRevenue = parseFloat(revenueThisMonth._sum.totalPrice || 0);
    const lastRevenue = parseFloat(revenueLastMonth._sum.totalPrice || 0);
    const revenueGrowth = lastRevenue > 0
      ? ((currentRevenue - lastRevenue) / lastRevenue * 100).toFixed(1)
      : currentRevenue > 0 ? 100 : 0;

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        newThisMonth: newUsersThisMonth,
        growth: parseFloat(userGrowth)
      },
      bookings: {
        total: totalBookings,
        active: activeBookings,
        thisMonth: bookingsThisMonth,
        growth: parseFloat(bookingGrowth)
      },
      resources: {
        total: totalResources,
        available: availableResources
      },
      revenue: {
        thisMonth: currentRevenue,
        lastMonth: lastRevenue,
        growth: parseFloat(revenueGrowth)
      }
    };
  }

  /**
   * Get monthly booking statistics for charts
   */
  static async getMonthlyBookingStats(months = 12) {
    const result = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const [bookings, revenue] = await Promise.all([
        prisma.booking.count({
          where: {
            createdAt: { gte: startOfMonth, lte: endOfMonth }
          }
        }),
        prisma.booking.aggregate({
          where: {
            status: { not: 'CANCELLED' },
            createdAt: { gte: startOfMonth, lte: endOfMonth }
          },
          _sum: { totalPrice: true }
        })
      ]);

      result.push({
        month: startOfMonth.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        bookings,
        revenue: parseFloat(revenue._sum.totalPrice || 0)
      });
    }

    return result;
  }

  /**
   * Get booking statistics by resource type
   */
  static async getBookingsByResourceType() {
    const resources = await prisma.resource.findMany({
      select: {
        type: true,
        _count: {
          select: { bookings: true }
        }
      }
    });

    // Group by type
    const typeStats = {};
    resources.forEach(r => {
      if (!typeStats[r.type]) {
        typeStats[r.type] = 0;
      }
      typeStats[r.type] += r._count.bookings;
    });

    return Object.entries(typeStats).map(([type, count]) => ({
      type,
      bookings: count
    }));
  }

  /**
   * Get top resources by bookings
   */
  static async getTopResources(limit = 5) {
    const resources = await prisma.resource.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        _count: {
          select: { bookings: { where: { status: { not: 'CANCELLED' } } } }
        }
      },
      orderBy: {
        bookings: {
          _count: 'desc'
        }
      },
      take: limit
    });

    return resources.map(r => ({
      id: r.id,
      name: r.name,
      type: r.type,
      bookings: r._count.bookings
    }));
  }

  /**
   * Get revenue by resource type
   */
  static async getRevenueByResourceType() {
    const bookings = await prisma.booking.findMany({
      where: { status: { not: 'CANCELLED' } },
      select: {
        totalPrice: true,
        resource: {
          select: { type: true }
        }
      }
    });

    const typeRevenue = {};
    bookings.forEach(b => {
      const type = b.resource.type;
      if (!typeRevenue[type]) {
        typeRevenue[type] = 0;
      }
      typeRevenue[type] += parseFloat(b.totalPrice);
    });

    return Object.entries(typeRevenue).map(([type, revenue]) => ({
      type,
      revenue
    }));
  }

  /**
   * Get recent activity
   */
  static async getRecentActivity(limit = 10) {
    const [recentBookings, recentUsers] = await Promise.all([
      prisma.booking.findMany({
        select: {
          id: true,
          status: true,
          createdAt: true,
          user: {
            select: { firstName: true, lastName: true, email: true }
          },
          resource: {
            select: { name: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit
      }),
      prisma.user.findMany({
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      })
    ]);

    return {
      recentBookings,
      recentUsers
    };
  }
}

module.exports = AnalyticsService;
