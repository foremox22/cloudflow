import Header from "@/components/layout/Header";
import FohStockList from "@/components/stock/FohStockList";

export default function FohStockPage() {
  return (
    <>
      <Header title="FOH Stock" />
      <div className="p-6">
        <FohStockList />
      </div>
    </>
  );
}
