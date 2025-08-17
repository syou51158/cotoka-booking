'use client'

import React, { useState } from 'react'
import { BookingCalendar } from '@/components/booking-calendar'

export default function AdminDashboard() {
  const [selectedLocation] = useState('cotoka-main')

  const handleEventSelect = (event: any) => {
    console.log('Selected event:', event)
  }

  const handleEventMove = async (event: any, start: Date, end: Date) => {
    console.log('Moving event:', event, 'to:', start, end)
    try {
      const response = await fetch(`/api/bookings/${event.resource.bookingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startTime: start.toISOString(),
          endTime: end.toISOString(),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update booking')
      }

      console.log('Booking updated successfully')
    } catch (error) {
      console.error('Error updating booking:', error)
      throw error
    }
  }

  const handleSlotSelect = (slotInfo: { start: Date; end: Date; slots: Date[] }) => {
    console.log('Selected slot:', slotInfo)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-3xl font-bold text-gray-900">
              Cotoka 予約管理システム
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              予約台帳 - 週ビュー
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <div className="mb-4 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">
                予約カレンダー
              </h2>
              <div className="flex space-x-2">
                <div className="flex items-center space-x-2 text-sm">
                  <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                  <span>保留中</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <div className="w-3 h-3 bg-red-500 rounded"></div>
                  <span>仮押さえ</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span>確定</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <div className="w-3 h-3 bg-gray-500 rounded"></div>
                  <span>完了</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <div className="w-3 h-3 bg-red-600 rounded"></div>
                  <span>キャンセル</span>
                </div>
              </div>
            </div>
            
            <div className="h-[600px]">
              <BookingCalendar
                locationId={selectedLocation}
                locale="ja"
                onEventSelect={handleEventSelect}
                onEventMove={handleEventMove}
                onSlotSelect={handleSlotSelect}
              />
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              本日の予約状況
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">総予約数</span>
                <span className="text-sm font-medium">0件</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">確定済み</span>
                <span className="text-sm font-medium text-green-600">0件</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">保留中</span>
                <span className="text-sm font-medium text-yellow-600">0件</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              売上サマリー
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">本日売上</span>
                <span className="text-sm font-medium">¥0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">今月売上</span>
                <span className="text-sm font-medium">¥0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">平均客単価</span>
                <span className="text-sm font-medium">¥0</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              スタッフ状況
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">出勤中</span>
                <span className="text-sm font-medium">2名</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">予約可能</span>
                <span className="text-sm font-medium text-green-600">2名</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">施術中</span>
                <span className="text-sm font-medium text-blue-600">0名</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
