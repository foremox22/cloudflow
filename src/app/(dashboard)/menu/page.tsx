import Header from "@/components/layout/Header";
import MenuList from "@/components/menu/MenuList";

export default function MenuPage() {
  return (
    <>
      <Header title="Menu" />
      <div className="p-6">
        <MenuList />
      </div>
    </>
  );
}
