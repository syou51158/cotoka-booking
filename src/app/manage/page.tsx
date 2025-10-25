import { redirect } from "next/navigation";
import { DEFAULT_LOCALE } from "@/lib/config";

export default function ManageRedirectPage() {
  redirect(`/${DEFAULT_LOCALE}/manage`);
}