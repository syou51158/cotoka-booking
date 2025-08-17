import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { format, parseISO, startOfDay, endOfDay } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

const availabilitySchema = z.object({
  locationId: z.string(),
  serviceId: z.string(),
  staffId: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const params = {
      locationId: searchParams.get('locationId'),
      serviceId: searchParams.get('serviceId'),
      staffId: searchParams.get('staffId'),
      date: searchParams.get('date'),
    }

    const validation = availabilitySchema.safeParse(params)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: validation.error.issues },
        { status: 400 }
      )
    }

    const { locationId, serviceId, staffId, date } = validation.data

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

    const availableStaff = await prisma.staff.findMany({
      where: {
        locationId,
        isActive: true,
        ...(staffId ? { id: staffId } : {}),
        services: {
          some: {
            serviceId,
          },
        },
      },
      include: {
        schedules: {
          where: {
            isActive: true,
            OR: [
              {
                date: parseISO(date),
              },
              {
                date: null,
                dayOfWeek: parseISO(date).getDay(),
              },
            ],
          },
        },
      },
    })

    if (availableStaff.length === 0) {
      return NextResponse.json({
        availableSlots: [],
        message: 'No staff available for this service on the selected date',
      })
    }

    const startDate = startOfDay(parseISO(date))
    const endDate = endOfDay(parseISO(date))

    const existingBookings = await prisma.booking.findMany({
      where: {
        locationId,
        startTime: {
          gte: startDate,
          lte: endDate,
        },
        status: {
          in: ['PENDING', 'HELD', 'CONFIRMED'],
        },
        ...(staffId ? { staffId } : {}),
      },
      select: {
        staffId: true,
        startTime: true,
        endTime: true,
        roomId: true,
      },
    })

    const availableSlots: Array<{
      staffId: string;
      staffName: string;
      startTime: Date;
      endTime: Date;
      duration: number;
    }> = []
    const timezone = 'Asia/Tokyo'

    for (const staff of availableStaff) {
      const workingSchedules = staff.schedules.filter(s => s.type === 'WORKING')
      
      for (const schedule of workingSchedules) {
        const [startHour, startMinute] = schedule.startTime.split(':').map(Number)
        const [endHour, endMinute] = schedule.endTime.split(':').map(Number)
        
        const scheduleStart = new Date(parseISO(date))
        scheduleStart.setHours(startHour, startMinute, 0, 0)
        
        const scheduleEnd = new Date(parseISO(date))
        scheduleEnd.setHours(endHour, endMinute, 0, 0)
        
        let currentSlot = new Date(scheduleStart)
        
        while (currentSlot.getTime() + service.duration * 60000 <= scheduleEnd.getTime()) {
          const slotEnd = new Date(currentSlot.getTime() + service.duration * 60000)
          
          const hasConflict = existingBookings.some(booking => {
            if (booking.staffId !== staff.id) return false
            
            const bookingStart = booking.startTime.getTime()
            const bookingEnd = booking.endTime.getTime()
            const slotStart = currentSlot.getTime()
            const slotEndTime = slotEnd.getTime()
            
            return (slotStart < bookingEnd) && (bookingStart < slotEndTime)
          })
          
          if (!hasConflict) {
            availableSlots.push({
              staffId: staff.id,
              staffName: staff.name,
              startTime: toZonedTime(currentSlot, timezone),
              endTime: toZonedTime(slotEnd, timezone),
              duration: service.duration,
            })
          }
          
          currentSlot = new Date(currentSlot.getTime() + 30 * 60000)
        }
      }
    }

    return NextResponse.json({
      availableSlots: availableSlots.sort((a, b) => 
        a.startTime.getTime() - b.startTime.getTime()
      ),
      service: {
        id: service.id,
        name: service.name,
        duration: service.duration,
        price: service.price,
      },
    })

  } catch (error) {
    console.error('Availability API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
