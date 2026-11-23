import { Profile, Education } from './models.js';

export async function seedPortfolio() {
  const profile = await Profile.findOne({ key: 'main' });
  if (!profile) {
    await Profile.create({
      key: 'main',
      name: 'Ekta Mishra',
      typingTitles: ['AI Engineer', 'Fullstack developer'],
      introOne: 'Turning ideas into intelligent experiences through code, creativity, and Generative AI.',
      introTwo: '☕ coffee into code,ideas into projects, and dreams into digital reality ✨',
      location: 'Gorakhpur, Uttar Pradesh',
      status: 'Available Now',
      socials: { github: '', linkedin: '', instagram: '' },
      aboutSummary: 'My goal is to build a career at the intersection of AI engineering and software development, creating meaningful products that solve real-world problems and make technology more accessible, useful, and impactful.',
      skills: ['MERN', 'RAG', 'LLM', 'Docker', 'GenAI', 'Agentic AI'],
      email: 'mekta3991@gmail.com'
    });
  }

  if (await Education.countDocuments() === 0) {
    await Education.create({
      degree: 'B.Tech CSE',
      institution: 'Buddha Institute of Technology, Gorakhpur',
      years: '2023-2027',
      notes: ''
    });
  }
}
