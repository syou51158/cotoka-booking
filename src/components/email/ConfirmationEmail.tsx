import React from 'react';
import { EmailLayout, formatDateTime, formatDuration, formatPrice } from './EmailLayout';
import type { Dictionary } from '@/i18n/dictionaries';

interface ConfirmationEmailProps {
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
  calendarLinks: {
    google: string;
    apple: string;
    ics: string;
  };
}

export function ConfirmationEmail({ 
  dict, 
  locale, 
  reservation, 
  calendarLinks 
}: ConfirmationEmailProps) {
  const serviceName = reservation.service?.name || 'サービス';
  const subject = dict.email.confirmation.subject.replace('{serviceName}', serviceName);
  
  return (
    <EmailLayout 
      dict={dict} 
      previewText={`${dict.email.confirmation.title} - ${serviceName}`}
    >
      {/* Title */}
      <h2 style={{
        color: '#1f2937',
        fontSize: '28px',
        fontWeight: '600',
        margin: '0 0 24px 0',
        textAlign: 'center'
      }}>
        {dict.email.confirmation.title}
      </h2>

      {/* Greeting */}
      <p style={{
        fontSize: '16px',
        margin: '0 0 16px 0'
      }}>
        {dict.email.confirmation.greeting.replace('{customerName}', reservation.customer_name)}
      </p>

      {/* Message */}
      <p style={{
        fontSize: '16px',
        margin: '0 0 32px 0'
      }}>
        {dict.email.confirmation.message}
      </p>

      {/* Reservation Details */}
      <div style={{
        backgroundColor: '#f8f9fa',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '24px',
        margin: '0 0 32px 0'
      }}>
        <h3 style={{
          color: '#1f2937',
          fontSize: '18px',
          fontWeight: '600',
          margin: '0 0 16px 0'
        }}>
          {dict.email.confirmation.details.service}
        </h3>
        
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{
                padding: '8px 0',
                borderBottom: '1px solid #e5e7eb',
                fontWeight: '500',
                width: '30%'
              }}>
                {dict.email.confirmation.details.service}:
              </td>
              <td style={{
                padding: '8px 0',
                borderBottom: '1px solid #e5e7eb'
              }}>
                {serviceName}
              </td>
            </tr>
            <tr>
              <td style={{
                padding: '8px 0',
                borderBottom: '1px solid #e5e7eb',
                fontWeight: '500'
              }}>
                {dict.email.confirmation.details.staff}:
              </td>
              <td style={{
                padding: '8px 0',
                borderBottom: '1px solid #e5e7eb'
              }}>
                {reservation.staff?.display_name || 'スタッフ'}
              </td>
            </tr>
            <tr>
              <td style={{
                padding: '8px 0',
                borderBottom: '1px solid #e5e7eb',
                fontWeight: '500'
              }}>
                {dict.email.confirmation.details.datetime}:
              </td>
              <td style={{
                padding: '8px 0',
                borderBottom: '1px solid #e5e7eb'
              }}>
                {formatDateTime(new Date(reservation.start_at), locale)}
              </td>
            </tr>
            <tr>
              <td style={{
                padding: '8px 0',
                borderBottom: '1px solid #e5e7eb',
                fontWeight: '500'
              }}>
                {dict.email.confirmation.details.duration}:
              </td>
              <td style={{
                padding: '8px 0',
                borderBottom: '1px solid #e5e7eb'
              }}>
                {formatDuration(reservation.service?.duration_min || 60, locale)}
              </td>
            </tr>
            <tr>
              <td style={{
                padding: '8px 0',
                fontWeight: '500'
              }}>
                {dict.email.confirmation.details.total}:
              </td>
              <td style={{
                padding: '8px 0',
                fontSize: '18px',
                fontWeight: '600',
                color: '#2563eb'
              }}>
                {formatPrice(reservation.total_amount, locale)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Calendar Links */}
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
          {dict.email.confirmation.calendar.title}
        </h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <a 
            href={calendarLinks.google}
            style={{
              display: 'inline-block',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              padding: '8px 16px',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            {dict.email.confirmation.calendar.google}
          </a>
          <a 
            href={calendarLinks.apple}
            style={{
              display: 'inline-block',
              backgroundColor: '#6b7280',
              color: '#ffffff',
              padding: '8px 16px',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            {dict.email.confirmation.calendar.apple}
          </a>
          <a 
            href={calendarLinks.ics}
            style={{
              display: 'inline-block',
              backgroundColor: '#059669',
              color: '#ffffff',
              padding: '8px 16px',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            {dict.email.confirmation.calendar.ics}
          </a>
        </div>
      </div>

      {/* Location */}
      <div style={{
        backgroundColor: '#f0fdf4',
        border: '1px solid #bbf7d0',
        borderRadius: '8px',
        padding: '20px',
        margin: '0 0 32px 0'
      }}>
        <h3 style={{
          color: '#166534',
          fontSize: '16px',
          fontWeight: '600',
          margin: '0 0 12px 0'
        }}>
          {dict.email.confirmation.location.title}
        </h3>
        <p style={{
          margin: '0 0 8px 0',
          fontSize: '14px'
        }}>
          {dict.email.confirmation.location.address}
        </p>
        <p style={{
          margin: 0,
          fontSize: '14px',
          color: '#166534'
        }}>
          {dict.email.confirmation.location.directions}
        </p>
      </div>

      {/* Notes */}
      <div style={{
        backgroundColor: '#fefce8',
        border: '1px solid #fde047',
        borderRadius: '8px',
        padding: '20px',
        margin: '0 0 32px 0'
      }}>
        <h3 style={{
          color: '#a16207',
          fontSize: '16px',
          fontWeight: '600',
          margin: '0 0 12px 0'
        }}>
          {dict.email.confirmation.notes.title}
        </h3>
        <ul style={{
          margin: 0,
          paddingLeft: '20px',
          fontSize: '14px'
        }}>
          {dict.email.confirmation.notes.items.map((item, index) => (
            <li key={index} style={{ marginBottom: '4px' }}>
              {item}
            </li>
          ))}
        </ul>
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
          {dict.email.confirmation.contact}
        </p>
        <p style={{
          margin: 0,
          fontSize: '14px',
          color: '#6b7280'
        }}>
          {dict.email.common.footer.phone}
        </p>
      </div>
    </EmailLayout>
  );
}