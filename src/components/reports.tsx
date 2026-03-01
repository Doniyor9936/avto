import React, { useState, useEffect } from 'react';
import { collection, getDocs, query } from 'firebase/firestore';
import { db, type AppUser } from '../config';

const MONTHS = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyu', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];

export default function Reports({ user }: { user: AppUser }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState({
    monthlyRevenue: Array(12).fill(0),
    monthlyProfit: Array(12).fill(0),
    monthlyExpenses: Array(12).fill(0),
    employeeStats: [] as { name: string; count: number; profit: number }[],
    topModels: [] as { name: string; count: number }[],
    categoryExpenses: [] as { category: string; amount: number }[],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadReports(); }, [year]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const [salesSnap, expSnap] = await Promise.all([
        getDocs(query(collection(db, 'soldCars'))),
        getDocs(query(collection(db, 'expenses'))),
      ]);

      const monthlyRevenue = Array(12).fill(0);
      const monthlyProfit = Array(12).fill(0);
      const empMap: Record<string, { count: number; profit: number }> = {};
      const modelMap: Record<string, number> = {};

      salesSnap.forEach(d => {
        const s = d.data();
        const date = s.date?.toDate ? s.date.toDate() : new Date(s.date);
        if (date.getFullYear() !== year) return;
        const m = date.getMonth();
        monthlyRevenue[m] += s.price || 0;
        monthlyProfit[m] += s.profit || 0;
        const emp = s.employeeName || 'Noma\'lum';
        if (!empMap[emp]) empMap[emp] = { count: 0, profit: 0 };
        empMap[emp].count++;
        empMap[emp].profit += s.profit || 0;
        const model = s.carName?.split(' ').slice(0, 2).join(' ') || 'Boshqa';
        modelMap[model] = (modelMap[model] || 0) + 1;
      });

      const monthlyExpenses = Array(12).fill(0);
      const catMap: Record<string, number> = {};
      expSnap.forEach(d => {
        const e = d.data();
        const date = e.date?.toDate ? e.date.toDate() : new Date(e.date);
        if (date.getFullYear() !== year) return;
        const m = date.getMonth();
        monthlyExpenses[m] += e.amount || 0;
        catMap[e.category] = (catMap[e.category] || 0) + (e.amount || 0);
      });

      setData({
        monthlyRevenue,
        monthlyProfit,
        monthlyExpenses,
        employeeStats: Object.entries(empMap).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.count - a.count),
        topModels: Object.entries(modelMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5),
        categoryExpenses: Object.entries(catMap).map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount),
      });
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const totalRevenue = data.monthlyRevenue.reduce((s, v) => s + v, 0);
  const totalProfit = data.monthlyProfit.reduce((s, v) => s + v, 0);
  const totalExpenses = data.monthlyExpenses.reduce((s, v) => s + v, 0);
  const totalSales = data.employeeStats.reduce((s, e) => s + e.count, 0);

  const maxRevenue = Math.max(...data.monthlyRevenue, 1);
  const maxProfit = Math.max(...data.monthlyProfit, 1);

  const fmt = (n: number) => n >= 1_000_000 ? (n / 1_000_000).toFixed(1) + 'M' : n >= 1_000 ? (n / 1_000).toFixed(0) + 'K' : n.toString();

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Hisobotlar</h1>
          <p className="page-subtitle">Tahlil va statistika</p>
        </div>
        <select value={year} onChange={e => setYear(+e.target.value)} style={{ width: '120px' }}>
          {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Summary */}
      <div className="stat-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card gold">
          <p className="stat-label">Jami Sotuv</p>
          <p className="stat-value">{totalSales}</p>
          <p className="stat-meta">{year} yil</p>
        </div>
        <div className="stat-card green">
          <p className="stat-label">Umumiy Daromad</p>
          <p className="stat-value">{fmt(totalRevenue)}</p>
          <p className="stat-meta">so'm</p>
        </div>
        <div className="stat-card blue">
          <p className="stat-label">Sof Foyda</p>
          <p className="stat-value">{fmt(totalProfit)}</p>
          <p className="stat-meta">so'm</p>
        </div>
        <div className="stat-card red">
          <p className="stat-label">Umumiy Rasxod</p>
          <p className="stat-value">{fmt(totalExpenses)}</p>
          <p className="stat-meta">so'm</p>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="two-col" style={{ marginBottom: '20px' }}>
        <div className="card">
          <p className="card-title" style={{ marginBottom: '20px' }}>Oylik Daromad Grafigi — {year}</p>
          <div className="chart-bars">
            {data.monthlyRevenue.map((val, i) => (
              <div key={i} className="chart-bar-group">
                <div
                  className={`chart-bar ${i === new Date().getMonth() && year === new Date().getFullYear() ? 'current' : ''}`}
                  style={{ height: `${(val / maxRevenue) * 100}%`, minHeight: '4px' }}
                  title={`${MONTHS[i]}: ${val.toLocaleString()}`}
                />
                <span className="chart-bar-label">{MONTHS[i]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <p className="card-title" style={{ marginBottom: '20px' }}>Oylik Foyda</p>
          <div className="chart-bars">
            {data.monthlyProfit.map((val, i) => (
              <div key={i} className="chart-bar-group">
                <div
                  className="chart-bar"
                  style={{ height: `${(val / maxProfit) * 100}%`, minHeight: '4px', background: 'var(--accent-green)', opacity: 0.7 }}
                  title={`${MONTHS[i]}: ${val.toLocaleString()}`}
                />
                <span className="chart-bar-label">{MONTHS[i]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Employee Stats + Top Models */}
      <div className="two-col" style={{ marginBottom: '20px' }}>
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <p className="card-title">Xodimlar Statistikasi</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Xodim</th>
                <th>Sotuvlar</th>
                <th>Foyda</th>
              </tr>
            </thead>
            <tbody>
              {data.employeeStats.length === 0 && (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>Ma'lumot yo'q</td></tr>
              )}
              {data.employeeStats.map((emp, i) => (
                <tr key={emp.name}>
                  <td><span className={`rank-badge rank-${Math.min(i + 1, 3)}`}>{i + 1}</span></td>
                  <td style={{ fontWeight: 600 }}>{emp.name}</td>
                  <td style={{ color: 'var(--accent-gold)' }}>{emp.count} ta</td>
                  <td style={{ color: 'var(--accent-green)' }}>{fmt(emp.profit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <p className="card-title" style={{ marginBottom: '16px' }}>Rasxodlar Kategoriyasi</p>
          {data.categoryExpenses.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Ma'lumot yo'q</p>}
          {data.categoryExpenses.map((cat, i) => {
            const pct = totalExpenses ? (cat.amount / totalExpenses) * 100 : 0;
            return (
              <div key={cat.category} style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>{cat.category}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{fmt(cat.amount)} ({pct.toFixed(0)}%)</span>
                </div>
                <div style={{ height: '6px', background: 'var(--bg-secondary)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: 'var(--accent-red)', borderRadius: '3px', opacity: 0.8 }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Models */}
      <div className="card">
        <p className="card-title" style={{ marginBottom: '16px' }}>Eng Ko'p Sotiladigan Markalar</p>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {data.topModels.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Ma'lumot yo'q</p>}
          {data.topModels.map((m, i) => (
            <div key={m.name} style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              padding: '12px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}>
              <span className={`rank-badge rank-${Math.min(i + 1, 3)}`}>{i + 1}</span>
              <div>
                <p style={{ fontWeight: 600, fontSize: '0.925rem' }}>{m.name}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{m.count} ta sotildi</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}