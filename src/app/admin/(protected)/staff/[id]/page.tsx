import { notFound } from "next/navigation";
import { getStaffWithDetails } from "../actions";
import EditStaffForm from "./edit-staff-form";

export default async function EditStaffPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const staff = await getStaffWithDetails(params.id);

  if (!staff) {
    notFound();
  }

  return <EditStaffForm staff={staff} />;
}
