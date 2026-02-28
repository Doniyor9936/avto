import { useEffect, useState } from "react";
import { collection, addDoc, onSnapshot, Query, type DocumentData } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import CarForm from "./CarForm";

interface Car {
  id: string;
  model: string;
  price: string;
}

export default function Inventory() {
  const [cars, setCars] = useState<Car[]>([]);
  const carsRef = collection(db, "cars");

  useEffect(() => {
    const q: Query<DocumentData> = carsRef;
    const unsub = onSnapshot(q, snapshot => {
      setCars(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Car)));
    });
    return () => unsub();
  }, []);

  const addCar = async (model: string, price: string) => {
    await addDoc(carsRef, { model, price });
  };

  return (
    <div>
      <h3>Inventory (Sotuvga kelgan mashinalar)</h3>
      <CarForm onSubmit={addCar} />
      <ul>
        {cars.map(car => (
          <li key={car.id}>{car.model} - {car.price}</li>
        ))}
      </ul>
    </div>
  );
}