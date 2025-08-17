import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  const location = await prisma.location.upsert({
    where: { id: 'cotoka-main' },
    update: {},
    create: {
      id: 'cotoka-main',
      name: 'Cotoka Relax & Beauty SPA',
      address: '京都市中京区...',
      phone: '+81-75-xxx-xxxx',
      email: 'info@cotoka.jp',
      timezone: 'Asia/Tokyo',
      settings: {
        businessHours: {
          monday: { start: '09:00', end: '20:00' },
          tuesday: { start: '09:00', end: '20:00' },
          wednesday: { start: '09:00', end: '20:00' },
          thursday: { start: '09:00', end: '20:00' },
          friday: { start: '09:00', end: '20:00' },
          saturday: { start: '09:00', end: '18:00' },
          sunday: { start: '10:00', end: '17:00' },
        },
        bookingWindow: 30, // days in advance
        cancellationPolicy: 24, // hours before
      },
    },
  })

  const services = [
    {
      id: 'facial-basic',
      name: 'ベーシックフェイシャル',
      description: '基本的なフェイシャルトリートメント',
      duration: 60,
      price: 8000,
      category: 'フェイシャル',
    },
    {
      id: 'facial-premium',
      name: 'プレミアムフェイシャル',
      description: '高級フェイシャルトリートメント',
      duration: 90,
      price: 12000,
      category: 'フェイシャル',
    },
    {
      id: 'massage-relaxation',
      name: 'リラクゼーションマッサージ',
      description: '全身リラクゼーションマッサージ',
      duration: 60,
      price: 10000,
      category: 'マッサージ',
    },
    {
      id: 'massage-deep',
      name: 'ディープティシューマッサージ',
      description: '深層筋肉マッサージ',
      duration: 90,
      price: 15000,
      category: 'マッサージ',
    },
  ]

  for (const service of services) {
    await prisma.service.upsert({
      where: { id: service.id },
      update: {},
      create: {
        ...service,
        locationId: location.id,
      },
    })
  }

  const rooms = [
    { id: 'room-1', name: 'ルーム1', capacity: 1 },
    { id: 'room-2', name: 'ルーム2', capacity: 1 },
    { id: 'room-3', name: 'ルーム3', capacity: 2 },
    { id: 'room-vip', name: 'VIPルーム', capacity: 1 },
  ]

  for (const room of rooms) {
    await prisma.room.upsert({
      where: { id: room.id },
      update: {},
      create: {
        ...room,
        locationId: location.id,
      },
    })
  }

  const users = [
    {
      id: 'user-admin',
      email: 'admin@cotoka.jp',
      firstName: '管理者',
      lastName: '太郎',
      role: 'OWNER' as const,
    },
    {
      id: 'user-manager',
      email: 'manager@cotoka.jp',
      firstName: 'マネージャー',
      lastName: '花子',
      role: 'MANAGER' as const,
    },
    {
      id: 'user-staff1',
      email: 'staff1@cotoka.jp',
      firstName: 'スタッフ',
      lastName: '一郎',
      role: 'STAFF' as const,
    },
    {
      id: 'user-staff2',
      email: 'staff2@cotoka.jp',
      firstName: 'スタッフ',
      lastName: '二郎',
      role: 'STAFF' as const,
    },
  ]

  for (const user of users) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: {},
      create: user,
    })

    await prisma.userLocation.upsert({
      where: {
        userId_locationId: {
          userId: user.id,
          locationId: location.id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        locationId: location.id,
        role: user.role,
      },
    })
  }

  const staffUsers = users.filter(u => u.role === 'STAFF')
  for (const user of staffUsers) {
    const staff = await prisma.staff.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        locationId: location.id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
      },
    })

    const serviceIds = services.map(s => s.id)
    for (const serviceId of serviceIds) {
      await prisma.staffService.upsert({
        where: {
          staffId_serviceId: {
            staffId: staff.id,
            serviceId,
          },
        },
        update: {},
        create: {
          staffId: staff.id,
          serviceId,
        },
      })
    }

    const workingDays = [1, 2, 3, 4, 5, 6] // Monday to Saturday
    for (const dayOfWeek of workingDays) {
      await prisma.schedule.upsert({
        where: {
          id: `schedule-${staff.id}-${dayOfWeek}`,
        },
        update: {},
        create: {
          id: `schedule-${staff.id}-${dayOfWeek}`,
          locationId: location.id,
          staffId: staff.id,
          dayOfWeek,
          startTime: '09:00',
          endTime: dayOfWeek === 6 ? '18:00' : '20:00', // Saturday ends earlier
          type: 'WORKING',
        },
      })
    }

    await prisma.schedule.upsert({
      where: {
        id: `schedule-${staff.id}-0`,
      },
      update: {},
      create: {
        id: `schedule-${staff.id}-0`,
        locationId: location.id,
        staffId: staff.id,
        dayOfWeek: 0, // Sunday
        startTime: '10:00',
        endTime: '17:00',
        type: 'WORKING',
      },
    })
  }

  console.log('✅ Seed completed successfully!')
  console.log(`📍 Location: ${location.name}`)
  console.log(`🛍️ Services: ${services.length} created`)
  console.log(`🏠 Rooms: ${rooms.length} created`)
  console.log(`👥 Users: ${users.length} created`)
  console.log(`👨‍💼 Staff: ${staffUsers.length} created`)
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
