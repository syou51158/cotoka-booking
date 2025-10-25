"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SUPPORTED_LOCALES } from "@/lib/config";

interface Props {
  currentLocale: string;
}

export default function LocaleSwitcher({ currentLocale }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  return (
    <Select
      defaultValue={currentLocale}
      onValueChange={(locale) => {
        startTransition(() => {
          const segments = pathname ? pathname.split("/") : [""];
          if (
            segments.length > 1 &&
            SUPPORTED_LOCALES.includes(
              segments[1] as (typeof SUPPORTED_LOCALES)[number],
            )
          ) {
            segments[1] = locale;
          } else {
            segments.splice(1, 0, locale);
          }
          const next = segments.join("/") || "/";
          router.push(next);
        });
      }}
      disabled={pending}
    >
      <SelectTrigger className="h-8 w-[110px] border-slate-300 text-xs">
        <SelectValue placeholder="locale" />
      </SelectTrigger>
      <SelectContent className="text-xs">
        {SUPPORTED_LOCALES.map((locale) => (
          <SelectItem key={locale} value={locale}>
            {locale.toUpperCase()}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
