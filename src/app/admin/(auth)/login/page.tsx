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

export default function AdminLoginPage() {
  if (isAdminAuthenticated()) {
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
          <form action={login} className="space-y-4">
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
