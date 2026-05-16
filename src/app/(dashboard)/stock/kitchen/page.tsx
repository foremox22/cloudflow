import Header from "@/components/layout/Header";
import KitchenStockList from "@/components/stock/KitchenStockList";

export default function KitchenStockPage() {
  return (
    <>
      <Header title="Kitchen Stock" />
      <div className="p-6">
        <KitchenStockList />
      </div>
    </>
  );
}
