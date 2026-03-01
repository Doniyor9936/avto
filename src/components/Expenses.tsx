import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, orderBy, Timestamp } from 'firebase/firestore';
import { auth, db, type AppUser } from '../config';

interface Expense {
  id: string;
  category: string;
  amount: number;
  date: Timestamp;
  addedBy: string;
  description: string;
  status: 'tasdiqlanmagan' | 'tasdiqlangan' | 'rad_etilgan';
}

const CATEGORIES = ['Ijara', 'Maosh', 'Ta\'mirlash', 'Reklama', 'Yoqilg\'i', 'Kommunal', 'Boshqa'];

export default function Expenses({ user }: { user: AppUser }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [form, setForm] = useState({ category: 'Ijara', amount: 0, date: '', description: '' });

  useEffect(() => { loadExpenses(); }, []);

  const loadExpenses = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'expenses'), orderBy('date', 'desc')));
      setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Expense)));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addDoc(collection(db, 'expenses'), {
        category: form.category,
        amount: form.amount,
        date: Timestamp.fromDate(new Date(form.date || Date.now())),
        addedBy: user.displayName || '',
        description: form.description,
        status: 'tasdiqlanmagan',
      });
      showToast('✅ Rasxod qo\'shildi');
      setShowModal(false);
      setForm({ category: 'Ijara', amount: 0, date: '', description: '' });
      loadExpenses();
    } catch (e) { showToast('❌ Xatolik'); }
    setSaving(false);
  };

  const updateStatus = async (id: string, status: string) => {
    await updateDoc(doc(db, 'expenses', id), { status });
    showToast(status === 'tasdiqlangan' ? '✅ Tasdiqlandi' : '❌ Rad etildi');
    loadExpenses();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('O\'chirilsinmi?')) return;
    await deleteDoc(doc(db, 'expenses', id));
    showToast('🗑️ O\'chirildi');
    loadExpenses();
  };

  const filtered = expenses.filter(e => {
    const matchSearch = `${e.category} ${e.description} ${e.addedBy}`.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || e.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const total = filtered.reduce((s, e) => s + e.amount, 0);
  const statusBadge = { tasdiqlanmagan: 'badge-gold', tasdiqlangan: 'badge-green', rad_etilgan: 'badge-red' };
  const statusLabel = { tasdiqlanmagan: 'Tasdiqlanmagan', tasdiqlangan: 'Tasdiqlangan', rad_etilgan: 'Rad etilgan' };

  return (
    <div className="page-container">
      {toast && (
        <div className="toast-container">
          <div className={`toast ${toast.startsWith('❌') ? 'toast-error' : 'toast-success'}`}>{toast}</div>
        </div>
      )}

      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Rasxodlar</h1>
          <p className="page-subtitle">Jami: {total.toLocaleString()} so'm</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Rasxod Qo'shish</button>
      </div>

      <div className="filters-row">
        <div className="search-input">
          <input placeholder="Qidirish..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: '200px' }}>
          <option value="">Barcha holat</option>
          <option value="tasdiqlanmagan">Tasdiqlanmagan</option>
          <option value="tasdiqlangan">Tasdiqlangan</option>
          <option value="rad_etilgan">Rad etilgan</option>
        </select>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Kategoriya</th>
              <th>Summa</th>
              <th>Sana</th>
              <th>Kim kiritdi</th>
              <th>Tavsif</th>
              <th>Holat</th>
              {user.role === 'admin' && <th>Amal</th>}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>Yuklanmoqda...</td></tr>}
            {!loading && filtered.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>Rasxodlar yo'q</td></tr>}
            {filtered.map((exp, i) => {
              const date = exp.date?.toDate ? exp.date.toDate() : new Date();
              return (
                <tr key={exp.id}>
                  <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                  <td style={{ fontWeight: 600 }}>{exp.category}</td>
                  <td style={{ color: 'var(--accent-red)', fontWeight: 600 }}>−{exp.amount.toLocaleString()}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{date.toLocaleDateString('uz-UZ')}</td>
                  <td>{exp.addedBy}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{exp.description}</td>
                  <td><span className={`badge ${statusBadge[exp.status] || 'badge-gold'}`}>{statusLabel[exp.status] || exp.status}</span></td>
                  {user.role === 'admin' && (
                    <td>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {exp.status === 'tasdiqlanmagan' && (
                          <>
                            <button className="btn btn-sm" style={{ background: 'rgba(46,160,67,0.15)', color: 'var(--accent-green)', border: '1px solid rgba(46,160,67,0.3)' }} onClick={() => updateStatus(exp.id, 'tasdiqlangan')}>✓</button>
                            <button className="btn btn-sm btn-danger" onClick={() => updateStatus(exp.id, 'rad_etilgan')}>✕</button>
                          </>
                        )}
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(exp.id)}>🗑️</button>
                      </div>
                    </td>
                  )}
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
              <span className="modal-title">Yangi Rasxod</span>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Kategoriya *</label>
                    <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Summa (so'm) *</label>
                    <input type="number" required value={form.amount} onChange={e => setForm({ ...form, amount: +e.target.value })} min={0} />
                  </div>
                  <div className="form-group">
                    <label>Sana</label>
                    <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                  </div>
                  <div className="form-group full-width">
                    <label>Tavsif</label>
                    <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Nima uchun..." />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Bekor</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saqlanmoqda...' : 'Qo\'shish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}