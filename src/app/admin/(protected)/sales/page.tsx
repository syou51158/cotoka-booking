import { SalesApprovalList } from "@/components/admin/sales-approval-list";
import { MonthlyClosingPanel } from "@/components/admin/monthly-closing-panel";
import { getPendingEntries, SalesEntryWithStaff } from "./actions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireAdmin } from "@/lib/admin-auth";

export default async function SalesAdminPage() {
    await requireAdmin();
    
    let initialEntries: SalesEntryWithStaff[] = [];
    try {
        initialEntries = await getPendingEntries();
    } catch (e) {
        // Handle error silently or pass to component
        console.error("Failed to fetch pending entries", e);
    }

    return (
        <div className="container py-10 space-y-6">
            <h1 className="text-3xl font-bold">売上管理</h1>
            
            <Tabs defaultValue="approvals">
                <TabsList>
                    <TabsTrigger value="approvals">日報承認</TabsTrigger>
                    <TabsTrigger value="closing">月次締め</TabsTrigger>
                </TabsList>
                
                <TabsContent value="approvals" className="space-y-4">
                    <SalesApprovalList initialEntries={initialEntries} />
                </TabsContent>
                
                <TabsContent value="closing" className="space-y-4">
                    <MonthlyClosingPanel />
                </TabsContent>
            </Tabs>
        </div>
    );
}
