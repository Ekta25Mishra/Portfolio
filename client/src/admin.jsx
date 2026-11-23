import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { api, json } from './api.js';
import { Icon } from './icons.jsx';
import ThemeControl from './ThemeControl.jsx';

export function AdminLogin() {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      await api('/admin/login', { method: 'POST', body: JSON.stringify(credentials) });
      navigate('/admin/dashboard/home', { replace: true });
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <span className="eyebrow">Portfolio admin</span>
        <h1>Sign in</h1>
        <label>Username<input value={credentials.username} onChange={(event) => setCredentials({ ...credentials, username: event.target.value })} autoComplete="username" required maxLength="128" /></label>
        <label>Password<input type="password" value={credentials.password} onChange={(event) => setCredentials({ ...credentials, password: event.target.value })} autoComplete="current-password" required maxLength="256" /></label>
        {message && <p className="form-result error" role="alert">{message}</p>}
        <button className="button button-primary login-submit" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <Link className="back-link" to="/">Back to portfolio</Link>
      </form>
    </section>
  );
}

const sections = [
  ['home', 'Home details'],
  ['resume', 'Resume'],
  ['about', 'About'],
  ['projects', 'Projects'],
  ['messages', 'Messages']
];

const blankEducation = { degree: '', institution: '', years: '', notes: '' };
const blankProject = { name: '', githubUrl: '', description: '', status: 'Planned' };

function AdminSectionTitle({ title, description }) {
  return <div className="admin-section-title"><h2>{title}</h2>{description && <p>{description}</p>}</div>;
}

