// ВРЕМЕННАЯ заглушка. Замените на js/data.js из rassvet-starter.zip.
// Каркас использует DISTRICTS, HEROES, WEAPONS, ZOMBIES, PERKS, BOSSES, QUESTS, ECONOMY,
// DROPS, ENDING и levelConfig(n).

const DISTRICTS = [
  { id: 'outskirts',  name: 'Окраина',  levels: [1, 20],   ground: '#2b2f2a', groundAlt: '#33382f', road: '#26282b', line: '#c9a54a', accent: '#ffb547', debris: '#4a4136', barricade: '#6b4a2b',
    story: 'Связь пропала три дня назад. Макс выбрался из подвала на окраине и увидел, что улицы стали чужими. Где-то в центре ещё работает радио — значит, кто-то жив. Нужно пробиться через баррикады.' },
  { id: 'industrial', name: 'Промзона', levels: [21, 40],  ground: '#2e2c29', groundAlt: '#38342e', road: '#232324', line: '#d0d0c0', accent: '#ff8a3a', debris: '#4d4238', barricade: '#5a4a3a',
    story: 'Заводы встали, но цеха не пустуют. Здесь собирают в стаи плевунов и толстяков — кто-то ими управляет. В бензобаках ещё есть топливо, а в бочках — порох.' },
  { id: 'center',     name: 'Центр',    levels: [41, 60],  ground: '#2a2b30', groundAlt: '#32333a', road: '#1f2024', line: '#e0e0e0', accent: '#ffd36b', debris: '#45434a', barricade: '#6b5030',
    story: 'Площадь, мэрия, торговые центры. Раньше здесь гуляли люди, теперь бродит король этих улиц. Радиосигнал всё сильнее: его передают из порта.' },
  { id: 'port',       name: 'Порт',     levels: [61, 80],  ground: '#262d31', groundAlt: '#2d363b', road: '#202528', line: '#e0c040', accent: '#6bd0ff', debris: '#3a4246', barricade: '#4a3a2a',
    story: 'Корабли так и не ушли. Связист держит частоту и зовёт всех, кто остался. Но на его зов идут не только живые.' },
  { id: 'quarantine', name: 'Карантин', levels: [81, 100], ground: '#2c2a2e', groundAlt: '#352f37', road: '#211f24', line: '#d84a4a', accent: '#ff5a5a', debris: '#463c46', barricade: '#5a3030',
    story: 'За забором карантинной зоны всё началось. Где-то там нулевой пациент — источник заразы. Если остановить его, город увидит рассвет.' },
];

// Герои. Макс есть сразу, остальных открывают за золото (gold).
// skill — активный навык (E / пробел на ПК, круглая кнопка на телефоне).
const HEROES = {
  max:   { name: 'Макс',  role: 'Выживший',  hp: 100, speed: 210, color: '#3d6fa8', hat: '#1f2a1f', magnet: 110, gold: 0,
           skill: { id: 'grenade',   name: 'Граната',      cd: 8,  desc: 'Бросает мощную гранату в ближайшую толпу.' } },
  lena:  { name: 'Лена',  role: 'Медик',     hp: 95,  speed: 220, color: '#e8e8e8', hat: '#c83a3a', magnet: 130, gold: 50,
           skill: { id: 'heal',      name: 'Аптечка',      cd: 18, desc: 'Лечит 40% здоровья и даёт регенерацию.' } },
  boris: { name: 'Борис', role: 'Громила',   hp: 150, speed: 190, color: '#5a3a2a', hat: '#2a2a2a', magnet: 100, gold: 80,
           skill: { id: 'dash',      name: 'Таран',        cd: 7,  desc: 'Рывок вперёд: сбивает и ранит зомби на пути.' } },
  nika:  { name: 'Ника',  role: 'Инженер',   hp: 100, speed: 210, color: '#d87a2a', hat: '#e0c040', magnet: 110, gold: 120,
           skill: { id: 'turret',    name: 'Турель',       cd: 18, desc: 'Ставит турель, которая 10 секунд стреляет сама.' } },
  kim:   { name: 'Ким',   role: 'Сержант',   hp: 120, speed: 205, color: '#5a6a3a', hat: '#3a4a2a', magnet: 110, gold: 160,
           skill: { id: 'airstrike', name: 'Авиаудар',     cd: 22, desc: 'Вызывает серию взрывов вокруг героя.' } },
  taya:  { name: 'Тая',   role: 'Тень',      hp: 90,  speed: 235, color: '#5a3a7a', hat: '#2a1a3a', magnet: 120, gold: 200,
           skill: { id: 'freeze',    name: 'Заморозка',    cd: 16, desc: 'Замораживает всех зомби рядом на 3 секунды.' } },
  doc:   { name: 'Док',   role: 'Химик',     hp: 110, speed: 210, color: '#3a7a5a', hat: '#eaeaea', magnet: 110, gold: 250,
           skill: { id: 'frenzy',    name: 'Стимулятор',   cd: 20, desc: '6 секунд: +50% урона и скорострельности.' } },
};

