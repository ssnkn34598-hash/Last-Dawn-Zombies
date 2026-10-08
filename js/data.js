// ВРЕМЕННАЯ заглушка. Замените на js/data.js из rassvet-starter.zip.
// Каркас использует DISTRICTS, HEROES, WEAPONS, ZOMBIES, PERKS, BOSSES, QUESTS, ECONOMY,
// DROPS, ENDING и levelConfig(n).

const DISTRICTS = [
  { id: 'outskirts',  name: { ru: 'Окраина', en: 'Outskirts' },  levels: [1, 20],   ground: '#2b2f2a', groundAlt: '#33382f', road: '#26282b', line: '#c9a54a', accent: '#ffb547', debris: '#4a4136', barricade: '#6b4a2b',
    story: { ru: 'Связь пропала три дня назад. Макс выбрался из подвала на окраине и увидел, что улицы стали чужими. Где-то в центре ещё работает радио — значит, кто-то жив. Нужно пробиться через баррикады.', en: 'The phones went dead three days ago. Max crawled out of a basement on the outskirts and found the streets turned strange. Somewhere downtown a radio is still on — so someone is alive. Time to break through the barricades.' } },
  { id: 'industrial', name: { ru: 'Промзона', en: 'Industrial Zone' }, levels: [21, 40],  ground: '#2e2c29', groundAlt: '#38342e', road: '#232324', line: '#d0d0c0', accent: '#ff8a3a', debris: '#4d4238', barricade: '#5a4a3a',
    story: { ru: 'Заводы встали, но цеха не пустуют. Здесь собирают в стаи плевунов и толстяков — кто-то ими управляет. В бензобаках ещё есть топливо, а в бочках — порох.', en: 'The factories stopped, but the workshops aren\'t empty. Spitters and bloaters gather in packs here — someone is leading them. There\'s still fuel in the tanks and powder in the barrels.' } },
  { id: 'center',     name: { ru: 'Центр', en: 'Downtown' },    levels: [41, 60],  ground: '#2a2b30', groundAlt: '#32333a', road: '#1f2024', line: '#e0e0e0', accent: '#ffd36b', debris: '#45434a', barricade: '#6b5030',
    story: { ru: 'Площадь, мэрия, торговые центры. Раньше здесь гуляли люди, теперь бродит король этих улиц. Радиосигнал всё сильнее: его передают из порта.', en: 'The square, city hall, the malls. People used to stroll here; now the king of these streets roams them. The radio signal grows stronger — it comes from the port.' } },
  { id: 'port',       name: { ru: 'Порт', en: 'Port' },     levels: [61, 80],  ground: '#262d31', groundAlt: '#2d363b', road: '#202528', line: '#e0c040', accent: '#6bd0ff', debris: '#3a4246', barricade: '#4a3a2a',
    story: { ru: 'Корабли так и не ушли. Связист держит частоту и зовёт всех, кто остался. Но на его зов идут не только живые.', en: 'The ships never left. The Signalman holds the frequency and calls everyone who\'s left. But not only the living answer.' } },
  { id: 'quarantine', name: { ru: 'Карантин', en: 'Quarantine' }, levels: [81, 100], ground: '#2c2a2e', groundAlt: '#352f37', road: '#211f24', line: '#d84a4a', accent: '#ff5a5a', debris: '#463c46', barricade: '#5a3030',
    story: { ru: 'За забором карантинной зоны всё началось. Где-то там нулевой пациент — источник заразы. Если остановить его, город увидит рассвет.', en: 'It all began behind the quarantine fence. Somewhere in there is Patient Zero — the source of the plague. Stop him, and the city will see the dawn.' } },
];

