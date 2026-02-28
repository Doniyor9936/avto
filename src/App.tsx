import { useState } from "react";
import Inventory from "./components/Inventory";
import SoldCars from "./components/SoldCars";
import Expenses from "./components/Expenses";

export default function App() {
  const [page, setPage] = useState<"inventory" | "sold" | "expenses">("inventory");

  return (
    <div style={{ padding: 20 }}>
      <h1>🚗 AvtoSavdo CRM</h1>

      <div style={{ marginBottom: 20 }}>
        <button onClick={() => setPage("inventory")}>Inventar</button>
        <button onClick={() => setPage("sold")}>Sotilgan</button>
        <button onClick={() => setPage("expenses")}>Rasxodlar</button>
      </div>

      {page === "inventory" && <Inventory />}
      {page === "sold" && <SoldCars />}
      {page === "expenses" && <Expenses />}
    </div>
  );
}