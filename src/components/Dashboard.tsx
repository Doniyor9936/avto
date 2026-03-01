import  { useState, useEffect } from 'react';
import { collection, query, getDocs, where, Timestamp } from 'firebase/firestore';
import { db, type AppUser } from '../config';


interface DashboardProps {
  user: AppUser;
}

interface SaleRecord {
  id: string;
  carName: string;
  buyerName: string;
  price: number;
  cost: number;
  profit: number;
  employeeName: string;
  date: Timestamp;
}

interface EmployeeStat {
  name: string;
  count: number;
}

const MONTHS = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyu', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K';
  return n.toString();
}

export default function Dashboard({ user }: DashboardProps) {
  const [stats, setStats] = useState({
    monthlySales: 0,
    netProfit: 0,
    inventoryCount: 0,
    totalExpenses: 0,
  });
  const [monthlyData, setMonthlyData] = useState<number[]>(Array(12).fill(0));
  const [topEmployees, setTopEmployees] = useState<EmployeeStat[]>([]);
  const [recentSales, setRecentSales] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Monthly sales count
      const startOfMonth = new Date(currentYear, currentMonth, 1);
      const soldQuery = query(collection(db, 'soldCars'));
      const soldSnap = await getDocs(soldQuery);
      
      let monthlySales = 0;
      let netProfit = 0;
      const monthCounts: number[] = Array(12).fill(0);
      const empMap: Record<string, number> = {};
      const sales: SaleRecord[] = [];

      soldSnap.forEach(doc => {
        const d = doc.data();
        const date = d.date?.toDate ? d.date.toDate() : new Date(d.date);
        const month = date.getMonth();
        const year = date.getFullYear();

        if (year === currentYear) {
          monthCounts[month]++;
          if (month === currentMonth) {
            monthlySales++;
            netProfit += (d.profit || 0);
          }
        }

        // Track employee
        if (d.employeeName) {
          empMap[d.employeeName] = (empMap[d.employeeName] || 0) + 1;
        }

        sales.push({
          id: doc.id,
          carName: d.carName || '',
          buyerName: d.buyerName || '',
          price: d.price || 0,
          cost: d.cost || 0,
          profit: d.profit || 0,
          employeeName: d.employeeName || '',
          date: d.date,
        });
      });

      // Inventory count
      const invQuery = query(collection(db, 'inventory'), where('status', '==', 'mavjud'));
      const invSnap = await getDocs(invQuery);

      // Expenses
      const expQuery = query(collection(db, 'expenses'));
      const expSnap = await getDocs(expQuery);
      let totalExp = 0;
      expSnap.forEach(doc => {
        const d = doc.data();
        const date = d.date?.toDate ? d.date.toDate() : new Date(d.date);
        if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
          totalExp += d.amount || 0;
        }
      });

      // Top employees
      const top = Object.entries(empMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

      // Recent sales sorted
      const recent = sales
        .sort((a, b) => {
          const da = a.date?.toDate ? a.date.toDate() : new Date();
          const db2 = b.date?.toDate ? b.date.toDate() : new Date();
          return db2.getTime() - da.getTime();
        })
        .slice(0, 8);

      setStats({
        monthlySales,
        netProfit,
        inventoryCount: invSnap.size,
        totalExpenses: totalExp,
      });
      setMonthlyData(monthCounts);
      setTopEmployees(top);
      setRecentSales(recent);
    } catch (err) {
      console.error('Dashboard load error:', err);
    }
    setLoading(false);
  };

  const maxBar = Math.max(...monthlyData, 1);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Joriy holat va statistika</p>
      </div>

      {/* Stat Cards */}
      <div className="stat-grid">
        <div className="stat-card gold">
          <p className="stat-label">Oylik Sotuv</p>
          <p className="stat-value">{stats.monthlySales}</p>
          <p className="stat-meta">{MONTHS[currentMonth]} oyida sotilgan</p>
        </div>
        <div className="stat-card green">
          <p className="stat-label">Sof Foyda</p>
          <p className="stat-value">{formatNum(stats.netProfit)}</p>
          <p className="stat-meta">so'm (oy)</p>
        </div>
        <div className="stat-card blue">
          <p className="stat-label">Mavjud Mashinalar</p>
          <p className="stat-value">{stats.inventoryCount}</p>
          <p className="stat-meta">inventarda</p>
        </div>
        <div className="stat-card red">
          <p className="stat-label">Umumiy Rasxod</p>
          <p className="stat-value">{formatNum(stats.totalExpenses)}</p>
          <p className="stat-meta">so'm (oy)</p>
        </div>
      </div>

      {/* Chart + Top Sellers */}
      <div className="two-col" style={{ marginBottom: '20px' }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
            <div>
              <p className="card-title">Oylik Sotuv Grafigi</p>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Savdo hajmi (soni)</p>
            </div>
            <span className="chart-growth">↑ {currentYear} yil</span>
          </div>
          <div className="chart-bars">
            {monthlyData.map((val, i) => (
              <div key={i} className="chart-bar-group">
                <div
                  className={`chart-bar ${i === currentMonth ? 'current' : ''}`}
                  style={{ height: `${(val / maxBar) * 100}%`, minHeight: '4px' }}
                  title={`${MONTHS[i]}: ${val} ta`}
                />
                <span className="chart-bar-label">{MONTHS[i]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <p className="card-title" style={{ marginBottom: '20px' }}>Top Sotuvchilar</p>
          {topEmployees.length === 0 && !loading && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Ma'lumot yo'q</p>
          )}
          {topEmployees.map((emp, i) => (
            <div key={emp.name} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 0',
              borderBottom: i < topEmployees.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <div>
                <p style={{ fontWeight: 600, fontSize: '0.925rem' }}>{emp.name}</p>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>{emp.count} ta mashina</p>
              </div>
              <span className={`rank-badge rank-${i + 1}`}>{i + 1}-o'rin</span>
            </div>
          ))}
          {topEmployees.length === 0 && loading && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Yuklanmoqda...</p>
          )}
        </div>
      </div>

      {/* Recent Sales */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border)' }}>
          <p className="card-title">So'nggi Sotuvlar</p>
        </div>
        <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Mashina</th>
                <th>Xaridor</th>
                <th>Narxi</th>
                <th>Xodim</th>
                <th>Sana</th>
                <th>Foyda</th>
              </tr>
            </thead>
            <tbody>
              {recentSales.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px' }}>
                    {loading ? 'Yuklanmoqda...' : 'Sotuvlar yo\'q'}
                  </td>
                </tr>
              )}
              {recentSales.map(sale => {
                const date = sale.date?.toDate ? sale.date.toDate() : new Date();
                return (
                  <tr key={sale.id}>
                    <td style={{ fontWeight: 600 }}>{sale.carName}</td>
                    <td>{sale.buyerName}</td>
                    <td style={{ color: 'var(--accent-gold)' }}>{formatNum(sale.price)} so'm</td>
                    <td>{sale.employeeName}</td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {date.toLocaleDateString('uz-UZ')}
                    </td>
                    <td style={{ color: sale.profit > 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                      {sale.profit > 0 ? '+' : ''}{formatNum(sale.profit)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}