// Герои. Макс есть сразу, остальных открывают за золото (gold).
// skill — активный навык (E / пробел на ПК, круглая кнопка на телефоне).
const HEROES = {
  max:   { name: { ru: 'Макс', en: 'Max' },  role: { ru: 'Выживший', en: 'Survivor' },  hp: 100, speed: 210, color: '#3d6fa8', hat: '#1f2a1f', magnet: 110, gold: 0,
           skill: { id: 'grenade',   name: { ru: 'Граната', en: 'Grenade' },      cd: 8,  desc: { ru: 'Бросает мощную гранату в ближайшую толпу.', en: 'Throws a powerful grenade into the nearest crowd.' } } },
  lena:  { name: { ru: 'Лена', en: 'Lena' },  role: { ru: 'Медик', en: 'Medic' },     hp: 95,  speed: 220, color: '#e8e8e8', hat: '#c83a3a', magnet: 130, gold: 50,
           skill: { id: 'heal',      name: { ru: 'Аптечка', en: 'Medkit' },      cd: 18, desc: { ru: 'Лечит 40% здоровья и даёт регенерацию.', en: 'Heals 40% health and adds regeneration.' } } },
  boris: { name: { ru: 'Борис', en: 'Boris' }, role: { ru: 'Громила', en: 'Brute' },   hp: 150, speed: 190, color: '#5a3a2a', hat: '#2a2a2a', magnet: 100, gold: 80,
           skill: { id: 'dash',      name: { ru: 'Таран', en: 'Ram' },        cd: 7,  desc: { ru: 'Рывок вперёд: сбивает и ранит зомби на пути.', en: 'Dashes forward, knocking down and hurting zombies in the way.' } } },
  nika:  { name: { ru: 'Ника', en: 'Nika' },  role: { ru: 'Инженер', en: 'Engineer' },   hp: 100, speed: 210, color: '#d87a2a', hat: '#e0c040', magnet: 110, gold: 120,
           skill: { id: 'turret',    name: { ru: 'Турель', en: 'Turret' },       cd: 18, desc: { ru: 'Ставит турель, которая 10 секунд стреляет сама.', en: 'Deploys a turret that fires on its own for 10 seconds.' } } },
  kim:   { name: { ru: 'Ким', en: 'Kim' },   role: { ru: 'Сержант', en: 'Sergeant' },   hp: 120, speed: 205, color: '#5a6a3a', hat: '#3a4a2a', magnet: 110, gold: 160,
           skill: { id: 'airstrike', name: { ru: 'Авиаудар', en: 'Airstrike' },     cd: 22, desc: { ru: 'Вызывает серию взрывов вокруг героя.', en: 'Calls in a series of explosions nearby.' } } },
  taya:  { name: { ru: 'Тая', en: 'Taya' },   role: { ru: 'Тень', en: 'Shadow' },      hp: 90,  speed: 235, color: '#5a3a7a', hat: '#2a1a3a', magnet: 120, gold: 200,
           skill: { id: 'freeze',    name: { ru: 'Заморозка', en: 'Freeze' },    cd: 16, desc: { ru: 'Замораживает всех зомби рядом на 3 секунды.', en: 'Freezes all nearby zombies for 3 seconds.' } } },
  doc:   { name: { ru: 'Док', en: 'Doc' },   role: { ru: 'Химик', en: 'Chemist' },     hp: 110, speed: 210, color: '#3a7a5a', hat: '#eaeaea', magnet: 110, gold: 250,
           skill: { id: 'frenzy',    name: { ru: 'Стимулятор', en: 'Stimulant' },   cd: 20, desc: { ru: '6 секунд: +50% урона и скорострельности.', en: '6 seconds of +50% damage and fire rate.' } } },
};

