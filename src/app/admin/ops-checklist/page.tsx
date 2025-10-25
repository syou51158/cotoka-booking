import OpsChecklistView from "./ops-checklist-view";
import AdminProtectedLayout from "../(protected)/layout";

export default function AdminOpsChecklistPage() {
  return (
    <AdminProtectedLayout>
      <OpsChecklistView />
    </AdminProtectedLayout>
  );
}