export function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const section = useMemo(() => sections.find(([key]) => location.pathname.endsWith(`/${key}`))?.[0] || 'home', [location.pathname]);
  const [data, setData] = useState({ profile: null, education: [], resume: null, projects: [], messages: [] });
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState({ kind: '', text: '' });
  const [working, setWorking] = useState(false);

  async function loadAll() {
    const [profileData, projects, messages] = await Promise.all([api('/profile'), api('/projects'), api('/admin/messages')]);
    setData({ ...profileData, projects, messages });
  }

  useEffect(() => {
    let alive = true;
    Promise.all([api('/profile'), api('/projects'), api('/admin/messages')]).then(([profileData, projects, messages]) => {
      if (alive) setData({ ...profileData, projects, messages });
    }).catch((error) => alive && setNotice({ kind: 'error', text: error.message })).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  async function perform(action, successText) {
    setWorking(true);
    setNotice({ kind: '', text: '' });
    try {
      await action();
      if (successText) setNotice({ kind: 'success', text: successText });
      return true;
    } catch (error) {
      setNotice({ kind: 'error', text: error.message });
      return false;
    } finally {
      setWorking(false);
    }
  }

  async function logout() {
    try { await api('/admin/logout', { method: 'POST' }); } finally { navigate('/admin/login', { replace: true }); }
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link to="/" className="admin-brand">Portfolio <span>Admin</span></Link>
        <nav aria-label="Admin sections" className="admin-section-nav">
          {sections.map(([key, label]) => <NavLink key={key} to={`/admin/dashboard/${key}`} className={({ isActive }) => `admin-nav-link${isActive || (key === 'home' && location.pathname === '/admin') ? ' active' : ''}`}><span>{label}</span>{key === 'messages' && data.messages.some((message) => !message.read) && <span className="unread-count" aria-label="Unread messages">{data.messages.filter((message) => !message.read).length}</span>}</NavLink>)}
        </nav>
        <div className="admin-theme-row"><span>Appearance</span><ThemeControl /></div>
        <div className="admin-sidebar-bottom"><Link to="/" className="admin-nav-link"><span>View site</span></Link><button className="admin-nav-link logout-link" type="button" onClick={logout}><span>Logout</span><Icon name="logout" size={16} /></button></div>
      </aside>

      <main className="admin-content">
        <div className="admin-mobile-top"><Link to="/" className="admin-brand">Portfolio <span>Admin</span></Link><div className="admin-mobile-actions"><ThemeControl /><button type="button" className="button button-outline" onClick={logout}>Logout <Icon name="logout" size={16} /></button></div></div>
        {notice.text && <p className={`admin-notice ${notice.kind}`} role="status">{notice.text}</p>}
        {loading ? <p className="page-status" role="status">Loading admin details…</p> : <>
          {section === 'home' && data.profile && <HomeDetails profile={data.profile} working={working} perform={perform} />}
          {section === 'resume' && <ResumeDetails resume={data.resume} setResume={(resume) => setData((old) => ({ ...old, resume }))} working={working} perform={perform} />}
          {section === 'about' && data.profile && <AboutDetails profile={data.profile} education={data.education} setData={setData} perform={perform} />}
          {section === 'projects' && <ProjectDetails projects={data.projects} setData={setData} perform={perform} />}
          {section === 'messages' && <MessageDetails messages={data.messages} setData={setData} perform={perform} />}
        </>}
      </main>
    </div>
  );
}

function HomeDetails({ profile, working, perform }) {
  const [form, setForm] = useState({
    ...profile,
    typingTitlesText: (profile.typingTitles || []).join('\n'),
    skillsText: (profile.skills || []).join(', '),
    socials: { github: '', linkedin: '', instagram: '', ...profile.socials }
  });
  const update = (key, value) => setForm((old) => ({ ...old, [key]: value }));

  function save(event) {
    event.preventDefault();
    const payload = {
      name: form.name,
      typingTitles: form.typingTitlesText.split('\n').map((item) => item.trim()).filter(Boolean),
      introOne: form.introOne,
      introTwo: form.introTwo,
      location: form.location,
      status: form.status,
      socials: form.socials,
      aboutSummary: form.aboutSummary,
      skills: form.skillsText.split(',').map((item) => item.trim()).filter(Boolean),
      email: form.email
    };
    perform(() => api('/admin/profile', json('PUT', payload)), 'Home details saved.');
  }

  return <form className="admin-form" onSubmit={save}>
    <AdminSectionTitle title="Home details" description="Edit the information shown on your home page." />
    <div className="form-grid">
      <label>Name<input value={form.name} maxLength="120" required onChange={(event) => update('name', event.target.value)} /></label>
      <label>Typing titles <span className="field-hint">One title per line</span><textarea rows="2" value={form.typingTitlesText} onChange={(event) => update('typingTitlesText', event.target.value)} /></label>
      <label>Intro line 1<input value={form.introOne} maxLength="500" onChange={(event) => update('introOne', event.target.value)} /></label>
      <label>Intro line 2<input value={form.introTwo} maxLength="500" onChange={(event) => update('introTwo', event.target.value)} /></label>
      <label>Location<input value={form.location} maxLength="120" onChange={(event) => update('location', event.target.value)} /></label>
      <label>Status<input value={form.status} maxLength="120" onChange={(event) => update('status', event.target.value)} /></label>
      <label>Email<input type="email" value={form.email} required maxLength="254" onChange={(event) => update('email', event.target.value)} /></label>
    </div>
    <fieldset className="admin-fieldset"><legend>Social links</legend><div className="form-grid">
      {['github', 'linkedin', 'instagram'].map((social) => <label key={social}>{social[0].toUpperCase() + social.slice(1)} URL<input type="url" value={form.socials[social] || ''} placeholder="https://" onChange={(event) => update('socials', { ...form.socials, [social]: event.target.value })} /></label>)}
    </div></fieldset>
    <button className="button button-primary" type="submit" disabled={working}>Save home details</button>
  </form>;
}

function ResumeDetails({ resume, setResume, working, perform }) {
  const [file, setFile] = useState(null);
  async function upload(event) {
    event.preventDefault();
    if (!file) return;
    const form = new FormData();
    form.append('resume', file);
    const ok = await perform(async () => setResume(await api('/admin/resume', { method: 'POST', body: form })), 'Resume uploaded.');
    if (ok) setFile(null);
  }
  async function remove() {
    const ok = await perform(() => api('/admin/resume', { method: 'DELETE' }), 'Resume deleted.');
    if (ok) setResume(null);
  }
  return <section className="admin-form">
    <AdminSectionTitle title="Resume" description="Upload a PDF to update the public Download CV button." />
    {resume ? <div className="resume-current"><div><strong>{resume.originalName}</strong><span className="muted-text">Uploaded {new Date(resume.uploadedAt).toLocaleDateString()}</span></div><button className="button button-outline danger-button" type="button" onClick={remove} disabled={working}><Icon name="trash" size={16} />Delete resume</button></div> : <p className="empty-state">No resume has been uploaded.</p>}
    <form className="resume-upload" onSubmit={upload}><label>Choose PDF (up to 5 MB)<input type="file" accept="application/pdf,.pdf" onChange={(event) => setFile(event.target.files?.[0] || null)} /></label><button className="button button-primary" type="submit" disabled={!file || working}>Upload resume</button></form>
  </section>;
}

function AboutDetails({ profile, education, setData, perform }) {
  const [summary, setSummary] = useState(profile.aboutSummary || '');
  const [skills, setSkills] = useState((profile.skills || []).join(', '));
  const [draft, setDraft] = useState(blankEducation);
  const [editing, setEditing] = useState('');

  async function saveAbout(event) {
    event.preventDefault();
    const payload = {
      name: profile.name, typingTitles: profile.typingTitles || [], introOne: profile.introOne || '', introTwo: profile.introTwo || '',
      location: profile.location || '', status: profile.status || '', socials: profile.socials || { github: '', linkedin: '', instagram: '' },
      aboutSummary: summary, skills: skills.split(',').map((item) => item.trim()).filter(Boolean), email: profile.email
    };
    await perform(() => api('/admin/profile', json('PUT', payload)), 'About details saved.');
  }

  async function saveEducation(event) {
    event.preventDefault();
    const endpoint = editing ? `/admin/education/${editing}` : '/admin/education';
    const method = editing ? 'PUT' : 'POST';
    const ok = await perform(async () => {
      await api(endpoint, json(method, draft));
      const fresh = await api('/profile');
      setData((old) => ({ ...old, education: fresh.education }));
    }, editing ? 'Education entry updated.' : 'Education entry added.');
    if (ok) { setDraft(blankEducation); setEditing(''); }
  }

  async function deleteEducation(id) {
    await perform(async () => {
      await api(`/admin/education/${id}`, { method: 'DELETE' });
      setData((old) => ({ ...old, education: old.education.filter((item) => item._id !== id) }));
    }, 'Education entry deleted.');
  }

  return <div className="admin-form">
    <AdminSectionTitle title="About" description="Edit your summary, education timeline, and skills." />
    <form onSubmit={saveAbout} className="stack-form"><label>Short summary<textarea rows="5" maxLength="5000" value={summary} onChange={(event) => setSummary(event.target.value)} /></label><label>Skills <span className="field-hint">Separate with commas</span><input value={skills} onChange={(event) => setSkills(event.target.value)} /></label><button className="button button-primary" type="submit">Save about details</button></form>
    <div className="admin-subsection"><h3>Education entries</h3>
      {education.map((entry) => <article className="admin-list-item" key={entry._id}><div><strong>{entry.degree}</strong><span>{entry.institution} · {entry.years}</span>{entry.notes && <span>{entry.notes}</span>}</div><div className="inline-actions"><button className="icon-button" type="button" aria-label={`Edit ${entry.degree}`} onClick={() => { setDraft({ degree: entry.degree, institution: entry.institution, years: entry.years || '', notes: entry.notes || '' }); setEditing(entry._id); }}><Icon name="edit" /></button><button className="icon-button" type="button" aria-label={`Delete ${entry.degree}`} onClick={() => deleteEducation(entry._id)}><Icon name="trash" /></button></div></article>)}
      <form className="stack-form education-form" onSubmit={saveEducation}><h4>{editing ? 'Edit education' : 'Add education'}</h4><div className="form-grid"><label>Degree<input required maxLength="180" value={draft.degree} onChange={(event) => setDraft({ ...draft, degree: event.target.value })} /></label><label>Institution<input required maxLength="220" value={draft.institution} onChange={(event) => setDraft({ ...draft, institution: event.target.value })} /></label><label>Years<input maxLength="80" value={draft.years} onChange={(event) => setDraft({ ...draft, years: event.target.value })} /></label><label>Notes<input maxLength="1500" value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} /></label></div><div className="inline-actions"><button className="button button-primary" type="submit">{editing ? 'Save education' : 'Add education'}</button>{editing && <button className="button button-outline" type="button" onClick={() => { setDraft(blankEducation); setEditing(''); }}>Cancel</button>}</div></form>
    </div>
  </div>;
}

