import Link from "next/link";
import { Button } from "@/components/ui/button";

interface HeroProps {
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref?: string;
  eyebrow?: string; // small step indicator above title
  secondaryCtaLabel?: string;
  secondaryCtaHref?: string;
}

export default function BookingHero({
  title,
  subtitle,
  ctaLabel,
  ctaHref = "#services",
  eyebrow,
  secondaryCtaLabel,
  secondaryCtaHref,
}: HeroProps) {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-white shadow-lg">
      <div className="grid items-center gap-6 p-6 md:grid-cols-2 md:p-10">
        <div className="space-y-3">
          {eyebrow ? (
            <p className="text-xs uppercase tracking-wide text-slate-500">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="text-2xl md:text-3xl font-semibold text-[var(--foreground)]">
            {title}
          </h1>
          <p className="text-sm md:text-base text-slate-600">{subtitle}</p>
          <div className="pt-2 flex gap-2">
            <Button
              asChild
              className="bg-[var(--primary)] text-[var(--primary-foreground)] hover:brightness-110"
            >
              <a href={ctaHref} aria-label={ctaLabel}>
                {ctaLabel}
              </a>
            </Button>
            {secondaryCtaLabel && secondaryCtaHref ? (
              <Button asChild variant="outline">
                <a href={secondaryCtaHref} aria-label={secondaryCtaLabel}>
                  {secondaryCtaLabel}
                </a>
              </Button>
            ) : null}
          </div>
        </div>
        <div className="relative h-32 md:h-40">
          <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(ellipse_at_top,_rgba(14,165,166,0.08),_transparent)]" />
          <svg
            className="absolute inset-0 h-full w-full opacity-40"
            viewBox="0 0 200 200"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <defs>
              <pattern
                id="dots"
                x="0"
                y="0"
                width="10"
                height="10"
                patternUnits="userSpaceOnUse"
              >
                <circle cx="1" cy="1" r="1" fill="#0EA5A6" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots)" />
          </svg>
        </div>
      </div>
    </section>
  );
}
