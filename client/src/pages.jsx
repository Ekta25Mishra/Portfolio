import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from './api.js';
import { Icon } from './icons.jsx';
import GirlSketch from './GirlSketch.jsx';

function useProfile() {
  const [state, setState] = useState({ loading: true, error: '', data: null });
  useEffect(() => {
    let alive = true;
    api('/profile').then((data) => alive && setState({ loading: false, error: '', data }))
      .catch((error) => alive && setState({ loading: false, error: error.message, data: null }));
    return () => { alive = false; };
  }, []);
  return state;
}

function LoadingOrError({ loading, error }) {
  if (loading) return <div className="page-status" role="status">Loading portfolio…</div>;
  if (error) return <div className="page-status" role="alert">{error}</div>;
  return null;
}

function Typewriter({ titles = [] }) {
  const titleKey = titles.join('\u0000');
  const [value, setValue] = useState('');

  useEffect(() => {
    if (!titles.length) { setValue(''); return undefined; }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setValue(titles[0]); return undefined; }
    let titleIndex = 0;
    let character = 0;
    let deleting = false;
    let timer;
    const tick = () => {
      const text = titles[titleIndex] || '';
      if (!deleting) {
        character = Math.min(character + 1, text.length);
        setValue(text.slice(0, character));
        if (character === text.length) {
          deleting = true;
          timer = window.setTimeout(tick, 1900);
          return;
        }
      } else {
        character = Math.max(character - 1, 0);
        setValue(text.slice(0, character));
        if (character === 0) {
          deleting = false;
          titleIndex = (titleIndex + 1) % titles.length;
        }
      }
      timer = window.setTimeout(tick, deleting ? 42 : 82);
    };
    timer = window.setTimeout(tick, 220);
    return () => window.clearTimeout(timer);
  }, [titleKey]);

  return <div className="typing-line" aria-label={titles.join(', ')}><span aria-hidden="true">{value}</span><span className="typing-cursor" aria-hidden="true">|</span></div>;
}

const socialIcons = { github: 'github', linkedin: 'linkedin', instagram: 'instagram' };

function Socials({ links = {} }) {
  const populated = Object.entries(socialIcons).filter(([key]) => links[key]);
  return (
    <div className="social-row">
      <span className="social-label">Follow me</span>
      {populated.map(([key, icon]) => (
        <a key={key} className="social-link" href={links[key]} target="_blank" rel="noreferrer" aria-label={key[0].toUpperCase() + key.slice(1)}>
          <Icon name={icon} size={18} />
        </a>
      ))}
    </div>
  );
}

const publicApi = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export function Home() {
  const { loading, error, data } = useProfile();
  if (loading || error || !data) return <LoadingOrError loading={loading} error={error} />;
  const { profile, resume } = data;

  return (
    <section className="home-layout" aria-labelledby="home-title">
      <div className="home-copy">
        <span className="profile-badge" aria-hidden="true" />
        <h1 id="home-title">Hi, I'm {profile.name}.</h1>
        <Typewriter titles={profile.typingTitles || []} />
        <div className="intro-copy">
          <p>{profile.introOne}</p>
          <p className="intro-second">{profile.introTwo}</p>
        </div>
        <div className="meta-row">
          {profile.location && <span><Icon name="pin" size={15} />{profile.location}</span>}
          {profile.status && <span><Icon name="briefcase" size={15} />{profile.status}</span>}
        </div>
        <div className="home-actions">
          <Link className="button button-primary" to="/contact"><Icon name="arrow" size={17} />Hire Me</Link>
          {resume ? <a className="button button-outline" href={`${publicApi}/api/resume`} download><Icon name="download" size={17} />Download CV</a> : <button className="button button-outline" type="button" disabled title="Upload a resume from the admin panel"><Icon name="download" size={17} />Download CV</button>}
        </div>
        <div className="home-divider" />
        <Socials links={profile.socials} />
      </div>
      <div className="home-art"><GirlSketch /></div>
    </section>
  );
}