// type: bullet | bolt | flame | grenade | tesla | plasma | rocket
// rate — выстрелов в секунду, range — дальность (и радиус автоприцела).
const WEAPONS = [
  { id: 'pistol', unlock: 1, desc: { ru: 'Надёжный. С него всё начинается.', en: 'Reliable. Everything starts with it.' },   name: { ru: 'Пистолет', en: 'Pistol' },      type: 'bullet',  damage: 14, rate: 4,   range: 460, speed: 950, spread: 0.04, color: '#ffe08a' },
  { id: 'smg', unlock: 5, desc: { ru: 'Быстрая очередь, разброс побольше.', en: 'Fast bursts, a bit more spread.' },      name: { ru: 'Автомат', en: 'Rifle' },       type: 'bullet',  damage: 9,  rate: 11,  range: 420, speed: 1000, spread: 0.11, color: '#ffd36b' },
  { id: 'shotgun', unlock: 9, desc: { ru: 'Веер дроби — сносит толпу вблизи.', en: 'A spray of buckshot — clears crowds up close.' },  name: { ru: 'Дробовик', en: 'Shotgun' },      type: 'bullet',  damage: 9,  rate: 1.4, range: 300, speed: 900, spread: 0.32, pellets: 7, knock: 140, color: '#ffc45a' },
  { id: 'crossbow', unlock: 14, desc: { ru: 'Болт пробивает несколько врагов.', en: 'Bolts pierce several enemies.' }, name: { ru: 'Арбалет', en: 'Crossbow' },       type: 'bolt',    damage: 48, rate: 1.4, range: 560, speed: 1150, pierce: 4, knock: 90, color: '#c9e6ff' },
  { id: 'flamer', unlock: 19, desc: { ru: 'Поджигает всё перед собой.', en: 'Sets everything in front of you on fire.' },   name: { ru: 'Огнемёт', en: 'Flamethrower' },       type: 'flame',   damage: 4,  rate: 28,  range: 210, speed: 420, burn: { dps: 8, time: 2.5 }, color: '#ff8a2a' },
  { id: 'launcher', unlock: 25, desc: { ru: 'Граната по дуге, взрыв по площади.', en: 'Lobbed grenades with area damage.' }, name: { ru: 'Гранатомёт', en: 'Grenade Launcher' },    type: 'grenade', damage: 70, rate: 1,   range: 400, radius: 105, color: '#9bd36b' },
  { id: 'tesla', unlock: 33, desc: { ru: 'Молния перескакивает между врагами.', en: 'Lightning jumps between enemies.' },    name: { ru: 'Тесла', en: 'Tesla' },         type: 'tesla',   damage: 22, rate: 3,   range: 330, chains: 5, chainRange: 170, color: '#8fd8ff' },
  { id: 'plasma', unlock: 45, desc: { ru: 'Сгусток плазмы прожигает насквозь.', en: 'Plasma bolts burn right through.' },   name: { ru: 'Плазмаган', en: 'Plasma Gun' },     type: 'plasma',  damage: 32, rate: 3.2, range: 480, speed: 620, pierce: 3, radius: 45, color: '#c46bff' },
  { id: 'rocket', unlock: 60, desc: { ru: 'Самонаводящаяся ракета, огромный взрыв.', en: 'Homing rockets, huge explosions.' },   name: { ru: 'Ракетница', en: 'Rocket Launcher' },     type: 'rocket',  damage: 120, rate: 0.75, range: 560, speed: 260, radius: 140, color: '#ff5a3a' },
  { id: 'minigun', unlock: 75, desc: { ru: 'Шквал пуль без остановки.', en: 'A non-stop hail of bullets.' },  name: { ru: 'Пулемёт', en: 'Machine Gun' },       type: 'bullet',  damage: 8,  rate: 20,  range: 440, speed: 1050, spread: 0.16, color: '#ffe8a8' },
];

