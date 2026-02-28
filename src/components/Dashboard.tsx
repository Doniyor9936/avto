import Inventory from "./Inventory";
import SoldCars from "./SoldCars";
import Expenses from "./Expenses";

export default function Dashboard() {
  return (
    <div>
      <h2>Dashboard</h2>
      <Inventory />
      <SoldCars />
      <Expenses />
    </div>
  );
}