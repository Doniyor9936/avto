import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db, type AppUser } from '../config';


interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'admin' | 'employee';
  position: string;
  dateAdded: any;
  active: boolean;
}

export default function Employees({ user }: { user: AppUser }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [form, setForm] = useState({ name: '', email: '', phone: '', role: 'employee' as const, position: '', password: '' });

  useEffect(() => { loadEmployees(); }, []);

  const loadEmployees = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'employees'), orderBy('dateAdded', 'desc')));
      setEmployees(snap.docs.map(d => ({ id: d.id, ...d.data() } as Employee)));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Create Firebase Auth user
      await createUserWithEmailAndPassword(auth, form.email, form.password);
      // Save to Firestore
      await addDoc(collection(db, 'employees'), {
        name: form.name,
        email: form.email,
        phone: form.phone,
        role: form.role,
        position: form.position,
        active: true,
        dateAdded: new Date(),
      });
      showToast('✅ Xodim qo\'shildi');
      setShowModal(false);
      setForm({ name: '', email: '', phone: '', role: 'employee', position: '', password: '' });
      loadEmployees();
    } catch (err: any) {
      showToast(`❌ Xatolik: ${err.message}`);
    }
    setSaving(false);
  };

  const toggleActive = async (id: string, active: boolean) => {
    await updateDoc(doc(db, 'employees', id), { active: !active });
    loadEmployees();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Xodim o\'chirilsinmi?')) return;
    await deleteDoc(doc(db, 'employees', id));
    showToast('🗑️ Xodim o\'chirildi');
    loadEmployees();
  };

  return (
    <div className="page-container">
      {toast && (
        <div className="toast-container">
          <div className={`toast ${toast.startsWith('❌') ? 'toast-error' : 'toast-success'}`}>{toast}</div>
        </div>
      )}

      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Xodimlar</h1>
          <p className="page-subtitle">Jami {employees.length} ta xodim</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Xodim Qo'shish</button>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Ism</th>
              <th>Email</th>
              <th>Telefon</th>
              <th>Lavozim</th>
              <th>Rol</th>
              <th>Holat</th>
              <th>Amal</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>Yuklanmoqda...</td></tr>}
            {!loading && employees.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>Xodimlar yo'q</td></tr>}
            {employees.map((emp, i) => (
              <tr key={emp.id}>
                <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '8px',
                      background: emp.role === 'admin' ? 'var(--accent-gold)' : 'var(--accent-blue)',
                      color: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: '0.8rem', flexShrink: 0,
                    }}>
                      {emp.name[0]?.toUpperCase()}
                    </div>
                    <span style={{ fontWeight: 600 }}>{emp.name}</span>
                  </div>
                </td>
                <td style={{ color: 'var(--text-muted)' }}>{emp.email}</td>
                <td>{emp.phone}</td>
                <td>{emp.position}</td>
                <td>
                  <span className={`badge ${emp.role === 'admin' ? 'badge-gold' : 'badge-blue'}`}>
                    {emp.role === 'admin' ? 'Admin' : 'Xodim'}
                  </span>
                </td>
                <td>
                  <span className={`badge ${emp.active ? 'badge-green' : 'badge-red'}`}>
                    {emp.active ? 'Faol' : 'Nofaol'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => toggleActive(emp.id, emp.active)}>
                      {emp.active ? '⏸' : '▶'}
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(emp.id)}>🗑️</button>
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
              <span className="modal-title">Yangi Xodim Qo'shish</span>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label>To'liq ism *</label>
                    <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Sardor Adminov" />
                  </div>
                  <div className="form-group">
                    <label>Lavozim</label>
                    <input value={form.position} onChange={e => setForm({ ...form, position: e.target.value })} placeholder="Menejer, Sotuvchi..." />
                  </div>
                  <div className="form-group">
                    <label>Email *</label>
                    <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="xodim@avtosavdo.uz" />
                  </div>
                  <div className="form-group">
                    <label>Parol *</label>
                    <input type="password" required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Kamida 6 belgi" minLength={6} />
                  </div>
                  <div className="form-group">
                    <label>Telefon</label>
                    <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+998901234567" />
                  </div>
                  <div className="form-group">
                    <label>Rol</label>
                    <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value as any })}>
                      <option value="employee">Xodim</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Bekor</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Qo\'shilmoqda...' : 'Xodim Qo\'shish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}