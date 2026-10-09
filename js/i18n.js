// Localisation: t('key', vars) for interface strings, L(value) for content
// stored in data.js as { ru, en }.
//
// Placeholders: {name} → vars.name.
// Plurals: {n|# звезда|# звезды|# звёзд} (ru: one|few|many),
//          {n|# star|# stars} (en: one|other); '#' is replaced by the number.

const LANGS = ['ru', 'en'];

const STRINGS = {
  ru: {
    // Shell & loading
    'title': 'Последний рассвет',
    'logo': 'Последний <span>рассвет</span>',
    'loading': 'Загрузка…',
    'rotate.title': 'Поверни телефон',
    'rotate.sub': 'Играть можно только горизонтально',
    'tab.battle': 'Бой',
    'tab.map': 'Карта',
    'tab.arsenal': 'Арсенал',
    'tab.heroes': 'Герои',
    'tab.quests': 'Задания',
    'chip.coins': 'Монеты',
    'chip.gold': 'Золото',
    'chip.stars': 'Звёзды',
    'btn.sound': 'Звук',
    'btn.settings': 'Настройки',
    'debug.shiftDay': '+1 день',

    // Common
    'lvl.short': 'ур. {n}',
    'level': 'Уровень {n}',
    'levelDistrict': 'Уровень {n} · {district}',
    'max': 'Макс.',
    'take': 'Забрать',
    'open': 'Открыть',
    'ready': 'Готов!',
    'in': 'через {time}',
    'ok': 'OK',
    'cancel': 'Отмена',
    'yes': 'Да',
    'menu': 'В меню',
    'retry': 'Заново',
    'next': 'Дальше',
    'resume': 'Продолжить',
    'later': 'Позже',
    'done': 'Готово',

    // Battle tab
    'battle.play': 'ИГРАТЬ',
    'battle.boss': '☠ Босс: {name}',
    'battle.districtStars': '★ {have} / {total} в районе',
    'battle.ahead': 'Впереди',
    'battle.unlocksAt': 'откроется на ур. {n}',
    'battle.dailyTasks': 'Задания дня',
    'battle.rewardsWaiting': 'есть награды!',
    'battle.challengeWaits': 'испытание ждёт',
    'battle.adCoins': 'Монеты за рекламу',
    'battle.adCoinsSub': 'за просмотр рекламы',

    // Map
    'map.levels': 'Уровни {a}–{b} · ★ {have}/{total}',

    // Arsenal
    'arsenal.level': 'Ур. {n}/{max}',
    'arsenal.damage': 'Урон',
    'arsenal.rate': 'Темп',
    'arsenal.range': 'Дальность',
    'arsenal.inHands': 'В руках',
    'arsenal.equip': 'Взять',
    'arsenal.unlocksAt': 'Откроется на уровне {n}',
    'wtype.bullet': 'Пули',
    'wtype.bolt': 'Болты',
    'wtype.flame': 'Огонь',
    'wtype.grenade': 'Гранаты',
    'wtype.tesla': 'Молния',
    'wtype.plasma': 'Плазма',
    'wtype.rocket': 'Ракеты',

    // Heroes
    'heroes.selected': 'Выбран',
    'heroes.select': 'Выбрать',
    'heroes.unlock': 'Открыть ◆ {n}',
    'heroes.cdSec': '{n}с',

    // Quests tab
    'daily.tasks': 'Задания дня',
    'daily.newIn': 'новые через {time}',
    'daily.allThree': 'Все три задания',
    'daily.challenge': 'Испытание дня',
    'daily.reward': 'Награда:',
    'daily.challengeDone': 'Пройдено ✓ — завтра новое',
    'daily.challengeStart': 'Начать испытание',
    'daily.chests': 'Сундуки',
    'daily.freeChest': 'Бесплатный',
    'daily.starChest': 'Звёздный',
    'daily.chestNow': 'Сейчас ▶',
    'daily.chestNote': 'Звёздный сундук — за каждые {stars} звёзд. Бесплатный — раз в {hours|# час|# часа|# часов}.',
    'daily.achievements': 'Достижения',

    // Login
    'login.title': 'Ежедневная награда',
    'login.streak': 'Ты заходишь {n|# день|# дня|# дней} подряд!',
    'login.first': 'Заходи каждый день — награды растут.',
    'login.reset': 'Пропустишь день — счёт начнётся заново.',
    'login.day': 'День {n}',
    'login.chest': 'Сундук',
    'login.double': '×2 ▶ реклама',

    // Chests
    'chest.daily': 'Сундук дня',
    'chest.dailyDouble': 'Награда дня ×2',
    'chest.free': 'Бесплатный сундук',
    'chest.star': 'Звёздный сундук',
    'chest.adCoins': 'Монеты за рекламу',

    // Settings
    'settings.title': 'Настройки',
    'settings.aim': 'Прицел',
    'settings.aimAuto': 'Авто',
    'settings.aimManual': 'Ручной',
    'settings.aimAutoHint': 'Герой сам целится в ближайшего зомби и стреляет.',
    'settings.aimTouchHint': 'Правый джойстик — прицел и огонь.',
    'settings.aimMouseHint': 'Мышь — прицел, левая кнопка — огонь.',
    'settings.sound': 'Звук',
    'settings.on': 'Вкл',
    'settings.off': 'Выкл',
    'settings.lang': 'Язык',
    'settings.tutorial': 'Пройти обучение',
    'settings.reset': 'Сбросить прогресс',
    'settings.resetTitle': 'Сбросить весь прогресс?',
    'settings.resetText': 'Монеты, звёзды, оружие и герои пропадут.',

    // Pause
    'pause.title': 'Пауза',
    'pause.tutorial': 'Обучение · шаг {n}/{total}',
    'pause.level': 'Уровень {n} · {district} · волна {w}/{waves}',

    // Victory / defeat
    'win.title': 'ПОБЕДА!',
    'win.challenge': 'ИСПЫТАНИЕ ПРОЙДЕНО!',
    'win.challengeSub': 'Испытание дня',
    'win.stats': '☠ {kills} · ⏱ {time} · серия ×{best}',
    'win.double': '● ×2 монеты ▶',
    'lose.title': 'ТЫ ПОГИБ',
    'lose.wave': 'дошёл до волны {w}/{waves}',
    'lose.half': 'половина собранного',
    'lose.kept': 'все монеты сохранены',
    'lose.revive': '♥ Второй шанс ▶',
    'lose.keep': '● Сохранить все {n} ▶',
    'lose.arsenal': 'Арсенал',

    // Reveals & story
    'reveal.weapon': 'НОВОЕ ОРУЖИЕ',
    'reveal.takeWeapon': 'Взять в бой',
    'reveal.hero': 'НОВЫЙ ГЕРОЙ',
    'reveal.joinSquad': 'В отряд!',
    'story.district': 'Район {n} из {total}',
    'story.go': 'Вперёд',

    // Tutorial windows
    'tut.offerTitle': 'Привет, я Ворон',
    'tut.offerText': 'Город захватили мертвецы. Я покажу, как здесь выжить: 8 коротких шагов, пара минут.',
    'tut.offerReward': 'За обучение — награда: ● {coins} и ◆ {gold}.',
    'tut.skip': 'Пропустить',
    'tut.learn': 'Пройти обучение',
    'tut.doneTitle': 'Обучение пройдено!',
    'tut.doneText': 'Теперь ты готов. Дальше — Окраина и первые волны. Я буду подсказывать по пути.',
    'tut.doneAlready': 'Награда уже получена раньше.',
    'tut.doneGo': 'В бой!',
    'tut.skipTitle': 'Пропустить обучение?',
    'tut.skipText': 'Его можно пройти позже: Настройки → «Пройти обучение».',

    // Ads
    'ad.demo': 'Демо-реклама',
    'ad.rewarded': 'Реклама за награду',
    'ad.interstitial': 'Реклама между уровнями',
    'ad.note': 'На игровой платформе здесь будет настоящая реклама',
    'ad.unavailable': 'Реклама сейчас недоступна, попробуй чуть позже',
    'btn.social': 'Сообщество',
    'social.title': 'Сообщество',
    'social.sub': 'Зови друзей — вместе отбиваться веселее',
    'social.invite': 'Пригласить друзей',
    'social.wall': 'Рассказать на стене',
    'social.share': 'Поделиться игрой',
    'social.group': 'Вступить в сообщество',
    'social.favorites': 'Добавить в избранное',
    'social.home': 'Добавить на главный экран',
    'social.notify': 'Включить уведомления',
    'social.none': 'Здесь пока ничего нет',
    'social.rewarded': 'Спасибо! ● +{n}',
    'win.share': 'Поделиться',
    'vk.wallText': 'Я держу оборону в «Последнем рассвете»! Присоединяйся — до утра надо дожить вместе.',
    'ad.perks': 'Другие улучшения',
    'ad.revive': 'Второй шанс',
    'ad.keep': 'Сохранить монеты',
    'ad.double': '×2 монеты',
    'ad.dailyDouble': '×2 награда дня',
    'ad.chest': 'Сундук без ожидания',
    'ad.coins': 'Монеты',

    // HUD (canvas)
    'hud.lvl': 'УР. {n}',
    'hud.tutorial': 'Обучение',
    'hud.wave': 'ВОЛНА {n}/{total}',
    'hud.nextWave': 'Следующая волна через {n}',
    'hud.left': 'Осталось зомби: {n}',
    'hud.streak': 'СЕРИЯ ×{n}',
    'hud.aimAuto': 'Прицел: АВТО',
    'hud.aimManual': 'Прицел: РУЧНОЙ',
    'hud.debugTouch': 'debug: тап по оружию — следующее',
    'hud.debugKeys': 'debug: 1–9, 0 — оружие · M — прицел',
    'hud.rage': 'ЯРОСТЬ',
    'hud.skipTutorial': 'Пропустить обучение',
    'hud.ravenStep': 'ВОРОН · ШАГ {n}/{total}',
    'hud.newEnemy': 'НОВЫЙ ВРАГ',
    'hud.enemyStats': 'Здоровье {hp} · Скорость {speed} · Урон {dmg}',
    'hud.fight': 'В БОЙ',
    'hud.levelUp': 'УРОВЕНЬ {n}!',
    'hud.pickPerk': 'Выбери улучшение',
    'hud.reroll': '⟳ Другие варианты  ▶ реклама',
    'hud.citySaved': 'Город спасён',
    'hud.next': 'ДАЛЕЕ',
    'hud.skip': 'Пропустить ›',

    // Banners (canvas)
    'ban.wave': 'ВОЛНА {n}/{total}',
    'ban.bossComing': 'Идёт босс!',
    'ban.lastWave': 'Последняя волна!',
    'ban.cleared': 'РАЙОН ЗАЧИЩЕН',
    'ban.waveDone': 'Волна отбита',
    'ban.breather': 'передышка',
    'ban.secondChance': 'ВТОРОЙ ШАНС',
    'ban.airstrike': 'АВИАУДАР',
    'ban.rage': 'ЯРОСТЬ!',
    'ban.phase': 'ФАЗА {n}/{total}',
    'ban.bossDown': 'БОСС ПОВЕРЖЕН!',
    'ban.tutorialDone': 'ОБУЧЕНИЕ ПРОЙДЕНО',
    'ban.missed': 'Не успел! Ещё раз',
    'ban.praise1': 'Отлично!',
    'ban.praise2': 'Так держать!',
    'ban.praise3': 'Хорошо!',
    'ban.praise4': 'Молодец!',
    'ban.scream': 'А-А-А!',
    'streak.5': 'Неплохо!',
    'streak.10': 'Мясорубка!',
    'streak.20': 'Неудержимый!',
    'streak.35': 'Зачистка!',
    'streak.50': 'Легенда района!',
    'streak.100': 'Последний рассвет!',

    // Star goals
    'goal.win': 'Победить',
    'goal.hp': 'Здоровье не ниже {v}%',
    'goal.time': 'Пройти за {time}',
    'goal.streak': 'Серия ×{v}',
    'goal.hits': 'Не больше {v} ударов',

    // Tutorial steps
    'tut.aimAuto': 'Подойди ближе — в режиме «Авто» герой сам целится в ближайшего зомби и стреляет.',
    'tut.aimTouch': 'Правый джойстик — прицел и огонь: тяни его в сторону зомби.',
    'tut.aimMouse': 'Наведи мышь на зомби и зажми левую кнопку — огонь!',
    'tut.skillTouch': 'Нажми круглую кнопку справа — навык «{name}».',
    'tut.skillKeys': 'Нажми E или пробел — навык «{name}».',
    'tut.s1Touch': 'Привет, я Ворон. Веди пальцем по левой половине экрана — это джойстик. Беги к светящейся точке!',
    'tut.s1Keys': 'Привет, я Ворон. Двигайся клавишами WASD или стрелками. Беги к светящейся точке!',
    'tut.s2': '{aim} Убей трёх зомби.',
    'tut.s3': 'Подбери опыт ◆ и монеты ● — просто подойди ближе, они притянутся сами.',
    'tut.s4Auto': 'Красная бочка взрывается от выстрела! Встань так, чтобы бочка была между тобой и зомби.',
    'tut.s4Manual': 'Красная бочка взрывается от выстрела! Подожди, пока зомби подойдут к ней, и стреляй в бочку.',
    'tut.s4Boom': 'Бабах! Добей тех, кто остался.',
    'tut.s5': 'Опыт копится в синей полоске. На новом уровне выбери одно из трёх улучшений — оно действует до конца боя.',
    'tut.s6': '{skill} Он перезаряжается — следи за кругом на кнопке.',
    'tut.s7': 'Красный круг — сюда сейчас ударят. Выбеги из него! Увернулся: {n}/3',
    'tut.s8': 'Последнее задание: зачисти улицу! Здесь ты бессмертен — смело пробуй всё, чему научился.',

    // One-time hints
    'hint.boss': 'Это босс! Красные зоны показывают, куда он ударит, — успей отойти.',
    'hint.rage': 'Босс в ярости: бьёт чаще и сильнее. Держи дистанцию!',
    'hint.perk': 'Улучшения действуют до конца уровня. Выбирай то, что подходит твоему оружию.',
    'hint.lowhp': 'Мало здоровья! Отойди от толпы — аптечки выпадают из зомби.',
    'hint.streak': 'Серия ×10! Убивай без пауз — за длинные серии дают звёзды.',
    'hint.menuUpgrade': 'Монет хватает на улучшение — загляни в Арсенал.',
    'hint.menuHero': 'Золота хватает на нового героя — загляни во вкладку «Герои».',
    'hint.skill': 'Навык «{name}» готов! {how}',
    'hint.skillTouch': 'Нажми круглую кнопку справа.',
    'hint.skillKeys': 'Нажми E или пробел.',
    'hint.manualTouch': 'Ручной прицел: правый джойстик — прицел и огонь. Переключить можно в настройках.',
    'hint.manualMouse': 'Ручной прицел: мышь — прицел, левая кнопка — огонь. Переключить можно в настройках.',
    'hint.weapon': 'Новое оружие: {name}. {desc}',
    'hint.enemy': 'Вот он — {name}! {desc}',
  },

  en: {
    'title': 'The Last Dawn',
    'logo': 'The Last <span>Dawn</span>',
    'loading': 'Loading…',
    'rotate.title': 'Rotate your phone',
    'rotate.sub': 'The game is played in landscape',
    'tab.battle': 'Battle',
    'tab.map': 'Map',
    'tab.arsenal': 'Arsenal',
    'tab.heroes': 'Heroes',
    'tab.quests': 'Quests',
    'chip.coins': 'Coins',
    'chip.gold': 'Gold',
    'chip.stars': 'Stars',
    'btn.sound': 'Sound',
    'btn.settings': 'Settings',
    'debug.shiftDay': '+1 day',

    'lvl.short': 'lv. {n}',
    'level': 'Level {n}',
    'levelDistrict': 'Level {n} · {district}',
    'max': 'Max',
    'take': 'Claim',
    'open': 'Open',
    'ready': 'Ready!',
    'in': 'in {time}',
    'ok': 'OK',
    'cancel': 'Cancel',
    'yes': 'Yes',
    'menu': 'Menu',
    'retry': 'Retry',
    'next': 'Next',
    'resume': 'Resume',
    'later': 'Later',
    'done': 'Done',

    'battle.play': 'PLAY',
    'battle.boss': '☠ Boss: {name}',
    'battle.districtStars': '★ {have} / {total} in district',
    'battle.ahead': 'Coming up',
    'battle.unlocksAt': 'unlocks at lv. {n}',
    'battle.dailyTasks': 'Daily quests',
    'battle.rewardsWaiting': 'rewards waiting!',
    'battle.challengeWaits': 'challenge awaits',
    'battle.adCoins': 'Coins for an ad',
    'battle.adCoinsSub': 'for watching an ad',

    'map.levels': 'Levels {a}–{b} · ★ {have}/{total}',

    'arsenal.level': 'Lv. {n}/{max}',
    'arsenal.damage': 'Damage',
    'arsenal.rate': 'Fire rate',
    'arsenal.range': 'Range',
    'arsenal.inHands': 'Equipped',
    'arsenal.equip': 'Equip',
    'arsenal.unlocksAt': 'Unlocks at level {n}',
    'wtype.bullet': 'Bullets',
    'wtype.bolt': 'Bolts',
    'wtype.flame': 'Fire',
    'wtype.grenade': 'Grenades',
    'wtype.tesla': 'Lightning',
    'wtype.plasma': 'Plasma',
    'wtype.rocket': 'Rockets',

    'heroes.selected': 'Selected',
    'heroes.select': 'Select',
    'heroes.unlock': 'Unlock ◆ {n}',
    'heroes.cdSec': '{n}s',

    'daily.tasks': 'Daily quests',
    'daily.newIn': 'new in {time}',
    'daily.allThree': 'All three quests',
    'daily.challenge': 'Daily challenge',
    'daily.reward': 'Reward:',
    'daily.challengeDone': 'Done ✓ — new one tomorrow',
    'daily.challengeStart': 'Start challenge',
    'daily.chests': 'Chests',
    'daily.freeChest': 'Free',
    'daily.starChest': 'Star',
    'daily.chestNow': 'Now ▶',
    'daily.chestNote': 'Star chest — for every {stars} stars. Free chest — every {hours|# hour|# hours}.',
    'daily.achievements': 'Achievements',

    'login.title': 'Daily reward',
    'login.streak': 'You have played {n|# day|# days} in a row!',
    'login.first': 'Come back every day — rewards grow.',
    'login.reset': 'Miss a day and the count starts over.',
    'login.day': 'Day {n}',
    'login.chest': 'Chest',
    'login.double': '×2 ▶ ad',

    'chest.daily': 'Daily chest',
    'chest.dailyDouble': 'Daily reward ×2',
    'chest.free': 'Free chest',
    'chest.star': 'Star chest',
    'chest.adCoins': 'Coins for an ad',

    'settings.title': 'Settings',
    'settings.aim': 'Aim',
    'settings.aimAuto': 'Auto',
    'settings.aimManual': 'Manual',
    'settings.aimAutoHint': 'The hero aims at the nearest zombie and fires automatically.',
    'settings.aimTouchHint': 'Right joystick — aim and fire.',
    'settings.aimMouseHint': 'Mouse — aim, left button — fire.',
    'settings.sound': 'Sound',
    'settings.on': 'On',
    'settings.off': 'Off',
    'settings.lang': 'Language',
    'settings.tutorial': 'Play tutorial',
    'settings.reset': 'Reset progress',
    'settings.resetTitle': 'Reset all progress?',
    'settings.resetText': 'Coins, stars, weapons and heroes will be lost.',

    'pause.title': 'Paused',
    'pause.tutorial': 'Tutorial · step {n}/{total}',
    'pause.level': 'Level {n} · {district} · wave {w}/{waves}',

    'win.title': 'VICTORY!',
    'win.challenge': 'CHALLENGE COMPLETE!',
    'win.challengeSub': 'Daily challenge',
    'win.stats': '☠ {kills} · ⏱ {time} · streak ×{best}',
    'win.double': '● ×2 coins ▶',
    'lose.title': 'YOU DIED',
    'lose.wave': 'reached wave {w}/{waves}',
    'lose.half': 'half of what you collected',
    'lose.kept': 'all coins kept',
    'lose.revive': '♥ Second chance ▶',
    'lose.keep': '● Keep all {n} ▶',
    'lose.arsenal': 'Arsenal',

    'reveal.weapon': 'NEW WEAPON',
    'reveal.takeWeapon': 'Take into battle',
    'reveal.hero': 'NEW HERO',
    'reveal.joinSquad': 'Welcome aboard!',
    'story.district': 'District {n} of {total}',
    'story.go': 'Go',

    'tut.offerTitle': "Hi, I'm Raven",
    'tut.offerText': "The dead have taken the city. I'll show you how to survive: 8 short steps, a couple of minutes.",
    'tut.offerReward': 'Tutorial reward: ● {coins} and ◆ {gold}.',
    'tut.skip': 'Skip',
    'tut.learn': 'Play tutorial',
    'tut.doneTitle': 'Tutorial complete!',
    'tut.doneText': "You're ready now. Next up — the Outskirts and the first waves. I'll give you tips along the way.",
    'tut.doneAlready': 'You already got this reward.',
    'tut.doneGo': 'To battle!',
    'tut.skipTitle': 'Skip the tutorial?',
    'tut.skipText': 'You can play it later: Settings → “Play tutorial”.',

    'ad.demo': 'Demo ad',
    'ad.rewarded': 'Rewarded ad',
    'ad.interstitial': 'Ad between levels',
    'ad.note': 'A real ad will play here on the game platform',
    'ad.unavailable': 'No ad available right now, try again a bit later',
    'btn.social': 'Community',
    'social.title': 'Community',
    'social.sub': 'Call your friends — holding the line is more fun together',
    'social.invite': 'Invite friends',
    'social.wall': 'Post on your wall',
    'social.share': 'Share the game',
    'social.group': 'Join the community',
    'social.favorites': 'Add to favourites',
    'social.home': 'Add to home screen',
    'social.notify': 'Turn on notifications',
    'social.none': 'Nothing here yet',
    'social.rewarded': 'Thank you! ● +{n}',
    'win.share': 'Share',
    'vk.wallText': "I'm holding the line in The Last Dawn! Join me — we have to survive till morning together.",
    'ad.perks': 'Other perks',
    'ad.revive': 'Second chance',
    'ad.keep': 'Keep coins',
    'ad.double': '×2 coins',
    'ad.dailyDouble': '×2 daily reward',
    'ad.chest': 'Chest without waiting',
    'ad.coins': 'Coins',

    'hud.lvl': 'LV. {n}',
    'hud.tutorial': 'Tutorial',
    'hud.wave': 'WAVE {n}/{total}',
    'hud.nextWave': 'Next wave in {n}',
    'hud.left': 'Zombies left: {n}',
    'hud.streak': 'STREAK ×{n}',
    'hud.aimAuto': 'Aim: AUTO',
    'hud.aimManual': 'Aim: MANUAL',
    'hud.debugTouch': 'debug: tap the weapon to switch',
    'hud.debugKeys': 'debug: 1–9, 0 — weapons · M — aim',
    'hud.rage': 'RAGE',
    'hud.skipTutorial': 'Skip tutorial',
    'hud.ravenStep': 'RAVEN · STEP {n}/{total}',
    'hud.newEnemy': 'NEW ENEMY',
    'hud.enemyStats': 'Health {hp} · Speed {speed} · Damage {dmg}',
    'hud.fight': 'FIGHT',
    'hud.levelUp': 'LEVEL {n}!',
    'hud.pickPerk': 'Choose a perk',
    'hud.reroll': '⟳ Other options  ▶ ad',
    'hud.citySaved': 'The city is saved',
    'hud.next': 'NEXT',
    'hud.skip': 'Skip ›',

    'ban.wave': 'WAVE {n}/{total}',
    'ban.bossComing': 'Boss incoming!',
    'ban.lastWave': 'Final wave!',
    'ban.cleared': 'DISTRICT CLEARED',
    'ban.waveDone': 'Wave repelled',
    'ban.breather': 'catch your breath',
    'ban.secondChance': 'SECOND CHANCE',
    'ban.airstrike': 'AIRSTRIKE',
    'ban.rage': 'RAGE!',
    'ban.phase': 'PHASE {n}/{total}',
    'ban.bossDown': 'BOSS DEFEATED!',
    'ban.tutorialDone': 'TUTORIAL COMPLETE',
    'ban.missed': 'Too slow! Again',
    'ban.praise1': 'Great!',
    'ban.praise2': 'Keep it up!',
    'ban.praise3': 'Nice!',
    'ban.praise4': 'Well done!',
    'ban.scream': 'AAARGH!',
    'streak.5': 'Not bad!',
    'streak.10': 'Meat grinder!',
    'streak.20': 'Unstoppable!',
    'streak.35': 'Clean sweep!',
    'streak.50': 'Street legend!',
    'streak.100': 'The Last Dawn!',

    'goal.win': 'Win',
    'goal.hp': 'Health at least {v}%',
    'goal.time': 'Finish within {time}',
    'goal.streak': 'Streak ×{v}',
    'goal.hits': 'Take at most {v} hits',

    'tut.aimAuto': 'Get closer — in “Auto” mode the hero aims at the nearest zombie and fires automatically.',
    'tut.aimTouch': 'Right joystick — aim and fire: drag it towards a zombie.',
    'tut.aimMouse': 'Point the mouse at a zombie and hold the left button to fire!',
    'tut.skillTouch': 'Tap the round button on the right — skill “{name}”.',
    'tut.skillKeys': 'Press E or Space — skill “{name}”.',
    'tut.s1Touch': "Hi, I'm Raven. Slide your finger on the left half of the screen — that's the joystick. Run to the glowing spot!",
    'tut.s1Keys': "Hi, I'm Raven. Move with WASD or the arrow keys. Run to the glowing spot!",
    'tut.s2': '{aim} Kill three zombies.',
    'tut.s3': 'Pick up XP ◆ and coins ● — just get close and they fly to you.',
    'tut.s4Auto': 'The red barrel explodes when shot! Stand so the barrel is between you and the zombies.',
    'tut.s4Manual': 'The red barrel explodes when shot! Wait for the zombies to reach it, then shoot the barrel.',
    'tut.s4Boom': 'Boom! Finish off the rest.',
    'tut.s5': 'XP fills the blue bar. On a new level, pick one of three perks — it lasts until the end of the fight.',
    'tut.s6': '{skill} It recharges — watch the ring on the button.',
    'tut.s7': "The red circle is where the hit lands. Get out of it! Dodged: {n}/3",
    'tut.s8': "Last task: clear the street! You're immortal here — try everything you've learned.",

    'hint.boss': "It's a boss! Red zones show where it will strike — step away in time.",
    'hint.rage': 'The boss is enraged: it hits more often and harder. Keep your distance!',
    'hint.perk': 'Perks last until the end of the level. Pick the ones that suit your weapon.',
    'hint.lowhp': 'Low health! Back away from the crowd — zombies drop medkits.',
    'hint.streak': 'Streak ×10! Keep killing without pauses — long streaks earn stars.',
    'hint.menuUpgrade': 'You have enough coins for an upgrade — check the Arsenal.',
    'hint.menuHero': 'You have enough gold for a new hero — check the Heroes tab.',
    'hint.skill': 'Skill “{name}” is ready! {how}',
    'hint.skillTouch': 'Tap the round button on the right.',
    'hint.skillKeys': 'Press E or Space.',
    'hint.manualTouch': 'Manual aim: right joystick — aim and fire. You can switch it in the settings.',
    'hint.manualMouse': 'Manual aim: mouse — aim, left button — fire. You can switch it in the settings.',
    'hint.weapon': 'New weapon: {name}. {desc}',
    'hint.enemy': 'Here it comes — {name}! {desc}',
  },
};