// behavior: chase | lunge | ranged | explode | scream | leap
// unlock — уровень, на котором тип появляется впервые (карточка «НОВЫЙ ВРАГ»).
const ZOMBIES = {
  walker:   { name: { ru: 'Бродяга', en: 'Walker' },  unlock: 1,  hp: 32,  speed: 52,  damage: 10, radius: 15, xp: 1, coin: 0.30, color: '#6b8255', shirt: '#4a4e5c', behavior: 'chase',
              desc: { ru: 'Медленный, но их много. Не дай себя окружить.', en: 'Slow, but there are many. Don\'t get surrounded.' } },
  runner:   { name: { ru: 'Бегун', en: 'Runner' },    unlock: 2,  hp: 20,  speed: 125, damage: 8,  radius: 13, xp: 2, coin: 0.35, color: '#7d8a5c', shirt: '#7a2f2a', behavior: 'chase',
              desc: { ru: 'Очень быстрый и хрупкий. Стреляй первым.', en: 'Very fast and fragile. Shoot first.' } },
  crawler:  { name: { ru: 'Ползун', en: 'Crawler' },   unlock: 4,  hp: 24,  speed: 38,  damage: 9,  radius: 14, xp: 2, coin: 0.35, color: '#5d6e4c', shirt: '#3f3a33', behavior: 'lunge', lungeRange: 170, lungeMul: 2.8,
              desc: { ru: 'Ползёт медленно, но вблизи делает резкий рывок.', en: 'Crawls slowly, but lunges when close.' } },
  spitter:  { name: { ru: 'Плевун', en: 'Spitter' },   unlock: 6,  hp: 30,  speed: 50,  damage: 6,  radius: 15, xp: 3, coin: 0.45, color: '#7ea04a', shirt: '#4d5a2e', behavior: 'ranged', keepDist: 250, spitDamage: 9, spitEvery: 2.2,
              desc: { ru: 'Держится на расстоянии и плюётся кислотой. Уходи с линии плевка.', en: 'Keeps its distance and spits acid. Step out of the line of fire.' } },
  bloater:  { name: { ru: 'Толстяк', en: 'Bloater' },  unlock: 9,  hp: 70,  speed: 36,  damage: 14, radius: 22, xp: 4, coin: 0.55, color: '#9a9a52', shirt: '#6e6438', behavior: 'explode', blastRadius: 95, blastDamage: 22, mass: 2.5,
              desc: { ru: 'Взрывается рядом с тобой и при смерти. Убивай издалека — взрыв задевает и зомби.', en: 'Explodes next to you and when it dies. Kill it from afar — the blast hurts zombies too.' } },
  armored:  { name: { ru: 'Омоновец', en: 'Riot Cop' }, unlock: 12, hp: 90,  speed: 46,  damage: 14, radius: 17, xp: 5, coin: 0.7,  color: '#62775a', shirt: '#2b3442', behavior: 'chase', armor: 0.5, mass: 2,
              desc: { ru: 'Броня гасит половину урона. Взрывы, огонь и тесла бьют в полную силу.', en: 'Armor blocks half the damage. Explosions, fire and Tesla hit in full.' } },
  screamer: { name: { ru: 'Крикун', en: 'Screamer' },   unlock: 16, hp: 45,  speed: 58,  damage: 8,  radius: 15, xp: 4, coin: 0.55, color: '#a9b49a', shirt: '#5e4a66', behavior: 'scream', screamEvery: 5, screamRadius: 260,
              desc: { ru: 'Своим криком ускоряет зомби вокруг. Убивай его первым.', en: 'Its scream speeds up nearby zombies. Kill it first.' } },
  jumper:   { name: { ru: 'Прыгун', en: 'Leaper' },   unlock: 21, hp: 40,  speed: 70,  damage: 14, radius: 14, xp: 4, coin: 0.5,  color: '#78806a', shirt: '#4b2f4f', behavior: 'leap', leapRange: [110, 320], leapEvery: 3,
              desc: { ru: 'Перед прыжком замирает и показывает красную линию. Отскочи в сторону.', en: 'Freezes and shows a red line before it leaps. Dodge sideways.' } },
  brute:    { name: { ru: 'Громила', en: 'Brute' },  unlock: 26, hp: 180, speed: 42,  damage: 25, radius: 26, xp: 6, coin: 0.8,  color: '#56704a', shirt: '#2e2a26', behavior: 'chase', mass: 4,
              desc: { ru: 'Огромный и живучий, бьёт очень больно. Держи дистанцию.', en: 'Huge and tough, hits very hard. Keep your distance.' } },
};

// Улучшения внутри уровня (выбор 1 из 3 при повышении уровня).
const PERKS = [
  { id: 'damage',    name: { ru: 'Тяжёлые пули', en: 'Heavy Rounds' },    desc: { ru: '+20% урона', en: '+20% damage' },                              max: 5, icon: '✸', color: '#ff7a4a' },
  { id: 'firerate',  name: { ru: 'Быстрый спуск', en: 'Hair Trigger' },   desc: { ru: '+15% скорострельности', en: '+15% fire rate' },                  max: 5, icon: '»', color: '#ffd36b' },
  { id: 'speed',     name: { ru: 'Лёгкие кроссовки', en: 'Light Sneakers' }, desc: { ru: '+12% скорости бега', en: '+12% move speed' },                    max: 4, icon: '➤', color: '#8fd8ff' },
  { id: 'maxhp',     name: { ru: 'Крепкое здоровье', en: 'Tough Body' }, desc: { ru: '+25 к здоровью и лечение', en: '+25 max health and a heal' },             max: 5, icon: '♥', color: '#ff5a6a' },
  { id: 'magnet',    name: { ru: 'Магнит', en: 'Magnet' },           desc: { ru: '+60% радиус притяжения наград', en: '+60% pickup radius' },         max: 3, icon: 'U', color: '#c0c0ff' },
  { id: 'regen',     name: { ru: 'Регенерация', en: 'Regeneration' },      desc: { ru: '+1.5 здоровья в секунду', en: '+1.5 health per second' },               max: 4, icon: '+', color: '#5aff7a' },
  { id: 'multishot', name: { ru: 'Двойной выстрел', en: 'Double Shot' },  desc: { ru: '+1 снаряд за выстрел', en: '+1 projectile per shot' },                  max: 3, icon: '⋔', color: '#ffb547' },
  { id: 'pierce',    name: { ru: 'Бронебойные', en: 'Armor-Piercing' },      desc: { ru: 'Пули пробивают ещё одного врага', en: 'Bullets pierce one more enemy' },       max: 3, icon: '➶', color: '#e0e0e0' },
  { id: 'crit',      name: { ru: 'Меткий глаз', en: 'Sharp Eye' },      desc: { ru: '+10% шанс двойного урона', en: '+10% chance of double damage' },              max: 4, icon: '◎', color: '#ffd23a' },
  { id: 'saw',       name: { ru: 'Пила', en: 'Saw Blade' },             desc: { ru: 'Вращающаяся пила вокруг героя (+1 диск)', en: 'A spinning saw around the hero (+1 blade)' }, max: 4, icon: '✺', color: '#d0d8e0' },
  { id: 'ice',       name: { ru: 'Ледяные пули', en: 'Ice Rounds' },     desc: { ru: 'Попадания замедляют врагов', en: 'Hits slow enemies down' },            max: 3, icon: '❄', color: '#9fe6ff' },
  { id: 'fire',      name: { ru: 'Зажигательные пули', en: 'Incendiary Rounds' }, desc: { ru: 'Попадания поджигают врагов', en: 'Hits set enemies on fire' },          max: 3, icon: '♨', color: '#ff8a2a' },
  { id: 'boom',      name: { ru: 'Детонация', en: 'Detonation' },        desc: { ru: 'Убитые зомби взрываются (шанс 20%)', en: 'Killed zombies may explode (20% chance)' },     max: 3, icon: '✹', color: '#ff5a3a' },
];

