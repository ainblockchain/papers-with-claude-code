// Centralized agent profile registry — single source of truth for display names, specialties, and colors.
// Internal role identifiers (analyst, architect, scholar) remain unchanged;
// this module adds the human-facing "freelancer persona" layer on top.

export interface AgentProfile {
  role: string;
  name: string;           // Short name — "Iris"
  fullName: string;       // Display name — "Dr. Iris Chen"
  specialty: string;      // What they do — "Research Analysis"
  tagline: string;        // Personal motto
  icon: string;           // Emoji avatar
  color: string;          // Brand color (CSS hex)
}

export const AGENT_PROFILES: Record<string, AgentProfile> = {
  analyst: {
    role: 'analyst',
    name: 'Iris',
    fullName: 'Dr. Iris Chen',
    specialty: 'Research Analysis',
    tagline: 'The methodology section is where papers live or die.',
    icon: '🔬',
    color: '#3b82f6',
  },
  architect: {
    role: 'architect',
    name: 'Alex',
    fullName: 'Alex Rivera',
    specialty: 'Course Design',
    tagline: 'Boring education is a crime.',
    icon: '🏗️',
    color: '#10b981',
  },
  scholar: {
    role: 'scholar',
    name: 'Nakamura',
    fullName: 'Prof. Nakamura',
    specialty: 'Domain Expertise',
    tagline: 'The answer you need exists at the intersection of fields you haven\'t connected yet.',
    icon: '🎓',
    color: '#f97316',
  },
};

export function getProfile(role: string): AgentProfile {
  return AGENT_PROFILES[role] ?? {
    role,
    name: role,
    fullName: role,
    specialty: 'Agent',
    tagline: '',
    icon: '🤖',
    color: '#6366f1',
  };
}

export function getDisplayName(role: string): string {
  return getProfile(role).name;
}
