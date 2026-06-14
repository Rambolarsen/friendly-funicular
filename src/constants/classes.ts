import { ConsultantClass, RawStats } from '../types/game';

export const CONSULTANT_CLASSES: ConsultantClass[] = [
  {
    id: 'architect',
    name: 'Architect',
    emoji: '🏛️',
    abilityName: 'Draft Architecture',
    description: 'Slows every active enemy with a five-second architecture freeze and trims technical debt.',
    flavor: '"Have you considered a microservices approach?"',
    color: '#f59e0b',
  },
  {
    id: 'developer',
    name: 'Developer',
    emoji: '💻',
    abilityName: 'Ship Hotfix',
    description: 'Blasts nearby enemies with an emergency patch and nudges delivery back on track.',
    flavor: '"It works on my machine."',
    color: '#22d3ee',
  },
  {
    id: 'ux',
    name: 'UX Designer',
    emoji: '🎨',
    abilityName: 'User Research',
    description: 'Freezes the room for a focused research pulse that boosts client happiness.',
    flavor: '"But did you test it with actual users?"',
    color: '#f472b6',
  },
  {
    id: 'datascientist',
    name: 'Data Scientist',
    emoji: '📊',
    abilityName: 'Run the Model',
    description: 'Turns every loot drop into a glowing model sprint: faster delivery, higher compliance risk.',
    flavor: '"The model is 94% accurate. On training data."',
    color: '#a78bfa',
  },
  {
    id: 'pm',
    name: 'Project Manager',
    emoji: '📋',
    abilityName: 'Call a Meeting',
    description: 'Sends every enemy marching the wrong way and lifts team morale with meeting energy.',
    flavor: '"According to my updated Gantt chart…"',
    color: '#34d399',
  },
  {
    id: 'security',
    name: 'Security Consultant',
    emoji: '🔒',
    abilityName: 'Deploy Firewall',
    description: 'Deletes incoming projectiles and shrugs off ranged pressure behind a temporary firewall.',
    flavor: '"That feature is a GDPR violation waiting to happen."',
    color: '#fb923c',
  },
  {
    id: 'accountmanager',
    name: 'Account Manager',
    emoji: '🤝',
    abilityName: 'Escalate',
    description: 'Locks down the nearest enemy in a one-on-one escalation that steadies the client.',
    flavor: '"I\'ll set up a call."',
    color: '#fbbf24',
  },
  {
    id: 'intern',
    name: 'Intern',
    emoji: '🎲',
    abilityName: 'Wildcard',
    description: 'Copies someone else’s move most of the time and occasionally invents a stat disaster.',
    flavor: '"I used ChatGPT for the whole backend, is that okay?"',
    color: '#e879f9',
  },
];

/** Passive stat bonuses applied when this class kills an enemy. */
export const CLASS_MODIFIERS: Record<string, Partial<RawStats>> = {
  architect:      { technicalDebt: -4 },
  developer:      { deliveryProgress: 3 },
  ux:             { clientHappiness: 4 },
  datascientist:  { deliveryProgress: 4, complianceRisk: 2 },
  pm:             { teamMorale: 3 },
  security:       { complianceRisk: -5 },
  accountmanager: { clientHappiness: 3 },
  intern:         {},
};

/**
 * Base damage dealt by each class's basic melee attack.
 * `null` means the damage is random (intern wildcard: 10–40).
 */
export const CLASS_ATTACK_DAMAGE: Record<string, number | null> = {
  architect:      20,
  developer:      30,
  ux:             20,
  datascientist:  25,
  pm:             15,
  security:       35,
  accountmanager: 25,
  intern:         null,
};

/** One-liners each class may say at random when attacking (15% chance per attack). */
export const CLASS_ATTACK_QUOTES: Record<string, string[]> = {
  architect:      [
    'Have you considered a microservices approach?',
    'The monolith must die.',
    'We should decouple this.',
    'This needs an event sourcing layer.',
  ],
  developer:      [
    'It works on my machine.',
    'Just push to prod.',
    "I'll fix it after the release.",
    'Ship it.',
  ],
  ux:             [
    'Did you test this with real users?',
    'The button should be bigger.',
    'More whitespace.',
    "Users don't read.",
  ],
  datascientist:  [
    "Correlation isn't causation.",
    'The model needs more data.',
    'Statistically insignificant.',
    "I'll just train another model.",
  ],
  pm:             [
    'Per my last email\u2026',
    "Let's sync on this.",
    'Can we park that?',
    'Moving the deadline forward.',
  ],
  security:       [
    "That's a security risk.",
    'Password must be 64 characters.',
    'We need a pentest.',
    'Zero trust.',
  ],
  accountmanager: [
    "I'll set up a call.",
    'The client loves this.',
    'Just say yes for now.',
    "Let's manage expectations.",
  ],
  intern:         [
    'I Googled it.',
    'ChatGPT wrote this.',
    'Is this right?',
    'I just started Monday.',
  ],
};
