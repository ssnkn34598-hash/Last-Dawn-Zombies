// Balance report: runs levelConfig(n) for all 100 levels and prints zombie
// counts, boss health and star goals, then flags suspicious jumps.
// Usage: node tools/balance.js        (add --all to print every level)
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'data.js'), 'utf8');
const ctx = {};
new Function('ctx', src + '\nObject.assign(ctx, { levelConfig, ZOMBIES, BOSSES, WEAPONS, ECONOMY, DROPS });')(ctx);
const { levelConfig, ZOMBIES, BOSSES, WEAPONS, ECONOMY } = ctx;

const pad = (v, n) => String(v).padStart(n);
const fmtTime = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const showAll = process.argv.includes('--all');

// Rough "zombie health to chew through" per level: sum of hp × level multiplier.
const rows = [];
for (let n = 1; n <= 100; n++) {
  const c = levelConfig(n);
  const zombies = c.waves.reduce((s, w) => s + Object.values(w.zombies).reduce((a, b) => a + b, 0), 0);
  const hpPool = Math.round(c.waves.reduce((s, w) => s + Object.entries(w.zombies)
    .reduce((a, [t, k]) => a + ZOMBIES[t].hp * k, 0), 0) * c.mods.hp);
  const boss = c.boss ? BOSSES[c.boss] : null;
  const bossHp = boss ? c.bossHp * (boss.phases || 1) : 0;
  const goals = c.stars.map(g => g.type === 'time' ? `time ${fmtTime(g.value)}` : `${g.type} ${g.value}`);
  rows.push({ n, district: c.district.id, waves: c.waves.length, zombies, hpPool, boss: boss ? boss.mark : '', bossHp, goals, reward: c.reward, newEnemy: c.newEnemy || '', mods: c.mods });
}

console.log(' lvl  district    waves zombies  hp-pool  boss       boss-hp  reward  stars');
for (const r of rows) {
  if (!showAll && r.n % 5 && !r.boss && !r.newEnemy) continue;
  console.log(`${pad(r.n, 4)}  ${r.district.padEnd(10)} ${pad(r.waves, 5)} ${pad(r.zombies, 7)} ${pad(r.hpPool, 8)}  ${(r.boss || '-').padEnd(9)} ${pad(r.bossHp || '-', 8)} ${pad(r.reward, 7)}  ${r.goals.join(', ')}${r.newEnemy ? '  [new: ' + r.newEnemy + ']' : ''}`);
}

// ---- Checks ----
const warn = [];
for (let i = 1; i < rows.length; i++) {
  const a = rows[i - 1], b = rows[i];
  // Effort should grow smoothly: a jump of >35% between neighbours is a spike.
  const ea = a.hpPool + a.bossHp, eb = b.hpPool + b.bossHp;
  if (!b.boss && !a.boss && eb > ea * 1.35) warn.push(`L${b.n}: health pool jumps ${Math.round((eb / ea - 1) * 100)}% vs L${a.n}`);
}
let prevBoss = null;
for (const r of rows.filter(r => r.boss)) {
  if (prevBoss && r.bossHp < prevBoss.bossHp) warn.push(`L${r.n}: boss weaker than the previous boss (L${prevBoss.n})`);
  // Boss health relative to the level's horde: should be a real fight, not a wall.
  const ratio = r.bossHp / r.hpPool;
  if (ratio > 2.5) warn.push(`L${r.n}: boss has ${ratio.toFixed(1)}× the health of the whole horde — feels like a wall`);
  if (ratio < 0.3) warn.push(`L${r.n}: boss has only ${ratio.toFixed(2)}× the horde's health — too easy`);
  prevBoss = r;
}
for (const r of rows) {
  for (const g of levelConfig(r.n).stars) {
    if (g.type === 'streak' && g.value > r.zombies * 0.4) warn.push(`L${r.n}: streak ×${g.value} needs ${Math.round(g.value / r.zombies * 100)}% of all zombies in one streak`);
    if (g.type === 'time' && g.value / r.zombies < 1.2) warn.push(`L${r.n}: time goal leaves only ${(g.value / r.zombies).toFixed(2)} s per zombie`);
  }
}
// Weapons: effective damage per second against a crowd should rise with the
// unlock level. Piercing, area and chains count as hitting extra zombies.
const area = w => (!w.radius ? 1 : w.type === 'plasma' ? 1.6 : 1 + Math.pow(w.radius / 70, 2));
const crowd = w => (w.pierce ? 1 + w.pierce * 0.5 : 1) * area(w) * (w.chains ? 1 + w.chains * 0.4 : 1) * (w.burn ? 1.5 : 1) * (w.pellets ? 1.3 : 1);
const dps = WEAPONS.map(w => ({ id: w.id, unlock: w.unlock, dps: Math.round(w.damage * (w.pellets || 1) * w.rate * crowd(w)) }));
console.log('\nWeapon crowd DPS at upgrade level 1:', dps.map(w => `${w.id}@${w.unlock}=${w.dps}`).join(' '));
for (let i = 1; i < dps.length; i++) {
  if (dps[i].dps < dps[i - 1].dps * 0.8) warn.push(`weapon ${dps[i].id} (unlocks L${dps[i].unlock}) has lower DPS than ${dps[i - 1].id}`);
}
const total = rows.reduce((s, r) => s + r.reward, 0);
let upg = 0; for (let l = 1; l < ECONOMY.weaponMaxLevel; l++) upg += ECONOMY.weaponCost(l);
console.log(`Coins from level rewards alone (100 levels): ${total}; one weapon to max level costs ${upg}`);

console.log(warn.length ? '\nWARNINGS:\n  ' + warn.join('\n  ') : '\nNo warnings.');
