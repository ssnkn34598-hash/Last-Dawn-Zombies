// ВРЕМЕННАЯ заглушка. Замените на js/data.js из rassvet-starter.zip.
// Каркас использует только DISTRICTS, HEROES.max и levelConfig(n).arena.

const DISTRICTS = [
  {
    id: 'outskirts',
    name: 'Окраина',
    levels: [1, 20],
    ground: '#2b2f2a',
    groundAlt: '#33382f',
    road: '#26282b',
    line: '#c9a54a',
    accent: '#ffb547',
    debris: '#4a4136',
    barricade: '#6b4a2b',
  },
];

const HEROES = {
  max: { name: 'Макс', hp: 100, speed: 210, color: '#3d6fa8' },
};

function levelConfig(n) {
  const district = DISTRICTS.find(d => n >= d.levels[0] && n <= d.levels[1]) || DISTRICTS[0];
  return {
    level: n,
    district,
    arena: { w: 1800, h: 1200 },
  };
}
