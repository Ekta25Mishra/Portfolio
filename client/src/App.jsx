import { useEffect, useState } from 'react';
import { NavLink, Outlet, Route, Routes, useLocation, Navigate } from 'react-router-dom';
import { api } from './api.js';
import { Icon } from './icons.jsx';
import ThemeControl from './ThemeControl.jsx';
import { PortfolioPage } from './pages.jsx';
import { AdminDashboard, AdminLogin } from './admin.jsx';

const navItems = [
  { label: 'Home', path: '/', icon: 'home' },
  { label: 'About', path: '/about', icon: 'about' },
  { label: 'Projects', path: '/projects', icon: 'projects' },
  { label: 'Contact', path: '/contact', icon: 'contact' }
];
const navSectionIds = navItems.map(({ path }) => path === '/' ? 'home' : path.slice(1));

function SiteNav() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const initialHash = window.location.hash.slice(1);
  const [activeSection, setActiveSection] = useState(() => navSectionIds.includes(initialHash) ? initialHash : 'home');

  useEffect(() => {
    setOpen(false);
    if (location.pathname !== '/') return undefined;

    const sections = navSectionIds.map((id) => document.getElementById(id)).filter(Boolean);
    if (!sections.length) return undefined;

    let frame = 0;
    const syncActiveSection = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const activationLine = Math.min(window.innerHeight * 0.35, 280);
        let currentSection = sections[0];

        for (const section of sections) {
          if (section.getBoundingClientRect().top <= activationLine) currentSection = section;
          else break;
        }

        const atPageBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
        if (atPageBottom) currentSection = sections[sections.length - 1];

        const sectionId = currentSection.id;
        setActiveSection((current) => current === sectionId ? current : sectionId);

        const nextUrl = `${window.location.pathname}${window.location.search}#${sectionId}`;
        if (window.location.hash !== `#${sectionId}`) {
          window.history.replaceState(window.history.state, '', nextUrl);
        }
      });
    };

    window.addEventListener('scroll', syncActiveSection, { passive: true });
    window.addEventListener('resize', syncActiveSection);

    const hashSection = location.hash.slice(1);
    if (navSectionIds.includes(hashSection)) setActiveSection(hashSection);
    else syncActiveSection();

    return () => {
      window.removeEventListener('scroll', syncActiveSection);
      window.removeEventListener('resize', syncActiveSection);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [location.pathname, location.hash]);

  function navigateToSection(event, section) {
    if (location.pathname !== '/') return;
    event.preventDefault();
    setActiveSection(section);
    document.getElementById(section)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}#${section}`);
    setOpen(false);
  }

  return (
    <header className="site-header">
      <nav className={`nav-pill${open ? ' nav-open' : ''}`} aria-label="Main navigation">
        <button className="menu-toggle icon-button" type="button" onClick={() => setOpen((value) => !value)} aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open}>
          <Icon name={open ? 'close' : 'menu'} />
        </button>
        <div className="nav-items">
          {navItems.map(({ label, path, icon }) => (
            <a key={path} href={`/#${path === '/' ? 'home' : path.slice(1)}`} onClick={(event) => navigateToSection(event, path === '/' ? 'home' : path.slice(1))} className={`nav-link${location.pathname === '/' && activeSection === (path === '/' ? 'home' : path.slice(1)) ? ' active' : ''}`} aria-current={location.pathname === '/' && activeSection === (path === '/' ? 'home' : path.slice(1)) ? 'location' : undefined}>
              <Icon name={icon} size={15} /><span>{label}</span>
            </a>
          ))}
          <ThemeControl />
          <NavLink to="/admin/login" className={({ isActive }) => `nav-link${location.pathname.startsWith('/admin') && isActive ? ' active' : ''}`}>
            <Icon name="lock" size={15} /><span>Admin</span>
          </NavLink>
        </div>
      </nav>
    </header>
  );
}

function SiteLayout() {
  const location = useLocation();
  useEffect(() => {
    if (location.pathname !== '/' || !location.hash) return;
    const section = decodeURIComponent(location.hash.slice(1));
    window.requestAnimationFrame(() => document.getElementById(section)?.scrollIntoView({ block: 'start' }));
  }, [location.pathname, location.hash]);
  return <><SiteNav /><main className="site-main"><Outlet /></main></>;
}

function ProtectedAdmin() {
  const [session, setSession] = useState('checking');
  const location = useLocation();

  useEffect(() => {
    let alive = true;
    api('/admin/check-session').then(() => alive && setSession('valid')).catch(() => alive && setSession('invalid'));
    return () => { alive = false; };
  }, [location.pathname]);

  if (session === 'checking') return <div className="page-status" role="status">Checking admin session…</div>;
  if (session === 'invalid') return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  return <AdminDashboard />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route index element={<PortfolioPage />} />
        <Route path="about" element={<Navigate to="/#about" replace />} />
        <Route path="projects" element={<Navigate to="/#projects" replace />} />
        <Route path="contact" element={<Navigate to="/#contact" replace />} />
        <Route path="admin/login" element={<AdminLogin />} />
      </Route>
      <Route path="admin/*" element={<ProtectedAdmin />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
