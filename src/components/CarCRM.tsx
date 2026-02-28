import { useEffect, useState } from "react";
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, where, Query, type DocumentData } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import CarForm from "./CarForm";

interface Car {
  id: string;
  model: string;
  price: string;
}

export default function CarCRM() {
  const [cars, setCars] = useState<Car[]>([]);
  const [search, setSearch] = useState("");

  const carsRef = collection(db, "cars");

  // Real-time query
  useEffect(() => {
    const q: Query<DocumentData> = search ? query(carsRef, where("model", "==", search)) : carsRef;
    const unsubscribe = onSnapshot(q, snapshot => {
      setCars(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as Car));
    });
    return () => unsubscribe();
  }, [search]);

  const addCar = async (model: string, price: string) => {
    await addDoc(carsRef, { model, price });
  };

  const deleteCar = async (id: string) => {
    await deleteDoc(doc(db, "cars", id));
  };

  return (
    <div>
      <h1>Avto CRM</h1>
      <input placeholder="Search by model" value={search} onChange={e => setSearch(e.target.value)} />
      <CarForm onSubmit={addCar} />
      <ul>
        {cars.map(car => (
          <li key={car.id}>
            {car.model} - {car.price}
            <button onClick={() => deleteCar(car.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}