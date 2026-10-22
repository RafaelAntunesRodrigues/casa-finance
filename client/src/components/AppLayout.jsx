import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';

function initials(name) {
  if (!name) return '?';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">CF</div>
          <div>
            <strong>CasaFinance</strong>
            <span>Nossa casa</span>
          </div>
        </div>
        <nav>
          <NavLink to="/" end className={({ isActive }) => `nav${isActive ? ' active' : ''}`}>
            ⌂ <span>Dashboard</span>
          </NavLink>
          <NavLink to="/movimentacoes" className={({ isActive }) => `nav${isActive ? ' active' : ''}`}>
            ↕ <span>Movimentações</span>
          </NavLink>
          <NavLink to="/categorias" className={({ isActive }) => `nav${isActive ? ' active' : ''}`}>
            ▦ <span>Categorias</span>
          </NavLink>
          <NavLink to="/metas" className={({ isActive }) => `nav${isActive ? ' active' : ''}`}>
            ◎ <span>Metas</span>
          </NavLink>
          <NavLink to="/pessoal" className={({ isActive }) => `nav${isActive ? ' active' : ''}`}>
            ◐ <span>Pessoal</span>
          </NavLink>
        </nav>
        <button className="user-card" onClick={handleLogout} title="Sair">
          <div className="avatar">{initials(user?.name)}</div>
          <div>
            <strong>{user?.name}</strong>
            <span>Sair</span>
          </div>
        </button>
      </aside>

      <main>
        <Outlet />
      </main>

      <nav className="bottom-nav">
        <NavLink to="/" end className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}>
          <span className="icon">⌂</span>
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/movimentacoes" className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}>
          <span className="icon">↕</span>
          <span>Movimentos</span>
        </NavLink>
        <NavLink to="/categorias" className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}>
          <span className="icon">▦</span>
          <span>Categorias</span>
        </NavLink>
        <NavLink to="/metas" className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}>
          <span className="icon">◎</span>
          <span>Metas</span>
        </NavLink>
        <NavLink to="/pessoal" className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}>
          <span className="icon">◐</span>
          <span>Pessoal</span>
        </NavLink>
        <button className="bottom-nav-item" onClick={handleLogout}>
          <span className="icon">⏻</span>
          <span>Sair</span>
        </button>
      </nav>
    </div>
  );
}
