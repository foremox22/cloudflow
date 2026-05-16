import Header from "@/components/layout/Header";
import TransactionHistory from "@/components/pos/TransactionHistory";

export const metadata = { title: "Sales" };

export default function HistoryPage() {
  return (
    <>
      <Header title="POS — Sales" />
      <div className="flex-1 overflow-y-auto">
        <TransactionHistory />
      </div>
    </>
  );
}
