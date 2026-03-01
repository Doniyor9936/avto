import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, doc, updateDoc, query, orderBy, Timestamp } from 'firebase/firestore';
import { db, type AppUser } from '../config';

interface SoldCar {
  id: string;
  carId: string;
  carName: string;
  buyerName: string;
  buyerPhone: string;
  buyerPassport: string;
  price: number;
  cost: number;
  profit: number;
  paymentType: 'naqd' | 'muddatli' | 'bank';
  employeeName: string;
  employeeId: string;
  date: Timestamp;
  contractNumber: string;
  notes: string;
}

interface InventoryCar {
  id: string;
  make: string;
  model: string;
  year: number;
  costPrice: number;
  status: string;
}

export default function SoldCars({ user }: { user: AppUser }) {
  const [sales, setSales] = useState<SoldCar[]>([]);
  const [inventory, setInventory] = useState<InventoryCar[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [form, setForm] = useState({
    carId: '', buyerName: '', buyerPhone: '', buyerPassport: '',
    price: 0, paymentType: 'naqd' as const,
    contractNumber: '', notes: '',
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [salesSnap, invSnap] = await Promise.all([
        getDocs(query(collection(db, 'soldCars'), orderBy('date', 'desc'))),
        getDocs(collection(db, 'inventory')),
      ]);
      setSales(salesSnap.docs.map(d => ({ id: d.id, ...d.data() } as SoldCar)));
      setInventory(
        invSnap.docs
          .map(d => ({ id: d.id, ...d.data() } as InventoryCar))
          .filter(c => c.status === 'mavjud')
      );
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const selectedCar = inventory.find(c => c.id === form.carId);
  const profit = selectedCar ? form.price - selectedCar.costPrice : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCar) return;
    setSaving(true);
    try {
      const saleData = {
        carId: form.carId,
        carName: `${selectedCar.make} ${selectedCar.model} (${selectedCar.year})`,
        buyerName: form.buyerName,
        buyerPhone: form.buyerPhone,
        buyerPassport: form.buyerPassport,
        price: form.price,
        cost: selectedCar.costPrice,
        profit,
        paymentType: form.paymentType,
        employeeName: user.displayName || '',
        employeeId: user.uid,
        date: Timestamp.now(),
        contractNumber: form.contractNumber,
        notes: form.notes,
      };
      await addDoc(collection(db, 'soldCars'), saleData);
      // Update inventory status
      await updateDoc(doc(db, 'inventory', form.carId), { status: 'sotilgan' });
      showToast('✅ Sotuv qayd etildi');
      setShowModal(false);
      setForm({ carId: '', buyerName: '', buyerPhone: '', buyerPassport: '', price: 0, paymentType: 'naqd', contractNumber: '', notes: '' });
      loadData();
    } catch (e) { console.error(e); showToast('❌ Xatolik yuz berdi'); }
    setSaving(false);
  };

  const filtered = sales.filter(s =>
    `${s.carName} ${s.buyerName} ${s.employeeName}`.toLowerCase().includes(search.toLowerCase())
  );

  const paymentLabels = { naqd: 'Naqd', muddatli: 'Muddatli', bank: 'Bank o\'tkazmasi' };
  const paymentBadge = { naqd: 'badge-green', muddatli: 'badge-gold', bank: 'badge-blue' };

  return (
    <div className="page-container">
      {toast && (
        <div className="toast-container">
          <div className={`toast ${toast.startsWith('❌') ? 'toast-error' : 'toast-success'}`}>{toast}</div>
        </div>
      )}

      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Sotilgan Mashinalar</h1>
          <p className="page-subtitle">Jami {sales.length} ta sotuv qayd etilgan</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Sotuv Qayd Etish</button>
      </div>

      <div className="filters-row">
        <div className="search-input">
          <input placeholder="Qidirish..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Mashina</th>
              <th>Xaridor</th>
              <th>Narxi</th>
              <th>To'lov turi</th>
              <th>Xodim</th>
              <th>Sana</th>
              <th>Foyda</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>Yuklanmoqda...</td></tr>}
            {!loading && filtered.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>Sotuvlar yo'q</td></tr>}
            {filtered.map((sale, i) => {
              const date = sale.date?.toDate ? sale.date.toDate() : new Date();
              return (
                <tr key={sale.id}>
                  <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                  <td style={{ fontWeight: 600 }}>{sale.carName}</td>
                  <td>
                    <span>{sale.buyerName}</span>
                    {sale.buyerPhone && <><br /><span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sale.buyerPhone}</span></>}
                  </td>
                  <td style={{ color: 'var(--accent-gold)', fontWeight: 600 }}>{sale.price.toLocaleString()}</td>
                  <td><span className={`badge ${paymentBadge[sale.paymentType] || 'badge-blue'}`}>{paymentLabels[sale.paymentType] || sale.paymentType}</span></td>
                  <td>{sale.employeeName}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{date.toLocaleDateString('uz-UZ')}</td>
                  <td style={{ color: sale.profit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 600 }}>
                    {sale.profit > 0 ? '+' : ''}{sale.profit.toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Sotuv Qayd Etish</span>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label>Mashina *</label>
                    <select required value={form.carId} onChange={e => setForm({ ...form, carId: e.target.value })}>
                      <option value="">Mashina tanlang...</option>
                      {inventory.map(c => (
                        <option key={c.id} value={c.id}>{c.make} {c.model} ({c.year}) — tannarx: {c.costPrice.toLocaleString()}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Xaridor ismi *</label>
                    <input required value={form.buyerName} onChange={e => setForm({ ...form, buyerName: e.target.value })} placeholder="To'liq ismi..." />
                  </div>
                  <div className="form-group">
                    <label>Telefon</label>
                    <input value={form.buyerPhone} onChange={e => setForm({ ...form, buyerPhone: e.target.value })} placeholder="+998..." />
                  </div>
                  <div className="form-group">
                    <label>Passport (ixtiyoriy)</label>
                    <input value={form.buyerPassport} onChange={e => setForm({ ...form, buyerPassport: e.target.value })} placeholder="AA 1234567" />
                  </div>
                  <div className="form-group">
                    <label>To'lov turi</label>
                    <select value={form.paymentType} onChange={e => setForm({ ...form, paymentType: e.target.value as any })}>
                      <option value="naqd">Naqd</option>
                      <option value="muddatli">Muddatli</option>
                      <option value="bank">Bank o'tkazmasi</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Sotish narxi (so'm) *</label>
                    <input type="number" required value={form.price} onChange={e => setForm({ ...form, price: +e.target.value })} min={0} />
                  </div>
                  <div className="form-group">
                    <label>Shartnoma raqami</label>
                    <input value={form.contractNumber} onChange={e => setForm({ ...form, contractNumber: e.target.value })} placeholder="2024-001" />
                  </div>
                  <div className="form-group">
                    <label>Foyda (avtomatik)</label>
                    <div style={{
                      padding: '10px 14px',
                      background: 'var(--bg-secondary)',
                      border: `1px solid ${profit >= 0 ? 'rgba(46,160,67,0.4)' : 'rgba(248,81,73,0.4)'}`,
                      borderRadius: '8px',
                      fontFamily: 'Bebas Neue, sans-serif',
                      fontSize: '1.2rem',
                      color: profit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
                    }}>
                      {profit > 0 ? '+' : ''}{profit.toLocaleString()} so'm
                    </div>
                  </div>
                  <div className="form-group full-width">
                    <label>Izoh</label>
                    <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Qo'shimcha ma'lumot..." />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Bekor</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saqlanmoqda...' : 'Sotuvni Qayd Etish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}