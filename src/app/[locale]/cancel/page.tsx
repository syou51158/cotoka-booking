import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDictionary } from "@/i18n/dictionaries";

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function CancelPage({ params }: Props) {
  const resolved = await params;
  const locale = resolved.locale;
  const dict = getDictionary(locale);
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-2xl items-center px-4 py-16">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-slate-900">
            決済をキャンセルしました
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-sm text-slate-600">
          <p>{dict.status.cancel}</p>
          <Button asChild className="w-full sm:w-auto">
            <Link href={`/${locale}/booking`}>空き枠を探す</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
