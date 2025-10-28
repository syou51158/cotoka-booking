import React from 'react';
import type { Dictionary } from '@/i18n/dictionaries';

interface EmailLayoutProps {
  children: React.ReactNode;
  dict: Dictionary;
  previewText?: string;
  brand?: {
    siteName?: string;
    addressLine?: string;
    phone?: string;
    websiteUrl?: string;
    mapUrl?: string;
  };
}

export function EmailLayout({ children, dict, previewText, brand }: EmailLayoutProps) {
  const siteName = brand?.siteName ?? dict.email.common.siteName;
  const salonAddressLine = brand?.addressLine ?? dict.email.common.footer.address;
  const salonPhoneLine = brand?.phone ?? dict.email.common.footer.phone;
  const salonWebsiteUrl = brand?.websiteUrl ?? dict.email.common.footer.website;
  const salonMapUrl = brand?.mapUrl ?? undefined;

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{siteName}</title>
        {previewText && (
          <div style={{ display: 'none', overflow: 'hidden', lineHeight: '1px', opacity: 0, maxHeight: 0, maxWidth: 0 }}>
            {previewText}
          </div>
        )}
      </head>
      <body style={{ 
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        lineHeight: '1.6',
        color: '#333333',
        backgroundColor: '#f8f9fa',
        margin: 0,
        padding: 0
      }}>
        <div style={{
          maxWidth: '600px',
          margin: '0 auto',
          backgroundColor: '#ffffff',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
        }}>
          {/* Header */}
          <div style={{
            backgroundColor: '#2563eb',
            color: '#ffffff',
            padding: '24px',
            textAlign: 'center'
          }}>
            <h1 style={{
              margin: 0,
              fontSize: '24px',
              fontWeight: '600'
            }}>
              {siteName}
            </h1>
          </div>

          {/* Content */}
          <div style={{ padding: '32px 24px' }}>
            {children}
          </div>

          {/* Footer */}
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '24px',
            borderTop: '1px solid #e5e7eb',
            fontSize: '14px',
            color: '#6b7280'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <strong>{siteName}</strong>
            </div>
            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
              {salonAddressLine}
            </div>
            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
              {salonPhoneLine}
            </div>
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <a href={salonWebsiteUrl} style={{ color: '#2563eb', textDecoration: 'none' }}>
              {salonWebsiteUrl}
            </a>
          </div>
          {salonMapUrl ? (
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <a href={salonMapUrl} target="_blank" rel="noreferrer" style={{ color: '#2563eb', textDecoration: 'none' }}>
                Google Map
              </a>
            </div>
          ) : null}
          <div style={{ textAlign: 'center', fontSize: '12px' }}>
            {dict.email.common.footer.unsubscribe}
          </div>
          </div>
        </div>
      </body>
    </html>
  );
}

// Helper function to format date with locale
export function formatDateTime(date: Date, locale: string): string {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Tokyo'
  };
  
  return new Intl.DateTimeFormat(locale, options).format(date);
}

// Helper function to format duration
export function formatDuration(minutes: number, locale: string): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (locale === 'ja') {
    if (hours > 0 && mins > 0) {
      return `${hours}時間${mins}分`;
    } else if (hours > 0) {
      return `${hours}時間`;
    } else {
      return `${mins}分`;
    }
  } else if (locale === 'zh') {
    if (hours > 0 && mins > 0) {
      return `${hours}小時${mins}分鐘`;
    } else if (hours > 0) {
      return `${hours}小時`;
    } else {
      return `${mins}分鐘`;
    }
  } else {
    // English
    if (hours > 0 && mins > 0) {
      return `${hours}h ${mins}min`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      return `${mins}min`;
    }
  }
}

// Helper function to format price
export function formatPrice(amount: number | null | undefined, locale: string): string {
  const safeAmount = amount ?? 0;
  if (locale === 'ja' || locale === 'zh') {
    return `¥${safeAmount.toLocaleString()}`;
  } else {
    return `¥${safeAmount.toLocaleString()}`;
  }
}