// Боссы каждые 10 уровней. mark — внешний вид, attacks — набор приёмов:
// charge | radial | spiral | spawn | slam | cone | teleport | pools.
// На 50% здоровья босс впадает в ярость (быстрее, чаще, больше снарядов).
const BOSSES = {
  butcher: {
    name: { ru: 'Мясник', en: 'Butcher' }, level: 10, mark: 'cleaver', hp: 1500, speed: 72, radius: 32, damage: 20,
    color: '#7f8f5c', cloth: '#5a2a22', attacks: ['charge', 'slam', 'spawn'], minion: 'walker',
    phrase: { ru: 'Свежее мясо само пришло!', en: 'Fresh meat delivered itself!' }, ragePhrase: { ru: 'Порублю на фарш!', en: 'I\'ll chop you to mince!' },
  },
  fireman: {
    name: { ru: 'Брандмейстер', en: 'Fire Chief' }, level: 20, mark: 'helmet', hp: 2100, speed: 70, radius: 32, damage: 22,
    color: '#7a8a60', cloth: '#3a3a42', attacks: ['charge', 'radial', 'spawn'], minion: 'runner',
    phrase: { ru: 'Пожар потушен. Остался ты.', en: 'The fire\'s out. Only you remain.' }, ragePhrase: { ru: 'Всё сгорит!', en: 'Everything burns!' },
  },
  surgeon: {
    name: { ru: 'Хирург', en: 'Surgeon' }, level: 30, mark: 'mask', hp: 2700, speed: 66, radius: 30, damage: 22,
    color: '#a0ab8a', cloth: '#3f6f6a', attacks: ['cone', 'pools', 'teleport'], minion: 'crawler',
    phrase: { ru: 'Пациент, ложитесь на стол.', en: 'Patient, lie down on the table.' }, ragePhrase: { ru: 'Операция без наркоза!', en: 'Surgery without anesthesia!' },
  },
  horned: {
    name: { ru: 'Рогач', en: 'Horned One' }, level: 40, mark: 'horns', hp: 3300, speed: 74, radius: 36, damage: 26,
    color: '#6a5f50', cloth: '#3a2a20', attacks: ['charge', 'slam', 'radial'], minion: 'runner',
    phrase: { ru: 'Это мой район. Мои рога.', en: 'This is my turf. My horns.' }, ragePhrase: { ru: 'Растопчу!', en: 'I\'ll trample you!' },
  },
  king: {
    name: { ru: 'Крысиный король', en: 'Rat King' }, level: 50, mark: 'crown', hp: 3900, speed: 62, radius: 34, damage: 24,
    color: '#8a9070', cloth: '#5a2a5a', attacks: ['spawn', 'spiral', 'radial'], minion: 'crawler',
    phrase: { ru: 'На колени перед королём!', en: 'Kneel before the king!' }, ragePhrase: { ru: 'Слуги, ко мне!', en: 'Servants, to me!' },
  },
  bride: {
    name: { ru: 'Невеста', en: 'Bride' }, level: 60, mark: 'veil', hp: 4500, speed: 80, radius: 28, damage: 24,
    color: '#b8bca8', cloth: '#d8d4cc', attacks: ['teleport', 'spiral', 'cone'], minion: 'screamer',
    phrase: { ru: 'Он так и не пришёл… Может, ты?', en: 'He never came… Maybe you will?' }, ragePhrase: { ru: 'Ты меня бросил!', en: 'You left me!' },
  },
  signal: {
    name: { ru: 'Связист', en: 'Signalman' }, level: 70, mark: 'antenna', hp: 5100, speed: 70, radius: 32, damage: 26,
    color: '#7a8a70', cloth: '#3a4a3a', attacks: ['radial', 'spiral', 'teleport', 'spawn'], minion: 'jumper',
    phrase: { ru: 'Приём… Цель обнаружена.', en: 'Copy… Target acquired.' }, ragePhrase: { ru: 'Всем частям: огонь!', en: 'All units: open fire!' },
  },
  tank: {
    name: { ru: 'Бронетанк', en: 'Ironclad' }, level: 80, mark: 'armor', hp: 6000, speed: 58, radius: 40, damage: 30,
    color: '#5f6f55', cloth: '#2e343c', attacks: ['charge', 'slam', 'pools', 'radial'], minion: 'armored',
    phrase: { ru: 'Броня крепка. А ты?', en: 'My armor is strong. Are you?' }, ragePhrase: { ru: 'Таран!', en: 'Ramming speed!' },
  },
  hive: {
    name: { ru: 'Матка', en: 'Hive Mother' }, level: 90, mark: 'growths', hp: 6800, speed: 56, radius: 40, damage: 28,
    color: '#8a9a5a', cloth: '#5a4a3a', attacks: ['pools', 'spawn', 'cone', 'spiral'], minion: 'bloater',
    phrase: { ru: 'Мои дети голодны.', en: 'My children are hungry.' }, ragePhrase: { ru: 'Плодитесь!', en: 'Multiply!' },
  },
  final: {
    name: { ru: 'Нулевой пациент', en: 'Patient Zero' }, level: 100, mark: 'final', hp: 4200, speed: 68, radius: 44, damage: 32,
    color: '#6a7a6a', cloth: '#2a1e2a', minion: 'runner', phases: 3,
    phaseAttacks: [
      ['charge', 'radial', 'slam', 'spawn'],
      ['spiral', 'cone', 'pools', 'charge', 'spawn'],
      ['charge', 'radial', 'spiral', 'spawn', 'slam', 'cone', 'teleport', 'pools'],
    ],
    phrase: { ru: 'Я был первым. Я буду последним.', en: 'I was the first. I\'ll be the last.' },
    phasePhrases: [
      { ru: 'Ты думал, это конец?', en: 'You thought this was the end?' },
      { ru: 'Рассвета не будет!', en: 'There will be no dawn!' },
    ],
    darkness: [0.35, 0.55, 0.7],
  },
};

