import { Suspense } from "react";
import Header from "@/components/layout/Header";
import SupplierList from "@/components/suppliers/SupplierList";

export default function SuppliersPage() {
  return (
    <>
      <Header title="Suppliers & Purchase Orders" />
      <Suspense>
        <SupplierList />
      </Suspense>
    </>
  );
}