const I18N = {
  lang: 'ru',
  missingKeys: new Set(),
  rules: {},

  // Saved choice → platform language (Yandex SDK / vk_language) → browser.
  detect(saved) {
    if (saved && LANGS.includes(saved)) return saved;
    let code = '';
    if (typeof Platform !== 'undefined') code = Platform.langHint();
    if (!code) code = (navigator.languages && navigator.languages[0]) || navigator.language || 'ru';
    code = code.toLowerCase().slice(0, 2);
    // Russian for the CIS languages, English for everyone else.
    return ['ru', 'be', 'kk', 'uk', 'uz', 'ky', 'tg', 'hy', 'az'].includes(code) ? 'ru' : 'en';
  },

  setLang(lang) {
    this.lang = LANGS.includes(lang) ? lang : 'ru';
    document.documentElement.lang = this.lang;
    document.title = t('title');
    const rt = document.querySelector('.rotate-text');
    const rs = document.querySelector('.rotate-sub');
    if (rt) rt.textContent = t('rotate.title');
    if (rs) rs.textContent = t('rotate.sub');
  },

  plural(n, forms) {
    const lang = this.lang;
    const pr = this.rules[lang] || (this.rules[lang] = new Intl.PluralRules(lang));
    const cat = pr.select(Number(n));
    if (lang === 'ru') return forms[{ one: 0, few: 1, many: 2 }[cat] ?? 1] ?? forms[forms.length - 1];
    return cat === 'one' ? forms[0] : forms[1] ?? forms[0];
  },

  format(str, vars = {}) {
    return String(str).replace(/\{(\w+)(?:\|([^}]*))?\}/g, (m, name, forms) => {
      const v = vars[name];
      if (forms === undefined) return v === undefined ? m : v;
      return this.plural(v, forms.split('|')).replace(/#/g, v);
    });
  },

  quote(s) {
    return this.lang === 'ru' ? `«${s}»` : `“${s}”`;
  },

  // Strings present in Russian but missing in English (and vice versa).
  missing() {
    const out = [];
    for (const k of Object.keys(STRINGS.ru)) if (!(k in STRINGS.en)) out.push('en: ' + k);
    for (const k of Object.keys(STRINGS.en)) if (!(k in STRINGS.ru)) out.push('ru: ' + k);
    return out.concat([...this.missingKeys].map(k => 'unknown key: ' + k));
  },
};

function t(key, vars) {
  const table = STRINGS[I18N.lang] || STRINGS.ru;
  let s = table[key];
  if (s === undefined) {
    s = STRINGS.ru[key];
    I18N.missingKeys.add(key);
    if (s === undefined) return key;
  }
  return vars ? I18N.format(s, vars) : s;
}

// Content value from data.js: { ru, en } → string (or array) in the current language.
function L(v, vars) {
  if (v && typeof v === 'object' && !Array.isArray(v) && ('ru' in v || 'en' in v)) {
    v = v[I18N.lang] !== undefined ? v[I18N.lang] : v.ru;
  }
  return vars && typeof v === 'string' ? I18N.format(v, vars) : v;
}
