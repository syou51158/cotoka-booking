import React from "react";
import {
  EmailLayout,
  formatDateTime,
  formatDuration,
  formatPrice,
} from "./EmailLayout";
import type { Dictionary } from "@/i18n/dictionaries";

interface ReminderEmailProps {
  dict: Dictionary;
  locale: string;
  type: "24h" | "2h";
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
  brand?: {
    siteName?: string;
    addressLine?: string;
    phone?: string;
    websiteUrl?: string;
  };
}

export function ReminderEmail({
  dict,
  locale,
  type,
  reservation,
  calendarLinks,
  brand,
}: ReminderEmailProps) {
  const serviceName = reservation.service?.name || "サービス";
  // subjectはレンダラー側で生成

  const title =
    type === "24h" ? dict.email.reminder.title24h : dict.email.reminder.title2h;

  const message =
    type === "24h"
      ? dict.email.reminder.message24h
      : dict.email.reminder.message2h;

  const salonAddressLine =
    brand?.addressLine ?? dict.email.confirmation.location.address;
  const salonPhoneLine = brand?.phone ?? dict.email.common.footer.phone;

  return (
    <EmailLayout
      dict={dict}
      previewText={`${title} - ${serviceName}`}
      brand={brand}
    >
      {/* Title */}
      <h2
        style={{
          color: "#1f2937",
          fontSize: "28px",
          fontWeight: "600",
          margin: "0 0 24px 0",
          textAlign: "center",
        }}
      >
        {title}
      </h2>

      {/* Greeting */}
      <p
        style={{
          fontSize: "16px",
          margin: "0 0 16px 0",
        }}
      >
        {dict.email.reminder.greeting.replace(
          "{customerName}",
          reservation.customer_name,
        )}
      </p>

      {/* Message */}
      <p
        style={{
          fontSize: "16px",
          margin: "0 0 32px 0",
        }}
      >
        {message}
      </p>

      {/* Reservation Summary */}
      <div
        style={{
          backgroundColor: "#f8f9fa",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          padding: "24px",
          margin: "0 0 32px 0",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            <tr>
              <td
                style={{
                  padding: "8px 0",
                  borderBottom: "1px solid #e5e7eb",
                  fontWeight: "500",
                  width: "30%",
                }}
              >
                サービス:
              </td>
              <td
                style={{
                  padding: "8px 0",
                  borderBottom: "1px solid #e5e7eb",
                }}
              >
                {serviceName}
              </td>
            </tr>
            <tr>
              <td
                style={{
                  padding: "8px 0",
                  borderBottom: "1px solid #e5e7eb",
                  fontWeight: "500",
                }}
              >
                担当:
              </td>
              <td
                style={{
                  padding: "8px 0",
                  borderBottom: "1px solid #e5e7eb",
                }}
              >
                {reservation.staff?.display_name || "スタッフ"}
              </td>
            </tr>
            <tr>
              <td
                style={{
                  padding: "8px 0",
                  fontWeight: "500",
                }}
              >
                日時:
              </td>
              <td
                style={{
                  padding: "8px 0",
                  fontSize: "18px",
                  fontWeight: "600",
                  color: "#dc2626",
                }}
              >
                {formatDateTime(new Date(reservation.start_at), locale)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Preparation Notes */}
      <div
        style={{
          backgroundColor: "#fefce8",
          border: "1px solid #fde047",
          borderRadius: "8px",
          padding: "20px",
          margin: "0 0 32px 0",
        }}
      >
        <h3
          style={{
            color: "#a16207",
            fontSize: "16px",
            fontWeight: "600",
            margin: "0 0 12px 0",
          }}
        >
          {dict.email.reminder.preparation.title}
        </h3>
        <ul
          style={{
            margin: 0,
            paddingLeft: "20px",
            fontSize: "14px",
          }}
        >
          {dict.email.reminder.preparation.items.map((item, index) => (
            <li key={index} style={{ marginBottom: "4px" }}>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Calendar Links */}
      <div
        style={{
          backgroundColor: "#eff6ff",
          border: "1px solid #bfdbfe",
          borderRadius: "8px",
          padding: "20px",
          margin: "0 0 32px 0",
        }}
      >
        <h3
          style={{
            color: "#1e40af",
            fontSize: "16px",
            fontWeight: "600",
            margin: "0 0 12px 0",
          }}
        >
          カレンダーで確認
        </h3>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <a
            href={calendarLinks.google}
            style={{
              display: "inline-block",
              backgroundColor: "#2563eb",
              color: "#ffffff",
              padding: "8px 16px",
              borderRadius: "6px",
              textDecoration: "none",
              fontSize: "14px",
              fontWeight: "500",
            }}
          >
            Googleカレンダー
          </a>
          <a
            href={calendarLinks.apple}
            style={{
              display: "inline-block",
              backgroundColor: "#6b7280",
              color: "#ffffff",
              padding: "8px 16px",
              borderRadius: "6px",
              textDecoration: "none",
              fontSize: "14px",
              fontWeight: "500",
            }}
          >
            Appleカレンダー
          </a>
        </div>
      </div>

      {/* Location Reminder */}
      <div
        style={{
          backgroundColor: "#f0fdf4",
          border: "1px solid #bbf7d0",
          borderRadius: "8px",
          padding: "20px",
          margin: "0 0 32px 0",
        }}
      >
        <h3
          style={{
            color: "#166534",
            fontSize: "16px",
            fontWeight: "600",
            margin: "0 0 12px 0",
          }}
        >
          アクセス
        </h3>
        <p
          style={{
            margin: "0 0 8px 0",
            fontSize: "14px",
          }}
        >
          {salonAddressLine}
        </p>
        <p
          style={{
            margin: 0,
            fontSize: "14px",
            color: "#166534",
          }}
        >
          {dict.email.confirmation.location.directions}
        </p>
      </div>

      {/* Contact */}
      <div
        style={{
          textAlign: "center",
          padding: "20px",
          backgroundColor: "#f8f9fa",
          borderRadius: "8px",
        }}
      >
        <p
          style={{
            margin: "0 0 8px 0",
            fontSize: "14px",
            fontWeight: "500",
          }}
        >
          ご質問やご変更がございましたら
        </p>
        <p
          style={{
            margin: 0,
            fontSize: "14px",
            color: "#6b7280",
          }}
        >
          {salonPhoneLine}
        </p>
      </div>
    </EmailLayout>
  );
}
