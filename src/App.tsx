import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, type AppUser } from './config';
import Dashboard  from './components/Dashboard';
import Inventory  from './components/Inventory';
import SoldCars   from './components/SoldCars';
import Expenses   from './components/Expenses';
import Auth       from './components/Auth';
import './styles/App.css';
import Employees from './components/Employes';
import Reports from './components/reports';

// ─── Sahifa turlari ──────────────────────────────────────────────────────────
export type Page =
  | 'dashboard'
  | 'inventory'
  | 'sold'
  | 'expenses'
  | 'reports'
  | 'employees';

// ─── Nav item ────────────────────────────────────────────────────────────────
interface NavItem {
  id: Page;
  label: string;
  icon: string;
  group: string;
}

// ─── Barcha foydalanuvchilar uchun nav ───────────────────────────────────────
const BASE_NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard',            icon: '📊', group: 'ASOSIY'    },
  { id: 'inventory', label: 'Sotuvdagi Mashinalar', icon: '🚗', group: 'SAVDO'     },
  { id: 'sold',      label: 'Sotilgan Mashinalar',  icon: '✅', group: 'SAVDO'     },
  { id: 'expenses',  label: 'Rasxodlar',            icon: '💸', group: 'MOLIYA'    },
  { id: 'reports',   label: 'Hisobotlar',           icon: '📋', group: 'MOLIYA'    },
];

// ─── Faqat admin uchun nav ───────────────────────────────────────────────────
const ADMIN_NAV: NavItem[] = [
  { id: 'employees', label: 'Xodimlar', icon: '👥', group: 'BOSHQARUV' },
];

const NAV_GROUPS = ['ASOSIY', 'SAVDO', 'MOLIYA', 'BOSHQARUV'] as const;

// ─── App ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [user,        setUser       ] = useState<AppUser | null>(null);
  const [loading,     setLoading    ] = useState(true);
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Firebase Auth holati kuzatish
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid:         firebaseUser.uid,
          email:       firebaseUser.email,
          displayName: firebaseUser.displayName
                         ?? firebaseUser.email?.split('@')[0]
                         ?? 'Foydalanuvchi',
          role: 'admin', // Haqiqiy loyihada Firestore dan roli yuklanadi
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Chiqish
  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
  };

  // ── Yuklanish ekrani ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-logo">
          <span className="logo-avto">Avto</span>
          <span className="logo-savdo">Savdo</span>
        </div>
        <div className="loading-spinner" />
      </div>
    );
  }

  // ── Login sahifasi ─────────────────────────────────────────────────────────
  if (!user) {
    return <Auth onLogin={setUser} />;
  }

  // ── Nav items (rolga qarab) ────────────────────────────────────────────────
  const navItems: NavItem[] =
    user.role === 'admin'
      ? [...BASE_NAV, ...ADMIN_NAV]
      : BASE_NAV;

  // ── Foydalanuvchi avatari (ismi birinchi harfi) ────────────────────────────
  const avatarLetter = (user.displayName ?? 'A')[0].toUpperCase();

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="app-layout">

      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>

        {/* Logo */}
        <div className="sidebar-header">
          <div className="brand">
            <span className="brand-avto">Avto</span>
            <span className="brand-savdo">Savdo</span>
          </div>
          <p className="brand-sub">CRM v1.0</p>
        </div>

        {/* Navigatsiya */}
        <nav className="sidebar-nav">
          {NAV_GROUPS.map((group) => {
            const items = navItems.filter((n) => n.group === group);
            if (!items.length) return null;

            return (
              <div key={group} className="nav-group">
                <p className="nav-group-label">{group}</p>

                {items.map((item) => (
                  <button
                    key={item.id}
                    className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
                    onClick={() => setCurrentPage(item.id)}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    <span className="nav-label">{item.label}</span>
                  </button>
                ))}
              </div>
            );
          })}
        </nav>

        {/* Foydalanuvchi info + chiqish */}
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{avatarLetter}</div>
            <div>
              <p className="user-name">{user.displayName}</p>
              <p className="user-role">
                {user.role === 'admin' ? 'Administrator' : 'Xodim'}
              </p>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            Chiqish
          </button>
        </div>

      </aside>

      {/* ── Asosiy kontent ────────────────────────────────────────────────── */}
      <main className="main-content">

        {/* Sidebar ochish/yopish tugmasi */}
        <button
          className="sidebar-toggle"
          onClick={() => setSidebarOpen((prev) => !prev)}
          aria-label="Sidebar toggle"
        >
          {sidebarOpen ? '◀' : '▶'}
        </button>

        {/* Sahifalar */}
        {currentPage === 'dashboard' && <Dashboard user={user} />}
        {currentPage === 'inventory' && <Inventory user={user} />}
        {currentPage === 'sold'      && <SoldCars  user={user} />}
        {currentPage === 'expenses'  && <Expenses  user={user} />}
        {currentPage === 'reports'   && <Reports   user={user} />}
        {currentPage === 'employees' && <Employees user={user} />}

      </main>
    </div>
  );
}