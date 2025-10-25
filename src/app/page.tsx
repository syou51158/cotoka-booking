import { redirect } from "next/navigation";
import { DEFAULT_LOCALE } from "@/lib/config";

export default function HomePage() {
  redirect(`/${DEFAULT_LOCALE}/booking`);
}
