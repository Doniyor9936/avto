import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, Timestamp, query, orderBy } from 'firebase/firestore';
import { db, type AppUser } from '../config';

interface InventoryCar {
  id: string;
  make: string;
  model: string;
  year: number;
  color: string;
  mileage: number;
  engineSize: number;
  transmission: 'avtomat' | 'mexanik';
  purchasePrice: number;
  extraCosts: number;
  costPrice: number;
  status: 'mavjud' | 'sotilgan' | 'kutmoqda';
  addedBy: string;
  dateAdded: Timestamp;
  notes: string;
}

type CarStatus = 'mavjud' | 'sotilgan' | 'kutmoqda';
type Transmission = 'avtomat' | 'mexanik';

interface CarForm {
  make: string; model: string; year: number; color: string;
  mileage: number; engineSize: number; transmission: Transmission;
  purchasePrice: number; extraCosts: number; notes: string; status: CarStatus;
}

const emptyForm: CarForm = {
  make: '', model: '', year: new Date().getFullYear(), color: '',
  mileage: 0, engineSize: 1.5, transmission: 'avtomat',
  purchasePrice: 0, extraCosts: 0, notes: '', status: 'mavjud',
};

export default function Inventory({ user }: { user: AppUser }) {
  const [cars, setCars] = useState<InventoryCar[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editCar, setEditCar] = useState<InventoryCar | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => { loadCars(); }, []);

  const loadCars = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'inventory'), orderBy('dateAdded', 'desc')));
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as InventoryCar));
      setCars(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const openAdd = () => {
    setEditCar(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (car: InventoryCar) => {
    setEditCar(car);
    setForm({
      make: car.make, model: car.model, year: car.year, color: car.color,
      mileage: car.mileage, engineSize: car.engineSize, transmission: car.transmission as Transmission,
      purchasePrice: car.purchasePrice, extraCosts: car.extraCosts,
      notes: car.notes, status: car.status as CarStatus,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const costPrice = form.purchasePrice + form.extraCosts;
    try {
      if (editCar) {
        await updateDoc(doc(db, 'inventory', editCar.id), {
          ...form, costPrice,
        });
        showToast('✅ Mashina yangilandi');
      } else {
        await addDoc(collection(db, 'inventory'), {
          ...form, costPrice,
          addedBy: user.displayName || user.email || '',
          dateAdded: Timestamp.now(),
        });
        showToast('✅ Mashina qo\'shildi');
      }
      setShowModal(false);
      loadCars();
    } catch (e) { console.error(e); showToast('❌ Xatolik yuz berdi'); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Mashina o\'chirilsinmi?')) return;
    await deleteDoc(doc(db, 'inventory', id));
    showToast('🗑️ Mashina o\'chirildi');
    loadCars();
  };

  const filtered = cars.filter(c => {
    const matchSearch = `${c.make} ${c.model} ${c.color}`.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const statusLabel = { mavjud: 'Mavjud', sotilgan: 'Sotilgan', kutmoqda: 'Kutmoqda' };
  const statusBadge = { mavjud: 'badge-green', sotilgan: 'badge-gold', kutmoqda: 'badge-blue' };

  return (
    <div className="page-container">
      {toast && (
        <div className="toast-container">
          <div className={`toast ${toast.startsWith('❌') ? 'toast-error' : 'toast-success'}`}>{toast}</div>
        </div>
      )}

      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Sotuvdagi Mashinalar</h1>
          <p className="page-subtitle">Inventar boshqaruvi — {cars.filter(c => c.status === 'mavjud').length} ta mavjud</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ Mashina Qo'shish</button>
      </div>

      <div className="filters-row">
        <div className="search-input">
          <input
            placeholder="Qidirish (marka, model, rang)..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: '160px' }}>
          <option value="">Barcha holat</option>
          <option value="mavjud">Mavjud</option>
          <option value="sotilgan">Sotilgan</option>
          <option value="kutmoqda">Kutmoqda</option>
        </select>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Mashina</th>
              <th>Yil / Rang</th>
              <th>Probeg</th>
              <th>Kirish narxi</th>
              <th>Tannarx</th>
              <th>Holati</th>
              <th>Qo'shgan</th>
              <th>Amal</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>Yuklanmoqda...</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>Mashinalar yo'q</td></tr>
            )}
            {filtered.map((car, i) => (
              <tr key={car.id}>
                <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                <td>
                  <span style={{ fontWeight: 600 }}>{car.make} {car.model}</span>
                  <br />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{car.engineSize}L • {car.transmission}</span>
                </td>
                <td>{car.year} / {car.color}</td>
                <td>{car.mileage.toLocaleString()} km</td>
                <td style={{ color: 'var(--accent-gold)' }}>{car.purchasePrice.toLocaleString()}</td>
                <td style={{ color: 'var(--text-primary)' }}>{car.costPrice.toLocaleString()}</td>
                <td><span className={`badge ${statusBadge[car.status]}`}>{statusLabel[car.status]}</span></td>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{car.addedBy}</td>
                <td>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => openEdit(car)}>✏️</button>
                    {user.role === 'admin' && (
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(car.id)}>🗑️</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">{editCar ? 'Mashinani tahrirlash' : 'Yangi mashina qo\'shish'}</span>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Marka *</label>
                    <input required value={form.make} onChange={e => setForm({ ...form, make: e.target.value })} placeholder="Toyota, Chevrolet..." />
                  </div>
                  <div className="form-group">
                    <label>Model *</label>
                    <input required value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} placeholder="Camry, Nexia..." />
                  </div>
                  <div className="form-group">
                    <label>Yil *</label>
                    <input type="number" required value={form.year} onChange={e => setForm({ ...form, year: +e.target.value })} min={1990} max={2030} />
                  </div>
                  <div className="form-group">
                    <label>Rang</label>
                    <input value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} placeholder="Oq, Qora, Kumush..." />
                  </div>
                  <div className="form-group">
                    <label>Probeg (km)</label>
                    <input type="number" value={form.mileage} onChange={e => setForm({ ...form, mileage: +e.target.value })} min={0} />
                  </div>
                  <div className="form-group">
                    <label>Dvigatel hajmi (L)</label>
                    <input type="number" step="0.1" value={form.engineSize} onChange={e => setForm({ ...form, engineSize: +e.target.value })} min={0.5} max={6} />
                  </div>
                  <div className="form-group">
                    <label>Transmissiya</label>
                    <select value={form.transmission} onChange={e => setForm({ ...form, transmission: e.target.value as Transmission })}>
                      <option value="avtomat">Avtomat</option>
                      <option value="mexanik">Mexanik</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Holati</label>
                    <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as CarStatus })}>
                      <option value="mavjud">Mavjud</option>
                      <option value="kutmoqda">Kutmoqda</option>
                      <option value="sotilgan">Sotilgan</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Kirish narxi (so'm) *</label>
                    <input type="number" required value={form.purchasePrice} onChange={e => setForm({ ...form, purchasePrice: +e.target.value })} min={0} />
                  </div>
                  <div className="form-group">
                    <label>Qo'shimcha xarajatlar (so'm)</label>
                    <input type="number" value={form.extraCosts} onChange={e => setForm({ ...form, extraCosts: +e.target.value })} min={0} />
                  </div>
                  <div className="form-group full-width" style={{ background: 'rgba(201,162,39,0.08)', borderRadius: '8px', padding: '12px', border: '1px solid rgba(201,162,39,0.2)' }}>
                    <label style={{ color: 'var(--accent-gold)' }}>Tannarx (avtomatik)</label>
                    <p style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.5rem', color: 'var(--accent-gold)', marginTop: '4px' }}>
                      {(form.purchasePrice + form.extraCosts).toLocaleString()} so'm
                    </p>
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
                  {saving ? 'Saqlanmoqda...' : editCar ? 'Yangilash' : 'Qo\'shish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}