import type { Metadata } from "next";
import {
  AdminAccessBoundary,
  AdminProvider,
} from "@/components/admin";
import "./admin.css";

export const metadata: Metadata = {
  title: "Administración | Artech",
  description: "Panel administrativo de Artech.",
};

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <AdminProvider>
      <AdminAccessBoundary>{children}</AdminAccessBoundary>
    </AdminProvider>
  );
}
