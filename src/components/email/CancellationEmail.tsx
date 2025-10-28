import React from 'react';
import { EmailLayout, formatDateTime, formatDuration, formatPrice } from './EmailLayout';
import type { Dictionary } from '@/i18n/dictionaries';

interface CancellationEmailProps {
  dict: Dictionary;
  locale: string;
  reservation: {
    id: string;
    customer_name: string;
    customer_email: string;
    start_at: string;
    total_amount: number;
    status: string;
    code: string;
    notes?: string;
    service?: {
      name: string;
      duration_min: number;
    } | null;
    staff?: {
      display_name: string;
      email: string;
    } | null;
  };
  rebookingUrl: string;
  brand?: {
    siteName?: string;
    addressLine?: string;
    phone?: string;
    websiteUrl?: string;
  };
}

export function CancellationEmail({ 
  dict, 
  locale, 
  reservation, 
  rebookingUrl,
  brand,
}: CancellationEmailProps) {
  const serviceName = reservation.service?.name || 'サービス';
  const salonPhoneLine = brand?.phone ?? dict.email.common.footer.phone;
  
  return (
    <EmailLayout 
      dict={dict} 
      previewText={`${dict.email.cancellation.title} - ${serviceName}`}
      brand={brand}
    >
      {/* Title */}
      <h2 style={{
        color: '#dc2626',
        fontSize: '28px',
        fontWeight: '600',
        margin: '0 0 24px 0',
        textAlign: 'center'
      }}>
        {dict.email.cancellation.title}
      </h2>

      {/* Greeting */}
      <p style={{
        fontSize: '16px',
        margin: '0 0 16px 0'
      }}>
        {dict.email.cancellation.greeting.replace('{customerName}', reservation.customer_name)}
      </p>

      {/* Message */}
      <p style={{
        fontSize: '16px',
        margin: '0 0 32px 0'
      }}>
        {dict.email.cancellation.message}
      </p>

      {/* Cancelled Reservation Details */}
      <div style={{
        backgroundColor: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: '8px',
        padding: '24px',
        margin: '0 0 32px 0'
      }}>
        <h3 style={{
          color: '#dc2626',
          fontSize: '18px',
          fontWeight: '600',
          margin: '0 0 16px 0'
        }}>
          キャンセルされた予約
        </h3>
        
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{
                padding: '8px 0',
                borderBottom: '1px solid #fecaca',
                fontWeight: '500',
                width: '30%'
              }}>
                サービス:
              </td>
              <td style={{
                padding: '8px 0',
                borderBottom: '1px solid #fecaca'
              }}>
                {serviceName}
              </td>
            </tr>
            <tr>
              <td style={{
                padding: '8px 0',
                borderBottom: '1px solid #fecaca',
                fontWeight: '500'
              }}>
                担当:
              </td>
              <td style={{
                padding: '8px 0',
                borderBottom: '1px solid #fecaca'
              }}>
                {reservation.staff?.display_name || 'スタッフ'}
              </td>
            </tr>
            <tr>
              <td style={{
                padding: '8px 0',
                borderBottom: '1px solid #fecaca',
                fontWeight: '500'
              }}>
                日時:
              </td>
              <td style={{
                padding: '8px 0',
                borderBottom: '1px solid #fecaca'
              }}>
                {formatDateTime(new Date(reservation.start_at), locale)}
              </td>
            </tr>
            <tr>
              <td style={{
                padding: '8px 0',
                borderBottom: '1px solid #fecaca',
                fontWeight: '500'
              }}>
                所要時間:
              </td>
              <td style={{
                padding: '8px 0',
                borderBottom: '1px solid #fecaca'
              }}>
                {formatDuration(reservation.service?.duration_min || 60, locale)}
              </td>
            </tr>
            <tr>
              <td style={{
                padding: '8px 0',
                fontWeight: '500'
              }}>
                料金:
              </td>
              <td style={{
                padding: '8px 0',
                fontSize: '18px',
                fontWeight: '600',
                color: '#dc2626'
              }}>
                {formatPrice(reservation.total_amount, locale)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Refund Notice - only show if there was a prepayment */}
      {reservation.total_amount > 0 && (
        <div style={{
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: '8px',
          padding: '20px',
          margin: '0 0 32px 0'
        }}>
          <h3 style={{
            color: '#1e40af',
            fontSize: '16px',
            fontWeight: '600',
            margin: '0 0 12px 0'
          }}>
            {dict.email.cancellation.refund.title}
          </h3>
          <p style={{
            margin: 0,
            fontSize: '14px'
          }}>
            {dict.email.cancellation.refund.message}
          </p>
        </div>
      )}

      {/* Rebooking */}
      <div style={{
        backgroundColor: '#f0fdf4',
        border: '1px solid #bbf7d0',
        borderRadius: '8px',
        padding: '20px',
        margin: '0 0 32px 0',
        textAlign: 'center'
      }}>
        <h3 style={{
          color: '#166534',
          fontSize: '16px',
          fontWeight: '600',
          margin: '0 0 12px 0'
        }}>
          {dict.email.cancellation.rebook.title}
        </h3>
        <p style={{
          margin: '0 0 16px 0',
          fontSize: '14px'
        }}>
          {dict.email.cancellation.rebook.message}
        </p>
        <a 
          href={rebookingUrl}
          style={{
            display: 'inline-block',
            backgroundColor: '#059669',
            color: '#ffffff',
            padding: '12px 24px',
            borderRadius: '6px',
            textDecoration: 'none',
            fontSize: '16px',
            fontWeight: '500'
          }}
        >
          {dict.email.cancellation.rebook.link}
        </a>
      </div>

      {/* Contact */}
      <div style={{
        textAlign: 'center',
        padding: '20px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px'
      }}>
        <p style={{
          margin: '0 0 8px 0',
          fontSize: '14px',
          fontWeight: '500'
        }}>
          ご不明な点がございましたら
        </p>
        <p style={{
          margin: 0,
          fontSize: '14px',
          color: '#6b7280'
        }}>
          {salonPhoneLine}
        </p>
      </div>
    </EmailLayout>
  );
}