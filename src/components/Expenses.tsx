import { useEffect, useState } from "react";
import { collection, addDoc, onSnapshot, Query, type DocumentData } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

interface Expense {
  id: string;
  category: string;
  amount: string;
  description: string;
  date: string;
}

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [category, setCategory] = useState("Ijara");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");

  const expensesRef = collection(db, "expenses");

  // Real-time ma’lumot olish
  useEffect(() => {
    const q: Query<DocumentData> = expensesRef;
    const unsubscribe = onSnapshot(q, snapshot => {
      setExpenses(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Expense)));
    });
    return () => unsubscribe();
  }, []);

  // Rasxod qo‘shish
  const addExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !date) return alert("Summasi va sanasi kerak");
    await addDoc(expensesRef, { category, amount, description, date });
    setAmount("");
    setDescription("");
    setDate("");
    setCategory("Ijara");
  };

  return (
    <div>
      <h3>Rasxodlar</h3>
      <form onSubmit={addExpense}>
        <select value={category} onChange={e => setCategory(e.target.value)}>
          <option>Ijara</option>
          <option>Maosh</option>
          <option>Ta’mirlash</option>
          <option>Reklama</option>
          <option>Boshqa</option>
        </select>
        <input placeholder="Summasi" value={amount} onChange={e => setAmount(e.target.value)} />
        <input placeholder="Sanasi" type="date" value={date} onChange={e => setDate(e.target.value)} />
        <input placeholder="Tavsif (ixtiyoriy)" value={description} onChange={e => setDescription(e.target.value)} />
        <button type="submit">Qo‘shish</button>
      </form>

      <ul>
        {expenses.map(exp => (
          <li key={exp.id}>
            {exp.date} | {exp.category} | {exp.amount} | {exp.description}
          </li>
        ))}
      </ul>
    </div>
  );
}