const ENDING = {
  title: { ru: 'Последний рассвет', en: 'The Last Dawn' },
  lines: {
    ru: [
      'Нулевой пациент пал.',
      'Без него орда потеряла голос — и разбрелась.',
      'Утром над Карантином впервые за много месяцев взошло солнце.',
      'Макс сел на крыше разбитой машины и смотрел, как оно поднимается.',
      'Город ещё долго будет залечивать раны.',
      'Но этот рассвет — не последний.',
    ],
    en: [
      'Patient Zero has fallen.',
      'Without him, the horde lost its voice — and scattered.',
      'In the morning, for the first time in months, the sun rose over the Quarantine.',
      'Max sat on the roof of a wrecked car and watched it climb.',
      'The city will be healing its wounds for a long time.',
      'But this dawn is not the last.',
    ],
  },
  credits: {
    ru: [
      ['Последний рассвет', ''],
      ['Игра', 'Зомби-стрелялка для Яндекс Игр'],
      ['Герой', 'Макс'],
      ['Районы', 'Окраина · Промзона · Центр · Порт · Карантин'],
      ['Боссы', 'Мясник · Брандмейстер · Хирург · Рогач · Крысиный король'],
      ['', 'Невеста · Связист · Бронетанк · Матка · Нулевой пациент'],
      ['Код', 'Claude Code'],
      ['Спасибо, что играл!', ''],
    ],
    en: [
      ['The Last Dawn', ''],
      ['Game', 'A zombie shooter for Yandex Games'],
      ['Hero', 'Max'],
      ['Districts', 'Outskirts · Industrial Zone · Downtown · Port · Quarantine'],
      ['Bosses', 'Butcher · Fire Chief · Surgeon · Horned One · Rat King'],
      ['', 'Bride · Signalman · Ironclad · Hive Mother · Patient Zero'],
      ['Code', 'Claude Code'],
      ['Thanks for playing!', ''],
    ],
  },
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
  { id: 'kill100',   text: { ru: 'Убей 100 зомби', en: 'Kill 100 zombies' },           stat: 'kills',     goal: 100,   reward: { coins: 150 } },
  { id: 'kill1000',  text: { ru: 'Убей 1000 зомби', en: 'Kill 1000 zombies' },          stat: 'kills',     goal: 1000,  reward: { coins: 600, gold: 10 } },
  { id: 'kill5000',  text: { ru: 'Убей 5000 зомби', en: 'Kill 5000 zombies' },          stat: 'kills',     goal: 5000,  reward: { gold: 40 } },
  { id: 'level10',   text: { ru: 'Пройди 10 уровней', en: 'Clear 10 levels' },        stat: 'levels',    goal: 10,    reward: { coins: 300 } },
  { id: 'level50',   text: { ru: 'Пройди 50 уровней', en: 'Clear 50 levels' },        stat: 'levels',    goal: 50,    reward: { gold: 30 } },
  { id: 'boss1',     text: { ru: 'Победи первого босса', en: 'Defeat your first boss' },     stat: 'bosses',    goal: 1,     reward: { coins: 200 } },
  { id: 'boss5',     text: { ru: 'Победи 5 боссов', en: 'Defeat 5 bosses' },          stat: 'bosses',    goal: 5,     reward: { gold: 20 } },
  { id: 'stars30',   text: { ru: 'Собери 30 звёзд', en: 'Collect 30 stars' },          stat: 'stars',     goal: 30,    reward: { coins: 400 } },
  { id: 'stars150',  text: { ru: 'Собери 150 звёзд', en: 'Collect 150 stars' },         stat: 'stars',     goal: 150,   reward: { gold: 30 } },
  { id: 'streak30',  text: { ru: 'Сделай серию ×30', en: 'Get a ×30 streak' },         stat: 'bestStreak', goal: 30,   reward: { coins: 300 } },
  { id: 'upgrade5',  text: { ru: 'Улучши оружие 5 раз', en: 'Upgrade weapons 5 times' },      stat: 'upgrades',  goal: 5,     reward: { coins: 250 } },
  { id: 'hero2',     text: { ru: 'Открой второго героя', en: 'Unlock a second hero' },     stat: 'heroes',    goal: 2,     reward: { coins: 500 } },
];