export function About() {
  const { loading, error, data } = useProfile();
  if (loading || error || !data) return <LoadingOrError loading={loading} error={error} />;
  const { profile, education = [] } = data;

  return (
    <section className="content-page about-page">
      <div className="section-heading"><span className="eyebrow">About</span><h1>A little about me</h1></div>
      <div className="about-layout">
        <div>
          <p className="about-summary">{profile.aboutSummary}</p>
          <section className="content-section">
            <h2>Education</h2>
            {education.length ? <div className="education-list">{education.map((entry) => (
              <article className="education-entry" key={entry._id}>
                <span className="timeline-dot" aria-hidden="true" />
                <div><h3>{entry.degree}</h3><p>{entry.institution}</p>{entry.years && <span className="muted-text">{entry.years}</span>}{entry.notes && <p className="education-notes">{entry.notes}</p>}</div>
              </article>
            ))}</div> : <p className="muted-text">No education details have been added.</p>}
          </section>
          <section className="content-section">
            <h2>Skills</h2>
            <ul className="skill-list">{(profile.skills || []).map((skill) => <li key={skill}>{skill}</li>)}</ul>
          </section>
        </div>
        <div className="about-art"><GirlSketch small /></div>
      </div>
    </section>
  );
}

export function Projects() {
  const [state, setState] = useState({ loading: true, error: '', items: [] });
  useEffect(() => {
    let alive = true;
    api('/projects').then((items) => alive && setState({ loading: false, error: '', items }))
      .catch((error) => alive && setState({ loading: false, error: error.message, items: [] }));
    return () => { alive = false; };
  }, []);
  if (state.loading || state.error) return <LoadingOrError loading={state.loading} error={state.error} />;

  return (
    <section className="content-page">
      <div className="section-heading"><span className="eyebrow">Selected work</span><h1>Projects</h1></div>
      {state.items.length ? <div className="project-grid">{state.items.map((project) => (
        <article className="project-card" key={project._id}>
          <div className="project-card-top"><h2>{project.name}</h2><span className="status-badge">{project.status}</span></div>
          {project.description && <p>{project.description}</p>}
          <a className="button button-outline project-link" href={project.githubUrl} target="_blank" rel="noreferrer"><Icon name="github" size={17} />GitHub</a>
        </article>
      ))}</div> : <p className="empty-state">Projects will appear here when they are added.</p>}
    </section>
  );
}

export function Contact() {
  const { loading, error, data } = useProfile();
  const [fields, setFields] = useState({ name: '', email: '', message: '' });
  const [result, setResult] = useState({ kind: '', text: '' });
  const [sending, setSending] = useState(false);
  const profile = data?.profile;

  async function submit(event) {
    event.preventDefault();
    setResult({ kind: '', text: '' });
    setSending(true);
    try {
      const response = await api('/contact', { method: 'POST', body: JSON.stringify(fields) });
      setResult({ kind: 'success', text: response.message });
      setFields({ name: '', email: '', message: '' });
    } catch (submitError) {
      setResult({ kind: 'error', text: submitError.message });
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="content-page contact-page">
      <div className="section-heading"><span className="eyebrow">Get in touch</span><h1>Contact</h1></div>
      {loading ? <LoadingOrError loading /> : error ? <LoadingOrError error={error} /> : <>
        {profile?.email && <p className="contact-email">Email me at <a href={`mailto:${profile.email}`}>{profile.email}</a></p>}
        <form className="contact-form" onSubmit={submit}>
          <label>Name<input name="name" value={fields.name} onChange={(event) => setFields({ ...fields, name: event.target.value })} autoComplete="name" maxLength="100" required /></label>
          <label>Email<input name="email" type="email" value={fields.email} onChange={(event) => setFields({ ...fields, email: event.target.value })} autoComplete="email" maxLength="254" required /></label>
          <label>Message<textarea name="message" value={fields.message} onChange={(event) => setFields({ ...fields, message: event.target.value })} rows="6" minLength="5" maxLength="5000" required /></label>
          {result.text && <p className={`form-result ${result.kind}`} role="status">{result.text}</p>}
          <button className="button button-primary" type="submit" disabled={sending}>{sending ? 'Sending…' : 'Send message'}<Icon name="arrow" size={17} /></button>
        </form>
      </>}
    </section>
  );
}

export function PortfolioPage() {
  return (
    <div className="portfolio-sections">
      <div id="home" className="portfolio-section home-section" data-nav-section><Home /></div>
      <div id="about" className="portfolio-section" data-nav-section><About /></div>
      <div id="projects" className="portfolio-section" data-nav-section><Projects /></div>
      <div id="contact" className="portfolio-section" data-nav-section><Contact /></div>
    </div>
  );
}
