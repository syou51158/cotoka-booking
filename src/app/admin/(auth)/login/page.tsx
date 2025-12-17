import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { login } from "./actions";

async function loginAction(formData: FormData) {
  "use server";
  const res = await login(formData);
  if (res && "error" in res) {
    redirect("/admin/login?error=passcode_invalid");
  }
}

export default async function AdminLoginPage(props: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const searchParams = await props.searchParams;

  if (await isAdminAuthenticated()) {
    redirect("/admin");
  }

  return (
    <div className="mx-auto flex min-h-[80vh] w-full max-w-md items-center px-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>管理ダッシュボード</CardTitle>
          <CardDescription>パスコードを入力してください。</CardDescription>
        </CardHeader>
        <CardContent>
          {searchParams?.error === "passcode_invalid" && (
            <p className="mb-2 text-sm text-red-500">
              パスコードが正しくありません。
            </p>
          )}
          <form action={loginAction} className="space-y-4">
            <Input
              name="passcode"
              type="password"
              placeholder="パスコード"
              required
            />
            <Button type="submit" className="w-full">
              ログイン
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
