// ВРЕМЕННАЯ заглушка. Замените на js/data.js из rassvet-starter.zip.
// Каркас использует DISTRICTS, HEROES.max, WEAPONS, ZOMBIES, PERKS, DROPS и levelConfig(n).

const DISTRICTS = [
  { id: 'outskirts',  name: 'Окраина',  levels: [1, 20],   ground: '#2b2f2a', groundAlt: '#33382f', road: '#26282b', line: '#c9a54a', accent: '#ffb547', debris: '#4a4136', barricade: '#6b4a2b' },
  { id: 'industrial', name: 'Промзона', levels: [21, 40],  ground: '#2e2c29', groundAlt: '#38342e', road: '#232324', line: '#d0d0c0', accent: '#ff8a3a', debris: '#4d4238', barricade: '#5a4a3a' },
  { id: 'center',     name: 'Центр',    levels: [41, 60],  ground: '#2a2b30', groundAlt: '#32333a', road: '#1f2024', line: '#e0e0e0', accent: '#ffd36b', debris: '#45434a', barricade: '#6b5030' },
  { id: 'port',       name: 'Порт',     levels: [61, 80],  ground: '#262d31', groundAlt: '#2d363b', road: '#202528', line: '#e0c040', accent: '#6bd0ff', debris: '#3a4246', barricade: '#4a3a2a' },
  { id: 'quarantine', name: 'Карантин', levels: [81, 100], ground: '#2c2a2e', groundAlt: '#352f37', road: '#211f24', line: '#d84a4a', accent: '#ff5a5a', debris: '#463c46', barricade: '#5a3030' },
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
// unlock — уровень, на котором тип появляется впервые (карточка «НОВЫЙ ВРАГ»).
const ZOMBIES = {
  walker:   { name: 'Бродяга',  unlock: 1,  hp: 32,  speed: 52,  damage: 10, radius: 15, xp: 1, coin: 0.30, color: '#6b8255', shirt: '#4a4e5c', behavior: 'chase',
              desc: 'Медленный, но их много. Не дай себя окружить.' },
  runner:   { name: 'Бегун',    unlock: 2,  hp: 20,  speed: 125, damage: 8,  radius: 13, xp: 2, coin: 0.35, color: '#7d8a5c', shirt: '#7a2f2a', behavior: 'chase',
              desc: 'Очень быстрый и хрупкий. Стреляй первым.' },
  crawler:  { name: 'Ползун',   unlock: 4,  hp: 24,  speed: 38,  damage: 9,  radius: 14, xp: 2, coin: 0.35, color: '#5d6e4c', shirt: '#3f3a33', behavior: 'lunge', lungeRange: 170, lungeMul: 2.8,
              desc: 'Ползёт медленно, но вблизи делает резкий рывок.' },
  spitter:  { name: 'Плевун',   unlock: 6,  hp: 30,  speed: 50,  damage: 6,  radius: 15, xp: 3, coin: 0.45, color: '#7ea04a', shirt: '#4d5a2e', behavior: 'ranged', keepDist: 250, spitDamage: 9, spitEvery: 2.2,
              desc: 'Держится на расстоянии и плюётся кислотой. Уходи с линии плевка.' },
  bloater:  { name: 'Толстяк',  unlock: 9,  hp: 70,  speed: 36,  damage: 14, radius: 22, xp: 4, coin: 0.55, color: '#9a9a52', shirt: '#6e6438', behavior: 'explode', blastRadius: 95, blastDamage: 22, mass: 2.5,
              desc: 'Взрывается рядом с тобой и при смерти. Убивай издалека — взрыв задевает и зомби.' },
  armored:  { name: 'Омоновец', unlock: 12, hp: 90,  speed: 46,  damage: 14, radius: 17, xp: 5, coin: 0.7,  color: '#62775a', shirt: '#2b3442', behavior: 'chase', armor: 0.5, mass: 2,
              desc: 'Броня гасит половину урона. Взрывы, огонь и тесла бьют в полную силу.' },
  screamer: { name: 'Крикун',   unlock: 16, hp: 45,  speed: 58,  damage: 8,  radius: 15, xp: 4, coin: 0.55, color: '#a9b49a', shirt: '#5e4a66', behavior: 'scream', screamEvery: 5, screamRadius: 260,
              desc: 'Своим криком ускоряет зомби вокруг. Убивай его первым.' },
  jumper:   { name: 'Прыгун',   unlock: 21, hp: 40,  speed: 70,  damage: 14, radius: 14, xp: 4, coin: 0.5,  color: '#78806a', shirt: '#4b2f4f', behavior: 'leap', leapRange: [110, 320], leapEvery: 3,
              desc: 'Перед прыжком замирает и показывает красную линию. Отскочи в сторону.' },
  brute:    { name: 'Громила',  unlock: 26, hp: 180, speed: 42,  damage: 25, radius: 26, xp: 6, coin: 0.8,  color: '#56704a', shirt: '#2e2a26', behavior: 'chase', mass: 4,
              desc: 'Огромный и живучий, бьёт очень больно. Держи дистанцию.' },
};

// Улучшения внутри уровня (выбор 1 из 3 при повышении уровня).
const PERKS = [
  { id: 'damage',    name: 'Тяжёлые пули',    desc: '+20% урона',                              max: 5, icon: '✸', color: '#ff7a4a' },
  { id: 'firerate',  name: 'Быстрый спуск',   desc: '+15% скорострельности',                  max: 5, icon: '»', color: '#ffd36b' },
  { id: 'speed',     name: 'Лёгкие кроссовки', desc: '+12% скорости бега',                    max: 4, icon: '➤', color: '#8fd8ff' },
  { id: 'maxhp',     name: 'Крепкое здоровье', desc: '+25 к здоровью и лечение',             max: 5, icon: '♥', color: '#ff5a6a' },
  { id: 'magnet',    name: 'Магнит',           desc: '+60% радиус притяжения наград',         max: 3, icon: 'U', color: '#c0c0ff' },
  { id: 'regen',     name: 'Регенерация',      desc: '+1.5 здоровья в секунду',               max: 4, icon: '+', color: '#5aff7a' },
  { id: 'multishot', name: 'Двойной выстрел',  desc: '+1 снаряд за выстрел',                  max: 3, icon: '⋔', color: '#ffb547' },
  { id: 'pierce',    name: 'Бронебойные',      desc: 'Пули пробивают ещё одного врага',       max: 3, icon: '➶', color: '#e0e0e0' },
  { id: 'crit',      name: 'Меткий глаз',      desc: '+10% шанс двойного урона',              max: 4, icon: '◎', color: '#ffd23a' },
  { id: 'saw',       name: 'Пила',             desc: 'Вращающаяся пила вокруг героя (+1 диск)', max: 4, icon: '✺', color: '#d0d8e0' },
  { id: 'ice',       name: 'Ледяные пули',     desc: 'Попадания замедляют врагов',            max: 3, icon: '❄', color: '#9fe6ff' },
  { id: 'fire',      name: 'Зажигательные пули', desc: 'Попадания поджигают врагов',          max: 3, icon: '♨', color: '#ff8a2a' },
  { id: 'boom',      name: 'Детонация',        desc: 'Убитые зомби взрываются (шанс 20%)',     max: 3, icon: '✹', color: '#ff5a3a' },
];

const DROPS = {
  medkitChance: 0.035,
  medkitHeal: 25,
  lifetime: 20,
};

// Опыт до следующего уровня внутри боя.
function xpToLevel(lvl) {
  return 6 + lvl * 5;
}

const STAR_GOALS = {
  hp:     { text: v => `Здоровье не ниже ${v}%` },
  time:   { text: v => `Пройти за ${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}` },
  streak: { text: v => `Серия ×${v}` },
  hits:   { text: v => `Не больше ${v} ударов` },
};

function levelConfig(n) {
  const district = DISTRICTS.find(d => n >= d.levels[0] && n <= d.levels[1]) || DISTRICTS[DISTRICTS.length - 1];
  const types = Object.keys(ZOMBIES).filter(t => ZOMBIES[t].unlock <= n);
  const newEnemy = Object.keys(ZOMBIES).find(t => ZOMBIES[t].unlock === n) || null;

  let seed = n * 2654435761 >>> 0;
  const rnd = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);

  const waveCount = n < 4 ? 2 : n < 15 ? 3 : n < 50 ? 4 : 5;
  const waves = [];
  let total = 0;
  for (let w = 0; w < waveCount; w++) {
    const count = Math.round(7 + n * 0.55 + w * (3 + n * 0.08));
    const zombies = {};
    for (let i = 0; i < count; i++) {
      // Walkers are the backbone; newer types are rarer, the newest a bit more common on its debut.
      let type = 'walker';
      if (types.length > 1 && rnd() > 0.45) {
        type = types[1 + Math.floor(rnd() * (types.length - 1))];
        if (newEnemy && newEnemy !== 'walker' && rnd() < 0.15) type = newEnemy;
      }
      zombies[type] = (zombies[type] || 0) + 1;
    }
    waves.push({
      zombies,
      interval: Math.max(0.3, 1.1 - n * 0.008 - w * 0.05),
      maxAlive: Math.min(40, 10 + Math.floor(n * 0.3) + w * 2),
    });
    total += count;
  }

  // Two rotating star goals (the first star is always "win").
  const pairs = [['hp', 'time'], ['streak', 'hits'], ['time', 'streak'], ['hits', 'hp']];
  const pair = pairs[(n - 1) % pairs.length];
  const goalValue = {
    hp: Math.min(70, 35 + Math.floor(n / 5) * 2),
    time: Math.round((total * 1.5 + waveCount * 6 + 25) / 5) * 5,
    streak: Math.max(5, Math.min(40, Math.round(total * 0.25))),
    hits: Math.max(4, 12 - Math.floor(n / 15)),
  };

  return {
    level: n,
    district,
    arena: { w: 1800, h: 1200 },
    barrels: 4 + (n % 3),
    waves,
    total,
    newEnemy,
    mods: {
      hp: 1 + (n - 1) * 0.035,
      speed: 1 + Math.min(0.25, (n - 1) * 0.003),
      damage: 1 + (n - 1) * 0.02,
    },
    stars: pair.map(type => ({ type, value: goalValue[type] })),
    reward: 20 + n * 4,
  };
}
