// ВРЕМЕННАЯ заглушка. Замените на js/data.js из rassvet-starter.zip.
// Каркас использует DISTRICTS, HEROES.max, WEAPONS, ZOMBIES, DROPS и levelConfig(n).

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
  max: { name: 'Макс', hp: 100, speed: 210, color: '#3d6fa8', magnet: 110 },
};

// type: bullet | bolt | flame | grenade | tesla | plasma | rocket
// rate — выстрелов в секунду, range — дальность (и радиус автоприцела).
const WEAPONS = [
  { id: 'pistol',   name: 'Пистолет',      type: 'bullet',  damage: 14, rate: 4,   range: 460, speed: 950, spread: 0.04, color: '#ffe08a' },
  { id: 'smg',      name: 'Автомат',       type: 'bullet',  damage: 9,  rate: 11,  range: 420, speed: 1000, spread: 0.11, color: '#ffd36b' },
  { id: 'shotgun',  name: 'Дробовик',      type: 'bullet',  damage: 9,  rate: 1.4, range: 300, speed: 900, spread: 0.32, pellets: 7, knock: 140, color: '#ffc45a' },
  { id: 'crossbow', name: 'Арбалет',       type: 'bolt',    damage: 48, rate: 1.4, range: 560, speed: 1150, pierce: 4, knock: 90, color: '#c9e6ff' },
  { id: 'flamer',   name: 'Огнемёт',       type: 'flame',   damage: 4,  rate: 28,  range: 210, speed: 420, burn: { dps: 8, time: 2.5 }, color: '#ff8a2a' },
  { id: 'launcher', name: 'Гранатомёт',    type: 'grenade', damage: 70, rate: 1,   range: 400, radius: 105, color: '#9bd36b' },
  { id: 'tesla',    name: 'Тесла',         type: 'tesla',   damage: 22, rate: 3,   range: 330, chains: 5, chainRange: 170, color: '#8fd8ff' },
  { id: 'plasma',   name: 'Плазмаган',     type: 'plasma',  damage: 32, rate: 3.2, range: 480, speed: 620, pierce: 3, radius: 45, color: '#c46bff' },
  { id: 'rocket',   name: 'Ракетница',     type: 'rocket',  damage: 120, rate: 0.75, range: 560, speed: 260, radius: 140, color: '#ff5a3a' },
  { id: 'minigun',  name: 'Пулемёт',       type: 'bullet',  damage: 8,  rate: 20,  range: 440, speed: 1050, spread: 0.16, color: '#ffe8a8' },
];

// behavior: chase | lunge | ranged | explode | scream | leap
const ZOMBIES = {
  walker:   { name: 'Бродяга',   hp: 32,  speed: 52,  damage: 10, radius: 15, xp: 1, coin: 0.30, color: '#6b8255', shirt: '#4a4e5c', behavior: 'chase' },
  runner:   { name: 'Бегун',     hp: 20,  speed: 125, damage: 8,  radius: 13, xp: 2, coin: 0.35, color: '#7d8a5c', shirt: '#7a2f2a', behavior: 'chase' },
  crawler:  { name: 'Ползун',    hp: 24,  speed: 38,  damage: 9,  radius: 14, xp: 2, coin: 0.35, color: '#5d6e4c', shirt: '#3f3a33', behavior: 'lunge', lungeRange: 170, lungeMul: 2.8 },
  brute:    { name: 'Громила',   hp: 180, speed: 42,  damage: 25, radius: 26, xp: 6, coin: 0.8,  color: '#56704a', shirt: '#2e2a26', behavior: 'chase', mass: 4 },
  spitter:  { name: 'Плевун',    hp: 30,  speed: 50,  damage: 6,  radius: 15, xp: 3, coin: 0.45, color: '#7ea04a', shirt: '#4d5a2e', behavior: 'ranged', keepDist: 250, spitDamage: 9, spitEvery: 2.2 },
  bloater:  { name: 'Толстяк',   hp: 70,  speed: 36,  damage: 14, radius: 22, xp: 4, coin: 0.55, color: '#9a9a52', shirt: '#6e6438', behavior: 'explode', blastRadius: 95, blastDamage: 22, mass: 2.5 },
  screamer: { name: 'Крикун',    hp: 45,  speed: 58,  damage: 8,  radius: 15, xp: 4, coin: 0.55, color: '#a9b49a', shirt: '#5e4a66', behavior: 'scream', screamEvery: 5, screamRadius: 260 },
  armored:  { name: 'Омоновец',  hp: 90,  speed: 46,  damage: 14, radius: 17, xp: 5, coin: 0.7,  color: '#62775a', shirt: '#2b3442', behavior: 'chase', armor: 0.5, mass: 2 },
  jumper:   { name: 'Прыгун',    hp: 40,  speed: 70,  damage: 14, radius: 14, xp: 4, coin: 0.5,  color: '#78806a', shirt: '#4b2f4f', behavior: 'leap', leapRange: [110, 320], leapEvery: 3 },
};

const DROPS = {
  medkitChance: 0.035,
  medkitHeal: 25,
  lifetime: 20,
};

function levelConfig(n) {
  const district = DISTRICTS.find(d => n >= d.levels[0] && n <= d.levels[1]) || DISTRICTS[0];
  return {
    level: n,
    district,
    arena: { w: 1800, h: 1200 },
    barrels: 5,
  };
}
