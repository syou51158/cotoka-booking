import ManageReservationWidget from "@/components/manage/manage-widget";
import { getDictionary } from "@/i18n/dictionaries";

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function ManagePage({ params }: Props) {
  const resolved = await params;
  const locale = resolved.locale;
  const dict = getDictionary(locale);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-10">
      <h1 className="text-2xl font-semibold text-slate-900">
        {dict.manage.title}
      </h1>
      <ManageReservationWidget locale={locale} dict={dict.manage} />
    </div>
  );
}
