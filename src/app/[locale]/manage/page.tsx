import ManageReservationWidget from "@/components/manage/manage-widget";
import { getDictionary } from "@/i18n/dictionaries";

interface Props {
  params: Promise<{ locale: string }>;
  // Next.js 15: searchParams は非同期で渡されるため Promise を受け取る
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ManagePage({ params, searchParams }: Props) {
  const resolved = await params;
  const locale = resolved.locale;
  const dict = getDictionary(locale);
  const spRaw = (await searchParams) ?? {};
  const getStr = (v: string | string[] | undefined): string | undefined =>
    Array.isArray(v) ? v[0] : v;
  const initialCode = getStr(spRaw.code);
  const initialContact = getStr(spRaw.contact);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-10">
      <h1 className="text-2xl font-semibold text-slate-900">
        {dict.manage.title}
      </h1>
      <ManageReservationWidget
        locale={locale}
        dict={dict.manage}
        initialCode={initialCode}
        initialContact={initialContact}
      />
    </div>
  );
}