// type: bullet | bolt | flame | grenade | tesla | plasma | rocket
// rate — выстрелов в секунду, range — дальность (и радиус автоприцела).
const WEAPONS = [
  { id: 'pistol', unlock: 1, desc: 'Надёжный. С него всё начинается.',   name: 'Пистолет',      type: 'bullet',  damage: 14, rate: 4,   range: 460, speed: 950, spread: 0.04, color: '#ffe08a' },
  { id: 'smg', unlock: 5, desc: 'Быстрая очередь, разброс побольше.',      name: 'Автомат',       type: 'bullet',  damage: 9,  rate: 11,  range: 420, speed: 1000, spread: 0.11, color: '#ffd36b' },
  { id: 'shotgun', unlock: 9, desc: 'Веер дроби — сносит толпу вблизи.',  name: 'Дробовик',      type: 'bullet',  damage: 9,  rate: 1.4, range: 300, speed: 900, spread: 0.32, pellets: 7, knock: 140, color: '#ffc45a' },
  { id: 'crossbow', unlock: 14, desc: 'Болт пробивает несколько врагов.', name: 'Арбалет',       type: 'bolt',    damage: 48, rate: 1.4, range: 560, speed: 1150, pierce: 4, knock: 90, color: '#c9e6ff' },
  { id: 'flamer', unlock: 19, desc: 'Поджигает всё перед собой.',   name: 'Огнемёт',       type: 'flame',   damage: 4,  rate: 28,  range: 210, speed: 420, burn: { dps: 8, time: 2.5 }, color: '#ff8a2a' },
  { id: 'launcher', unlock: 25, desc: 'Граната по дуге, взрыв по площади.', name: 'Гранатомёт',    type: 'grenade', damage: 70, rate: 1,   range: 400, radius: 105, color: '#9bd36b' },
  { id: 'tesla', unlock: 33, desc: 'Молния перескакивает между врагами.',    name: 'Тесла',         type: 'tesla',   damage: 22, rate: 3,   range: 330, chains: 5, chainRange: 170, color: '#8fd8ff' },
  { id: 'plasma', unlock: 45, desc: 'Сгусток плазмы прожигает насквозь.',   name: 'Плазмаган',     type: 'plasma',  damage: 32, rate: 3.2, range: 480, speed: 620, pierce: 3, radius: 45, color: '#c46bff' },
  { id: 'rocket', unlock: 60, desc: 'Самонаводящаяся ракета, огромный взрыв.',   name: 'Ракетница',     type: 'rocket',  damage: 120, rate: 0.75, range: 560, speed: 260, radius: 140, color: '#ff5a3a' },
  { id: 'minigun', unlock: 75, desc: 'Шквал пуль без остановки.',  name: 'Пулемёт',       type: 'bullet',  damage: 8,  rate: 20,  range: 440, speed: 1050, spread: 0.16, color: '#ffe8a8' },
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

// Боссы каждые 10 уровней. mark — внешний вид, attacks — набор приёмов:
// charge | radial | spiral | spawn | slam | cone | teleport | pools.
// На 50% здоровья босс впадает в ярость (быстрее, чаще, больше снарядов).
const BOSSES = {
  butcher: {
    name: 'Мясник', level: 10, mark: 'cleaver', hp: 1500, speed: 72, radius: 32, damage: 20,
    color: '#7f8f5c', cloth: '#5a2a22', attacks: ['charge', 'slam', 'spawn'], minion: 'walker',
    phrase: 'Свежее мясо само пришло!', ragePhrase: 'Порублю на фарш!',
  },
  fireman: {
    name: 'Брандмейстер', level: 20, mark: 'helmet', hp: 2100, speed: 70, radius: 32, damage: 22,
    color: '#7a8a60', cloth: '#3a3a42', attacks: ['charge', 'radial', 'spawn'], minion: 'runner',
    phrase: 'Пожар потушен. Остался ты.', ragePhrase: 'Всё сгорит!',
  },
  surgeon: {
    name: 'Хирург', level: 30, mark: 'mask', hp: 2700, speed: 66, radius: 30, damage: 22,
    color: '#a0ab8a', cloth: '#3f6f6a', attacks: ['cone', 'pools', 'teleport'], minion: 'crawler',
    phrase: 'Пациент, ложитесь на стол.', ragePhrase: 'Операция без наркоза!',
  },
  horned: {
    name: 'Рогач', level: 40, mark: 'horns', hp: 3300, speed: 74, radius: 36, damage: 26,
    color: '#6a5f50', cloth: '#3a2a20', attacks: ['charge', 'slam', 'radial'], minion: 'runner',
    phrase: 'Это мой район. Мои рога.', ragePhrase: 'Растопчу!',
  },
  king: {
    name: 'Крысиный король', level: 50, mark: 'crown', hp: 3900, speed: 62, radius: 34, damage: 24,
    color: '#8a9070', cloth: '#5a2a5a', attacks: ['spawn', 'spiral', 'radial'], minion: 'crawler',
    phrase: 'На колени перед королём!', ragePhrase: 'Слуги, ко мне!',
  },
  bride: {
    name: 'Невеста', level: 60, mark: 'veil', hp: 4500, speed: 80, radius: 28, damage: 24,
    color: '#b8bca8', cloth: '#d8d4cc', attacks: ['teleport', 'spiral', 'cone'], minion: 'screamer',
    phrase: 'Он так и не пришёл… Может, ты?', ragePhrase: 'Ты меня бросил!',
  },
  signal: {
    name: 'Связист', level: 70, mark: 'antenna', hp: 5100, speed: 70, radius: 32, damage: 26,
    color: '#7a8a70', cloth: '#3a4a3a', attacks: ['radial', 'spiral', 'teleport', 'spawn'], minion: 'jumper',
    phrase: 'Приём… Цель обнаружена.', ragePhrase: 'Всем частям: огонь!',
  },
  tank: {
    name: 'Бронетанк', level: 80, mark: 'armor', hp: 6000, speed: 58, radius: 40, damage: 30,
    color: '#5f6f55', cloth: '#2e343c', attacks: ['charge', 'slam', 'pools', 'radial'], minion: 'armored',
    phrase: 'Броня крепка. А ты?', ragePhrase: 'Таран!',
  },
  hive: {
    name: 'Матка', level: 90, mark: 'growths', hp: 6800, speed: 56, radius: 40, damage: 28,
    color: '#8a9a5a', cloth: '#5a4a3a', attacks: ['pools', 'spawn', 'cone', 'spiral'], minion: 'bloater',
    phrase: 'Мои дети голодны.', ragePhrase: 'Плодитесь!',
  },
  final: {
    name: 'Нулевой пациент', level: 100, mark: 'final', hp: 4200, speed: 68, radius: 44, damage: 32,
    color: '#6a7a6a', cloth: '#2a1e2a', minion: 'runner', phases: 3,
    phaseAttacks: [
      ['charge', 'radial', 'slam', 'spawn'],
      ['spiral', 'cone', 'pools', 'charge', 'spawn'],
      ['charge', 'radial', 'spiral', 'spawn', 'slam', 'cone', 'teleport', 'pools'],
    ],
    phrase: 'Я был первым. Я буду последним.',
    phasePhrases: ['Ты думал, это конец?', 'Рассвета не будет!'],
    darkness: [0.35, 0.55, 0.7],
  },
};

const ENDING = {
  title: 'Последний рассвет',
  lines: [
    'Нулевой пациент пал.',
    'Без него орда потеряла голос — и разбрелась.',
    'Утром над Карантином впервые за много месяцев взошло солнце.',
    'Макс сел на крыше разбитой машины и смотрел, как оно поднимается.',
    'Город ещё долго будет залечивать раны.',
    'Но этот рассвет — не последний.',
  ],
  credits: [
    ['Последний рассвет', ''],
    ['Игра', 'Зомби-стрелялка для Яндекс Игр'],
    ['Герой', 'Макс'],
    ['Районы', 'Окраина · Промзона · Центр · Порт · Карантин'],
    ['Боссы', 'Мясник · Брандмейстер · Хирург · Рогач · Крысиный король'],
    ['', 'Невеста · Связист · Бронетанк · Матка · Нулевой пациент'],
    ['Код', 'Claude Code'],
    ['Спасибо, что играл!', ''],
  ],
};

// Экономика: улучшения за монеты, золото за боссов, звёзды и задания.
const ECONOMY = {
  weaponMaxLevel: 10,
  heroMaxLevel: 10,
  weaponCost: lvl => Math.round(60 * Math.pow(1.45, lvl - 1) / 10) * 10,
  heroCost: lvl => Math.round(90 * Math.pow(1.5, lvl - 1) / 10) * 10,
  weaponDamagePerLevel: 0.12,
  weaponRatePerLevel: 0.03,
  heroHpPerLevel: 0.08,
  heroSkillPerLevel: 0.1,
  bossGold: 25,          // первая победа над боссом
  threeStarGold: 2,      // первые три звезды на уровне
  startCoins: 0,
  tutorialReward: { coins: 200, gold: 10 },
};

// Задания (постоянные). stat — счётчик из сохранения.
const QUESTS = [
  { id: 'kill100',   text: 'Убей 100 зомби',           stat: 'kills',     goal: 100,   reward: { coins: 150 } },
  { id: 'kill1000',  text: 'Убей 1000 зомби',          stat: 'kills',     goal: 1000,  reward: { coins: 600, gold: 10 } },
  { id: 'kill5000',  text: 'Убей 5000 зомби',          stat: 'kills',     goal: 5000,  reward: { gold: 40 } },
  { id: 'level10',   text: 'Пройди 10 уровней',        stat: 'levels',    goal: 10,    reward: { coins: 300 } },
  { id: 'level50',   text: 'Пройди 50 уровней',        stat: 'levels',    goal: 50,    reward: { gold: 30 } },
  { id: 'boss1',     text: 'Победи первого босса',     stat: 'bosses',    goal: 1,     reward: { coins: 200 } },
  { id: 'boss5',     text: 'Победи 5 боссов',          stat: 'bosses',    goal: 5,     reward: { gold: 20 } },
  { id: 'stars30',   text: 'Собери 30 звёзд',          stat: 'stars',     goal: 30,    reward: { coins: 400 } },
  { id: 'stars150',  text: 'Собери 150 звёзд',         stat: 'stars',     goal: 150,   reward: { gold: 30 } },
  { id: 'streak30',  text: 'Сделай серию ×30',         stat: 'bestStreak', goal: 30,   reward: { coins: 300 } },
  { id: 'upgrade5',  text: 'Улучши оружие 5 раз',      stat: 'upgrades',  goal: 5,     reward: { coins: 250 } },
  { id: 'hero2',     text: 'Открой второго героя',     stat: 'heroes',    goal: 2,     reward: { coins: 500 } },
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

  const boss = Object.keys(BOSSES).find(id => BOSSES[id].level === n) || null;
  const waveCount = n < 4 ? 2 : n < 15 ? 3 : n < 50 ? 4 : 5;
  // Boss levels: shorter run-up, the last wave is the boss with a few adds.
  const normalWaves = boss ? (boss === 'final' ? 2 : waveCount - 1) : waveCount;
  const waves = [];
  let total = 0;
  for (let w = 0; w < normalWaves; w++) {
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
  let bossTime = 0;
  if (boss) {
    const b = BOSSES[boss];
    const adds = 4 + Math.floor(n / 10);
    waves.push({ boss, zombies: { [b.minion]: adds }, interval: 2.6, maxAlive: 6 });
    total += adds + 1;
    bossTime = (b.hp * (b.phases || 1)) / 55;
  }

  // Two rotating star goals (the first star is always "win").
  const pairs = [['hp', 'time'], ['streak', 'hits'], ['time', 'streak'], ['hits', 'hp']];
  const pair = pairs[(n - 1) % pairs.length];
  const goalValue = {
    hp: Math.min(70, 35 + Math.floor(n / 5) * 2),
    time: Math.round((total * 1.5 + waves.length * 6 + 25 + bossTime) / 5) * 5,
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
    boss,
    mods: {
      hp: 1 + (n - 1) * 0.035,
      speed: 1 + Math.min(0.25, (n - 1) * 0.003),
      damage: 1 + (n - 1) * 0.02,
    },
    stars: pair.map(type => ({ type, value: goalValue[type] })),
    reward: 20 + n * 4,
  };
}