// ---------- Ежедневное ----------

// Награды за вход 7 дней подряд (потом круг заново).
const DAILY_LOGIN = [
  { coins: 100 },
  { coins: 150 },
  { gold: 3 },
  { coins: 250 },
  { chest: true },
  { coins: 400 },
  { coins: 300, gold: 15 },
];

// Пул заданий дня: каждый день выбираются 3 разных. max — считается лучший результат, а не сумма.
const DAILY_TASKS = [
  { id: 'kills',     stat: 'kills',     text: { ru: 'Убей {n} зомби', en: 'Kill {n} zombies' },  goals: [60, 100, 150], reward: { coins: 120 } },
  { id: 'wins',      stat: 'wins',      text: { ru: 'Пройди {n|# уровень|# уровня|# уровней}', en: 'Clear {n|# level|# levels}' },  goals: [2, 3],         reward: { coins: 150 } },
  { id: 'stars',     stat: 'stars',     text: { ru: 'Получи {n|# звезду|# звезды|# звёзд}', en: 'Earn {n|# star|# stars}' },  goals: [4, 6],         reward: { coins: 150 } },
  { id: 'skill',     stat: 'skill',     text: { ru: 'Используй навык {n|# раз|# раза|# раз}', en: 'Use your skill {n|# time|# times}' },  goals: [5, 8],         reward: { coins: 100 } },
  { id: 'barrels',   stat: 'barrels',   text: { ru: 'Взорви {n|# бочку|# бочки|# бочек}', en: 'Blow up {n|# barrel|# barrels}' },  goals: [3, 5],         reward: { coins: 100 } },
  { id: 'coins',     stat: 'coins',     text: { ru: 'Подбери {n|# монету|# монеты|# монет}', en: 'Pick up {n|# coin|# coins}' },  goals: [30, 60],       reward: { coins: 120 } },
  { id: 'perks',     stat: 'perks',     text: { ru: 'Возьми {n|# улучшение|# улучшения|# улучшений}', en: 'Take {n|# perk|# perks}' },  goals: [5, 8],         reward: { coins: 100 } },
  { id: 'streak',    stat: 'streak',    text: { ru: 'Сделай серию ×{n}', en: 'Get a ×{n} streak' },  goals: [15, 25], max: true, reward: { coins: 150 } },
  { id: 'challenge', stat: 'challenge', text: { ru: 'Пройди Испытание дня', en: 'Complete the daily challenge' },  goals: [1],            reward: { coins: 200 } },
];
const DAILY_BONUS = { coins: 200, gold: 5 };

