import { ConsultantClass } from '../types/game';

export const CONSULTANT_CLASSES: ConsultantClass[] = [
  {
    id: 'architect',
    name: 'Architect',
    emoji: '🏛️',
    abilityName: 'Draw Boxes and Arrows',
    description: 'Master of diagrams and abstractions. Reduces technical debt but clients grow impatient.',
    flavor: '"Have you considered a microservices approach?"',
  },
  {
    id: 'developer',
    name: 'Developer',
    emoji: '💻',
    abilityName: 'Ship MVP',
    description: 'Gets things done fast. Delivery progress surges but technical debt may follow.',
    flavor: '"It works on my machine."',
  },
  {
    id: 'ux',
    name: 'UX Designer',
    emoji: '🎨',
    abilityName: 'Talk to Users',
    description: 'Clarifies requirements and boosts client happiness. Enemies hate being understood.',
    flavor: '"But did you test it with actual users?"',
  },
  {
    id: 'datascientist',
    name: 'Data Scientist',
    emoji: '📊',
    abilityName: 'Train Model Anyway',
    description: 'Devastating in AI rooms. Powerful but risky — compliance risk may spike.',
    flavor: '"The model is 94% accurate. On training data."',
  },
  {
    id: 'pm',
    name: 'Project Manager',
    emoji: '📋',
    abilityName: 'Rebaseline Timeline',
    description: 'Restores budget and morale. May frustrate stakeholders with new slide decks.',
    flavor: '"According to my updated Gantt chart…"'
  },
  {
    id: 'security',
    name: 'Security Consultant',
    emoji: '🔒',
    abilityName: 'Threat Model',
    description: 'Slays compliance threats. Slows delivery but keeps the regulators away.',
    flavor: '"That feature is a GDPR violation waiting to happen."',
  },
  {
    id: 'accountmanager',
    name: 'Account Manager',
    emoji: '🤝',
    abilityName: 'Relationship Shield',
    description: 'Prevents client happiness from dropping once per encounter. Smooth talker.',
    flavor: '"I\'ll set up a call."',
  },
  {
    id: 'intern',
    name: 'Intern',
    emoji: '🎲',
    abilityName: 'Wild Vibe Code',
    description: 'Total wildcard. Massive upside or catastrophic disaster. No in-between.',
    flavor: '"I used ChatGPT for the whole backend, is that okay?"',
  },
];
