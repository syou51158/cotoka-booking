'use client'

import React, { useState, useEffect } from 'react'
import { Calendar, dateFnsLocalizer } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { ja, enUS, zhCN } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'

const locales = {
  'en': enUS,
  'ja': ja,
  'zh': zhCN,
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})

interface BookingEvent {
  id: string
  title: string
  start: Date
  end: Date
  resource: {
    bookingId: string
    staffId: string
    staffName: string
    serviceName: string
    customerName: string
    status: string
    totalAmount: number
  }
}

interface BookingCalendarProps {
  locationId: string
  locale?: 'en' | 'ja' | 'zh'
  onEventSelect?: (event: BookingEvent) => void
  onEventMove?: (event: BookingEvent, start: Date, end: Date) => void
  onSlotSelect?: (slotInfo: { start: Date; end: Date; slots: Date[] }) => void
}

export function BookingCalendar({
  locationId,
  locale = 'ja',
  onEventSelect,
  onEventMove,
  onSlotSelect,
}: BookingCalendarProps) {
  const [events, setEvents] = useState<BookingEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())

  const fetchBookings = async (startDate: Date, endDate: Date) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        locationId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      })

      const response = await fetch(`/api/bookings?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch bookings')
      }

      const data = await response.json()
      const bookingEvents: BookingEvent[] = data.bookings.map((booking: any) => ({
        id: booking.id,
        title: `${booking.service.name} - ${booking.user.firstName} ${booking.user.lastName}`,
        start: new Date(booking.startTime),
        end: new Date(booking.endTime),
        resource: {
          bookingId: booking.id,
          staffId: booking.staffId,
          staffName: booking.staff.name,
          serviceName: booking.service.name,
          customerName: `${booking.user.firstName} ${booking.user.lastName}`,
          status: booking.status,
          totalAmount: booking.totalAmount,
        },
      }))

      setEvents(bookingEvents)
    } catch (error) {
      console.error('Error fetching bookings:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const startDate = startOfWeek(currentDate)
    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + 6)
    
    fetchBookings(startDate, endDate)
  }, [currentDate, locationId])

  const handleEventDrop = async ({ event, start, end }: any) => {
    if (!onEventMove) return

    try {
      const updatedEvents = events.map(e => 
        e.id === event.id 
          ? { ...e, start: new Date(start), end: new Date(end) }
          : e
      )
      setEvents(updatedEvents)

      await onEventMove(event, new Date(start), new Date(end))
    } catch (error) {
      console.error('Error moving event:', error)
      const startDate = startOfWeek(currentDate)
      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + 6)
      fetchBookings(startDate, endDate)
    }
  }

  const eventStyleGetter = (event: BookingEvent) => {
    let backgroundColor = '#3174ad'
    
    switch (event.resource.status) {
      case 'PENDING':
        backgroundColor = '#f59e0b'
        break
      case 'HELD':
        backgroundColor = '#ef4444'
        break
      case 'CONFIRMED':
        backgroundColor = '#10b981'
        break
      case 'COMPLETED':
        backgroundColor = '#6b7280'
        break
      case 'CANCELLED':
        backgroundColor = '#dc2626'
        break
      case 'NO_SHOW':
        backgroundColor = '#7c2d12'
        break
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
        display: 'block',
      },
    }
  }

  const messages = {
    en: {
      allDay: 'All Day',
      previous: 'Previous',
      next: 'Next',
      today: 'Today',
      month: 'Month',
      week: 'Week',
      day: 'Day',
      agenda: 'Agenda',
      date: 'Date',
      time: 'Time',
      event: 'Event',
      noEventsInRange: 'No bookings in this range',
      showMore: (total: number) => `+${total} more`,
    },
    ja: {
      allDay: '終日',
      previous: '前',
      next: '次',
      today: '今日',
      month: '月',
      week: '週',
      day: '日',
      agenda: 'アジェンダ',
      date: '日付',
      time: '時間',
      event: 'イベント',
      noEventsInRange: 'この期間に予約はありません',
      showMore: (total: number) => `+${total} 件`,
    },
    zh: {
      allDay: '全天',
      previous: '上一个',
      next: '下一个',
      today: '今天',
      month: '月',
      week: '周',
      day: '日',
      agenda: '议程',
      date: '日期',
      time: '时间',
      event: '事件',
      noEventsInRange: '此时间范围内没有预订',
      showMore: (total: number) => `+${total} 更多`,
    },
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="h-screen">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: '100%' }}
        onSelectEvent={onEventSelect}
        onSelectSlot={onSlotSelect}
        eventPropGetter={eventStyleGetter}
        selectable
        defaultView="week"
        views={['month', 'week', 'day']}
        step={30}
        timeslots={2}
        culture={locale}
        messages={messages[locale]}
        onNavigate={(date: Date) => setCurrentDate(date)}
        formats={{
          timeGutterFormat: 'HH:mm',
          eventTimeRangeFormat: ({ start, end }: { start: Date; end: Date }) => 
            `${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`,
          dayHeaderFormat: (date: Date) => format(date, 'M/d (E)', { locale: locales[locale] }),
        }}
      />
    </div>
  )
}
