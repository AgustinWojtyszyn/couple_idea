import type { Game } from './simulation/types';

export type Mission = {
  id: string;
  title: string;
  description: string;
  targetPlace: string;
  rewardLabel: string;
};

export const missions: Mission[] = [
  { id: 'first-shift', title: 'Primer turno', description: 'Caminá hasta Trabajo y completá tu primer turno.', targetPlace: 'Trabajo', rewardLabel: 'Experiencia + reputación' },
  { id: 'level-up', title: 'Invertí en vos', description: 'Llegá al Instituto y estudiá para mejorar tu formación.', targetPlace: 'Instituto', rewardLabel: 'Formación + reputación' },
  { id: 'make-connection', title: 'Conocé a alguien', description: 'Buscá la Plaza y pasá tiempo con una persona de la ciudad.', targetPlace: 'Plaza', rewardLabel: 'Vínculo + reputación' },
  { id: 'take-care', title: 'Cuidate', description: 'Conseguí comida antes de quedarte sin energía.', targetPlace: 'Supermercado', rewardLabel: 'Ánimo + reputación' },
  { id: 'change-air', title: 'Salí de tu zona', description: 'Llegá a la Parada y viajá a otro barrio.', targetPlace: 'Parada', rewardLabel: 'Ciudad desbloqueada' },
  { id: 'build-future', title: 'Construí futuro', description: 'Volvé al Trabajo y completá un encargo independiente.', targetPlace: 'Trabajo', rewardLabel: 'Dinero + reputación' },
];

export function completedMissionIds(game: Game): string[] {
  return game.completedMissions ?? [];
}

export function currentMission(game: Game): Mission | null {
  const done = new Set(completedMissionIds(game));
  return missions.find(mission => !done.has(mission.id)) ?? null;
}

export function missionNumber(game: Game): number {
  return Math.min(missions.length, completedMissionIds(game).length + 1);
}