function ProjectDetails({ projects, setData, perform }) {
  const [draft, setDraft] = useState(blankProject);
  const [editing, setEditing] = useState('');
  async function save(event) {
    event.preventDefault();
    const endpoint = editing ? `/admin/projects/${editing}` : '/admin/projects';
    const method = editing ? 'PUT' : 'POST';
    const ok = await perform(async () => {
      const project = await api(endpoint, json(method, draft));
      setData((old) => ({ ...old, projects: editing ? old.projects.map((item) => item._id === editing ? project : item) : [project, ...old.projects] }));
    }, editing ? 'Project updated.' : 'Project added.');
    if (ok) { setDraft(blankProject); setEditing(''); }
  }
  async function remove(id) {
    await perform(async () => {
      await api(`/admin/projects/${id}`, { method: 'DELETE' });
      setData((old) => ({ ...old, projects: old.projects.filter((item) => item._id !== id) }));
    }, 'Project deleted.');
  }
  return <div className="admin-form"><AdminSectionTitle title="Projects" description="Add and manage projects shown on your portfolio." />
    {projects.map((project) => <article className="admin-list-item" key={project._id}><div><strong>{project.name}</strong><span>{project.status} · {project.githubUrl}</span>{project.description && <span>{project.description}</span>}</div><div className="inline-actions"><button className="icon-button" type="button" aria-label={`Edit ${project.name}`} onClick={() => { setDraft({ name: project.name, githubUrl: project.githubUrl, description: project.description || '', status: project.status }); setEditing(project._id); }}><Icon name="edit" /></button><button className="icon-button" type="button" aria-label={`Delete ${project.name}`} onClick={() => remove(project._id)}><Icon name="trash" /></button></div></article>)}
    <form className="stack-form project-form" onSubmit={save}><h3>{editing ? 'Edit project' : 'Add project'}</h3><div className="form-grid"><label>Name<input required maxLength="180" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label><label>GitHub URL<input type="url" required value={draft.githubUrl} onChange={(event) => setDraft({ ...draft, githubUrl: event.target.value })} placeholder="https://github.com/…" /></label><label className="field-full">Description<textarea rows="3" maxLength="3000" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label><label>Status<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })}>{['Planned', 'In Progress', 'Completed', 'On Hold'].map((status) => <option key={status}>{status}</option>)}</select></label></div><div className="inline-actions"><button className="button button-primary" type="submit">{editing ? 'Save project' : 'Add project'}</button>{editing && <button className="button button-outline" type="button" onClick={() => { setDraft(blankProject); setEditing(''); }}>Cancel</button>}</div></form>
  </div>;
}