// Модификаторы Испытания дня (каждый день — два случайных).
const CHALLENGE_MODS = [
  { id: 'fast',      name: { ru: 'Быстрые мертвецы', en: 'Fast Dead' },  desc: { ru: 'Зомби на 35% быстрее', en: 'Zombies are 35% faster' },                 color: '#ff8a4a' },
  { id: 'tough',     name: { ru: 'Толстокожие', en: 'Thick Skin' },       desc: { ru: 'У зомби на 60% больше здоровья', en: 'Zombies have 60% more health' },       color: '#9fb3c8' },
  { id: 'horde',     name: { ru: 'Орда', en: 'Horde' },              desc: { ru: 'В полтора раза больше зомби', en: '50% more zombies' },          color: '#d84a4a' },
  { id: 'glass',     name: { ru: 'Стеклянная пушка', en: 'Glass Cannon' },  desc: { ru: 'Здоровья вдвое меньше, урон +50%', en: 'Half health, +50% damage' },     color: '#8fd8ff' },
  { id: 'night',     name: { ru: 'Тёмная ночь', en: 'Dark Night' },       desc: { ru: 'Видно только вокруг героя', en: 'You only see around the hero' },            color: '#6a5aff' },
  { id: 'fog',       name: { ru: 'Туман', en: 'Fog' },             desc: { ru: 'Улицы затянуло туманом', en: 'The streets are covered in fog' },               color: '#a0a0b0' },
  { id: 'nomed',     name: { ru: 'Без аптечек', en: 'No Medkits' },       desc: { ru: 'Аптечки не выпадают', en: 'Medkits don\'t drop' },                  color: '#ff5a6a' },
  { id: 'explosive', name: { ru: 'Взрывоопасно', en: 'Explosive' },      desc: { ru: 'Больше бочек, зомби иногда взрываются', en: 'More barrels, zombies sometimes explode' }, color: '#ffb547' },
  { id: 'runners',   name: { ru: 'Марафон', en: 'Marathon' },           desc: { ru: 'Все бродяги стали бегунами', en: 'All walkers are now runners' },           color: '#ffd36b' },
  { id: 'noperks',   name: { ru: 'Без улучшений', en: 'No Perks' },     desc: { ru: 'Новый уровень лечит, а не улучшает', en: 'Level-ups heal instead of giving perks' },   color: '#c8b898' },
  { id: 'goldrush',  name: { ru: 'Золотая лихорадка', en: 'Gold Rush' }, desc: { ru: 'Монеты из зомби — вдвое дороже', en: 'Coins from zombies are worth double' },       color: '#ffd23a' },
];
const CHALLENGE_REWARD = { coins: 300, gold: 8 };

// Сундуки: за каждые 15 звёзд и бесплатный раз в FREE_CHEST_HOURS часа.
const STAR_CHEST_EVERY = 15;
const FREE_CHEST_HOURS = 4;

const DROPS = {
  medkitChance: 0.035,
  medkitHeal: 25,
  lifetime: 20,
};

// Опыт до следующего уровня внутри боя.
function xpToLevel(lvl) {
  return 6 + lvl * 5;
}

// Тексты целей звёзд — в i18n.js (goal.hp, goal.time, goal.streak, goal.hits).

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
