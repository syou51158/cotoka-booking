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
    customer_phone?: string | null;
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
  viewUrl?: string;
  manageUrl?: string;
  ttlDays?: number;
  brand?: {
    siteName?: string;
    addressLine?: string;
    phone?: string;
    websiteUrl?: string;
    mapUrl?: string;
  };
}

export function ConfirmationEmail({ 
  dict, 
  locale, 
  reservation, 
  calendarLinks,
  viewUrl,
  manageUrl,
  ttlDays,
  brand,
}: ConfirmationEmailProps) {
  const serviceName = reservation.service?.name || 'サービス';
  const salonAddressLine = brand?.addressLine ?? dict.email.confirmation.location.address;
  const salonPhoneLine = brand?.phone ?? dict.email.common.footer.phone;
  const mapUrl = brand?.mapUrl || 'https://maps.app.goo.gl/ryN3rccBSiaD6FSR8';

  const maskPhone = (phone: string | null | undefined): string | null => {
    if (!phone) return null;
    const digits = phone.replace(/\D+/g, '');
    const tail = digits.slice(-4);
    return `***-***-${tail}`;
  };
  
  return (
    <EmailLayout 
      dict={dict} 
      previewText={`${dict.email.confirmation.title} - ${serviceName}`}
      brand={brand}
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

      {/* Reservation Code (prominent) */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '16px',
        margin: '0 0 24px 0'
      }}>
        <span style={{
          display: 'inline-block',
          fontWeight: 700,
          color: '#111827',
          marginRight: '8px'
        }}>
          {dict.email.confirmation.codeLabel}:
        </span>
        <span style={{
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
          fontWeight: 700,
          color: '#111827'
        }} aria-label={dict.email.confirmation.codeLabel}>
          {reservation.code}
        </span>
      </div>

      {/* View Online CTA */}
      {viewUrl && (
        <div style={{ textAlign: 'center', margin: '0 0 24px 0' }}>
          <a
            href={viewUrl}
            style={{
              display: 'inline-block',
              backgroundColor: '#0ea5e9',
              color: '#ffffff',
              padding: '10px 18px',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: '600'
            }}
            aria-label={dict.email.confirmation.cta.view}
          >
            {dict.email.confirmation.cta.view}
          </a>
        </div>
      )}

      {/* Manage CTA + help text */}
      {manageUrl && (
        <div style={{ textAlign: 'center', margin: '0 0 24px 0' }}>
          <a
            href={manageUrl}
            style={{
              display: 'inline-block',
              backgroundColor: '#10b981',
              color: '#ffffff',
              padding: '10px 18px',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: '600'
            }}
            aria-label={dict.email.confirmation.cta.manage}
          >
            {dict.email.confirmation.cta.manage}
          </a>
          <p style={{
            margin: '8px 0 0 0',
            fontSize: '12px',
            color: '#6b7280'
          }}>
            {dict.email.confirmation.cta.manageHelp}
          </p>
        </div>
      )}

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

      {/* Registered Contact info */}
      <div style={{
        backgroundColor: '#f8fafc',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '16px',
        margin: '0 0 32px 0'
      }}>
        <h3 style={{
          color: '#1f2937',
          fontSize: '16px',
          fontWeight: 600,
          margin: '0 0 8px 0'
        }}>
          {dict.email.confirmation.registeredContact.title}
        </h3>
        <p style={{ margin: 0, fontSize: '14px', color: '#374151' }}>
          {dict.email.confirmation.registeredContact.email}: {reservation.customer_email}
        </p>
        {reservation.customer_phone ? (
          <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#374151' }}>
            {dict.email.confirmation.registeredContact.phone}: {maskPhone(reservation.customer_phone)}
          </p>
        ) : null}
      </div>

      {/* Location / Access */}
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
          {salonAddressLine}
        </p>
        <p style={{
          margin: 0,
          fontSize: '14px',
          color: '#166534'
        }}>
          {dict.email.confirmation.location.directions}
        </p>
        {dict.email.confirmation.location.instructions ? (
          <p style={{
            margin: '8px 0 0 0',
            fontSize: '14px',
            color: '#374151'
          }}>
            {dict.email.confirmation.location.instructions}
          </p>
        ) : null}
        <div style={{ marginTop: '12px' }}>
          <a
            href={mapUrl}
            style={{
              display: 'inline-block',
              backgroundColor: '#22c55e',
              color: '#ffffff',
              padding: '8px 14px',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 500
            }}
            aria-label={dict.email.confirmation.location.mapLinkText}
          >
            {dict.email.confirmation.location.mapLinkText}
          </a>
        </div>
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

      {/* TTL note near footer */}
      {typeof ttlDays === 'number' && ttlDays > 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '8px',
          margin: '0 0 16px 0',
          fontSize: '12px',
          color: '#6b7280'
        }}>
          {dict.email.confirmation.ttlNote.replace('{days}', String(ttlDays))}
        </div>
      ) : null}

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
          {salonPhoneLine}
        </p>
      </div>
    </EmailLayout>
  );
}