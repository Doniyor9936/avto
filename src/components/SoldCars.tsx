import { useEffect, useState } from "react";
import { collection, addDoc, onSnapshot, Query, type DocumentData } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";


interface SoldCar {
  id: string;
  carModel: string;
  buyerName: string;
  buyerPhone: string;
  salePrice: string;
  costPrice: string;
  profit: string;
  date: string;
  note?: string;
}

export default function SoldCars() {
  const [soldCars, setSoldCars] = useState<SoldCar[]>([]);
  const [carModel, setCarModel] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState("");

  const soldRef = collection(db, "soldCars");

  // Real-time ma’lumot olish
  useEffect(() => {
    const q: Query<DocumentData> = soldRef;
    const unsub = onSnapshot(q, snapshot => {
      setSoldCars(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as SoldCar)));
    });
    return () => unsub();
  }, []);

  // Sotilgan mashina qo‘shish
  const addSoldCar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!carModel || !buyerName || !salePrice || !costPrice || !date)
      return alert("Barcha majburiy maydonlar to‘ldirilishi kerak");
    
    const profit = (parseFloat(salePrice) - parseFloat(costPrice)).toString();

    await addDoc(soldRef, { carModel, buyerName, buyerPhone, salePrice, costPrice, profit, date, note });
    
    setCarModel("");
    setBuyerName("");
    setBuyerPhone("");
    setSalePrice("");
    setCostPrice("");
    setNote("");
    setDate("");
  };

  return (
    <div>
      <h3>Sotilgan Mashinalar</h3>
      <form onSubmit={addSoldCar}>
        <input placeholder="Mashina modeli" value={carModel} onChange={e => setCarModel(e.target.value)} />
        <input placeholder="Xaridor ismi" value={buyerName} onChange={e => setBuyerName(e.target.value)} />
        <input placeholder="Xaridor telefoni" value={buyerPhone} onChange={e => setBuyerPhone(e.target.value)} />
        <input placeholder="Sotish narxi" value={salePrice} onChange={e => setSalePrice(e.target.value)} />
        <input placeholder="Tan narx (cost price)" value={costPrice} onChange={e => setCostPrice(e.target.value)} />
        <input placeholder="Sana" type="date" value={date} onChange={e => setDate(e.target.value)} />
        <input placeholder="Izoh (ixtiyoriy)" value={note} onChange={e => setNote(e.target.value)} />
        <button type="submit">Qo‘shish</button>
      </form>

      <ul>
        {soldCars.map(car => (
          <li key={car.id}>
            {car.date} | {car.carModel} | Xaridor: {car.buyerName} | Tel: {car.buyerPhone} | Sotish narxi: {car.salePrice} | Tan narx: {car.costPrice} | Foyda: {car.profit} | {car.note}
          </li>
        ))}
      </ul>
    </div>
  );
}