function MessageDetails({ messages, setData, perform }) {
  async function toggle(message) {
    const read = !message.read;
    await perform(async () => {
      const updated = await api(`/admin/messages/${message._id}/read`, json('PATCH', { read }));
      setData((old) => ({ ...old, messages: old.messages.map((item) => item._id === message._id ? updated : item) }));
    }, read ? 'Message marked as read.' : 'Message marked as unread.');
  }
  async function remove(message) {
    await perform(async () => {
      await api(`/admin/messages/${message._id}`, { method: 'DELETE' });
      setData((old) => ({ ...old, messages: old.messages.filter((item) => item._id !== message._id) }));
    }, 'Message deleted.');
  }
  return <section className="admin-form"><AdminSectionTitle title="Messages" description="Messages sent through the contact form." />
    {messages.length ? <div className="messages-list">{messages.map((message) => <article className={`message-card${message.read ? '' : ' unread'}`} key={message._id}><div className="message-card-head"><div><h3>{message.name}</h3><a href={`mailto:${message.email}`}>{message.email}</a></div><time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleString()}</time></div><p>{message.message}</p><div className="inline-actions"><button className="button button-outline" type="button" onClick={() => toggle(message)}><Icon name={message.read ? 'edit' : 'check'} size={16} />Mark as {message.read ? 'unread' : 'read'}</button><button className="button button-outline danger-button" type="button" onClick={() => remove(message)}><Icon name="trash" size={16} />Delete</button></div></article>)}</div> : <p className="empty-state">No messages yet.</p>}
  </section>;
}
