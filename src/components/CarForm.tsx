import { useState } from "react";

interface CarFormProps {
  onSubmit: (model: string, price: string) => void;
}

export default function CarForm({ onSubmit }: CarFormProps) {
  const [model, setModel] = useState("");
  const [price, setPrice] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!model || !price) return alert("Model va Price kerak");
    onSubmit(model, price);
    setModel("");
    setPrice("");
  };

  return (
    <form onSubmit={handleSubmit}>
      <input placeholder="Model" value={model} onChange={e => setModel(e.target.value)} />
      <input placeholder="Price" value={price} onChange={e => setPrice(e.target.value)} />
      <button type="submit">Qo‘shish</button>
    </form>
  );
}