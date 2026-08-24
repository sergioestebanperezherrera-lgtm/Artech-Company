import { notFound } from "next/navigation";
import { AdminModulePlaceholder } from "@/components/admin";
import { getAdminItemBySlug } from "@/components/admin/adminNavigation";

type AdminSectionPageProps = {
  params: Promise<{
    section: string;
  }>;
};

export default async function AdminSectionPage({
  params,
}: AdminSectionPageProps) {
  const { section } = await params;

  if (!getAdminItemBySlug(section)) {
    notFound();
  }

  return <AdminModulePlaceholder slug={section} />;
}
