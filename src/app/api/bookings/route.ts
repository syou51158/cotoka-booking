import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { parseISO } from 'date-fns'

const createBookingSchema = z.object({
  locationId: z.string(),
  serviceId: z.string(),
  staffId: z.string(),
  roomId: z.string().optional(),
  startTime: z.string().datetime(),
  customerInfo: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
  }),
  notes: z.string().optional(),
  depositAmount: z.number().optional(),
})

const updateBookingSchema = z.object({
  status: z.enum(['PENDING', 'HELD', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  notes: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = createBookingSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid booking data', details: validation.error.issues },
        { status: 400 }
      )
    }

    const { locationId, serviceId, staffId, roomId, startTime, customerInfo, notes, depositAmount } = validation.data

    const service = await prisma.service.findFirst({
      where: {
        id: serviceId,
        locationId,
        isActive: true,
      },
    })

    if (!service) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      )
    }

    const startDateTime = parseISO(startTime)
    const endDateTime = new Date(startDateTime.getTime() + service.duration * 60000)

    const conflictingBookings = await prisma.booking.findMany({
      where: {
        locationId,
        staffId,
        status: {
          in: ['PENDING', 'HELD', 'CONFIRMED'],
        },
        OR: [
          {
            AND: [
              { startTime: { lte: startDateTime } },
              { endTime: { gt: startDateTime } },
            ],
          },
          {
            AND: [
              { startTime: { lt: endDateTime } },
              { endTime: { gte: endDateTime } },
            ],
          },
          {
            AND: [
              { startTime: { gte: startDateTime } },
              { endTime: { lte: endDateTime } },
            ],
          },
        ],
      },
    })

    if (conflictingBookings.length > 0) {
      return NextResponse.json(
        { error: 'Time slot is no longer available' },
        { status: 409 }
      )
    }

    if (roomId) {
      const roomConflicts = await prisma.booking.findMany({
        where: {
          locationId,
          roomId,
          status: {
            in: ['PENDING', 'HELD', 'CONFIRMED'],
          },
          OR: [
            {
              AND: [
                { startTime: { lte: startDateTime } },
                { endTime: { gt: startDateTime } },
              ],
            },
            {
              AND: [
                { startTime: { lt: endDateTime } },
                { endTime: { gte: endDateTime } },
              ],
            },
            {
              AND: [
                { startTime: { gte: startDateTime } },
                { endTime: { lte: endDateTime } },
              ],
            },
          ],
        },
      })

      if (roomConflicts.length > 0) {
        return NextResponse.json(
          { error: 'Room is not available at the selected time' },
          { status: 409 }
        )
      }
    }

    let user = await prisma.user.findUnique({
      where: { email: customerInfo.email },
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: customerInfo.email,
          firstName: customerInfo.firstName,
          lastName: customerInfo.lastName,
          phone: customerInfo.phone,
          role: 'CUSTOMER',
        },
      })
    }

    const booking = await prisma.$transaction(async (tx) => {
      const finalConflictCheck = await tx.booking.findMany({
        where: {
          locationId,
          staffId,
          status: {
            in: ['PENDING', 'HELD', 'CONFIRMED'],
          },
          OR: [
            {
              AND: [
                { startTime: { lte: startDateTime } },
                { endTime: { gt: startDateTime } },
              ],
            },
            {
              AND: [
                { startTime: { lt: endDateTime } },
                { endTime: { gte: endDateTime } },
              ],
            },
            {
              AND: [
                { startTime: { gte: startDateTime } },
                { endTime: { lte: endDateTime } },
              ],
            },
          ],
        },
      })

      if (finalConflictCheck.length > 0) {
        throw new Error('Time slot was booked by another customer')
      }

      return await tx.booking.create({
        data: {
          locationId,
          userId: user.id,
          staffId,
          serviceId,
          roomId,
          startTime: startDateTime,
          endTime: endDateTime,
          status: 'HELD', // Start with HELD status for 15-minute window
          totalAmount: service.price,
          depositAmount,
          notes,
          customerInfo,
        },
        include: {
          service: true,
          staff: true,
          user: true,
          room: true,
        },
      })
    })

    return NextResponse.json({
      booking,
      message: 'Booking created successfully. You have 15 minutes to complete payment.',
    }, { status: 201 })

  } catch (error) {
    console.error('Create booking error:', error)
    
    if (error instanceof Error && error.message === 'Time slot was booked by another customer') {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const locationId = searchParams.get('locationId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const staffId = searchParams.get('staffId')

    if (!locationId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required parameters: locationId, startDate, endDate' },
        { status: 400 }
      )
    }

    const bookings = await prisma.booking.findMany({
      where: {
        locationId,
        startTime: {
          gte: parseISO(startDate),
          lte: parseISO(endDate),
        },
        ...(staffId ? { staffId } : {}),
      },
      include: {
        service: true,
        staff: true,
        user: true,
        room: true,
      },
      orderBy: {
        startTime: 'asc',
      },
    })

    return NextResponse.json({ bookings })

  } catch (error) {
    console.error('Get bookings error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
