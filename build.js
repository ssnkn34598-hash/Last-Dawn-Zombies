#!/usr/bin/env node
// Builds the game for one platform:
//   node build.js yandex   → dist/yandex/ + dist/rassvet-yandex.zip
//   node build.js vk       → dist/vk/     + dist/rassvet-vk.zip
// (npm run build:yandex / build:vk). No dependencies — only Node itself.
//
// index.html marks platform scripts with data-platform="yandex" / "vk": the
// build keeps the ones for its target, drops the others (and their files) and
// writes js/config.js with the target platform and the VK ids.

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = __dirname;
const TARGETS = ['yandex', 'vk'];
const COPY_DIRS = ['css', 'js', 'assets'];

function fail(msg) {
  console.error('build: ' + msg);
  process.exit(1);
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
  } catch (e) {
    return null;
  }
}

// ---------- index.html ----------

// Keeps <script data-platform="target"> tags, removes the others. Returns the
// new html and the src paths of removed scripts (not copied to the build).
function filterHtml(html, target) {
  const dropped = [];
  const out = html.replace(/<script\b([^>]*)\bdata-platform="([^"]+)"([^>]*)>([\s\S]*?)<\/script>/g,
    (all, before, platforms, after, body) => {
      const attrs = before + after;
      if (platforms.split(/[\s,]+/).includes(target)) {
        return `<script${attrs.replace(/\s+$/, '')}>${body}</script>`;
      }
      const src = /\bsrc="([^"]+)"/.exec(attrs);
      if (src) dropped.push(src[1]);
      return '\u0000';
    })
    // Drop the lines of removed tags.
    .replace(/^[ \t]*\u0000[ \t]*\r?\n/gm, '')
    .replace(/\u0000/g, '');
  return { html: out, dropped };
}

// ---------- config.js ----------

function vkIds() {
  const hosting = readJson('vk-hosting-config.json') || {};
  const pkg = readJson('package.json') || {};
  const cfg = pkg.config || {};
  const num = v => (/^\d+$/.test(String(v || '')) ? Number(v) : 0);
  return {
    appId: num(process.env.VK_APP_ID) || num(hosting.app_id),
    groupId: num(process.env.VK_GROUP_ID) || num(cfg.vkGroupId),
  };
}

function writeConfig(file, target) {
  let src = fs.readFileSync(file, 'utf8');
  const ids = vkIds();
  const set = (key, value) => {
    const re = new RegExp(`(\\b${key}:\\s*)[^,\\n]+`);
    if (!re.test(src)) fail(`js/config.js: no ${key}`);
    src = src.replace(re, `$1${value}`);
  };
  set('platform', `'${target}'`);
  set('vkAppId', ids.appId);
  set('vkGroupId', ids.groupId);
  fs.writeFileSync(file, src);
  return ids;
}

// ---------- Files ----------

function copyDir(from, to, skip) {
  if (!fs.existsSync(from)) return;
  fs.mkdirSync(to, { recursive: true });
  for (const name of fs.readdirSync(from)) {
    const src = path.join(from, name);
    const rel = path.relative(ROOT, src).split(path.sep).join('/');
    if (skip.has(rel)) continue;
    if (fs.statSync(src).isDirectory()) copyDir(src, path.join(to, name), skip);
    else fs.copyFileSync(src, path.join(to, name));
  }
}

function listFiles(dir, base = dir) {
  const out = [];
  for (const name of fs.readdirSync(dir).sort()) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) out.push(...listFiles(p, base));
    else out.push(path.relative(base, p).split(path.sep).join('/'));
  }
  return out;
}

// Every local src= / href= in the built page must exist.
function checkRefs(outDir, html) {
  const refs = [...html.matchAll(/\b(?:src|href)="([^"]+)"/g)].map(m => m[1])
    .filter(r => !/^(?:https?:|data:|#|\/)/.test(r));
  const missing = refs.filter(r => !fs.existsSync(path.join(outDir, r)));
  if (missing.length) fail('missing files: ' + missing.join(', '));
}

// ---------- Zip (store + deflate, no dependencies) ----------

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function dosTime(d) {
  return {
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
    date: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  };
}

function writeZip(zipPath, dir) {
  const files = listFiles(dir);
  const locals = [];
  const centrals = [];
  let offset = 0;
  const { time, date } = dosTime(new Date());
  for (const rel of files) {
    const data = fs.readFileSync(path.join(dir, rel));
    const deflated = zlib.deflateRawSync(data, { level: 9 });
    const store = deflated.length >= data.length;
    const body = store ? data : deflated;
    const name = Buffer.from(rel, 'utf8');
    const crc = crc32(data);

    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0);
    lh.writeUInt16LE(20, 4);              // version needed
    lh.writeUInt16LE(0x0800, 6);          // UTF-8 names
    lh.writeUInt16LE(store ? 0 : 8, 8);
    lh.writeUInt16LE(time, 10);
    lh.writeUInt16LE(date, 12);
    lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(body.length, 18);
    lh.writeUInt32LE(data.length, 22);
    lh.writeUInt16LE(name.length, 26);
    lh.writeUInt16LE(0, 28);
    locals.push(lh, name, body);

    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0);
    ch.writeUInt16LE(20, 4);              // version made by
    ch.writeUInt16LE(20, 6);
    ch.writeUInt16LE(0x0800, 8);
    ch.writeUInt16LE(store ? 0 : 8, 10);
    ch.writeUInt16LE(time, 12);
    ch.writeUInt16LE(date, 14);
    ch.writeUInt32LE(crc, 16);
    ch.writeUInt32LE(body.length, 20);
    ch.writeUInt32LE(data.length, 24);
    ch.writeUInt16LE(name.length, 28);
    ch.writeUInt32LE(offset, 42);
    centrals.push(ch, name);

    offset += lh.length + name.length + body.length;
  }
  const central = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(central.length, 12);
  end.writeUInt32LE(offset, 16);
  fs.writeFileSync(zipPath, Buffer.concat([...locals, central, end]));
  return files.length;
}

// ---------- Main ----------

function build(target) {
  const dist = path.join(ROOT, 'dist');
  const outDir = path.join(dist, target);
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  const { html, dropped } = filterHtml(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'), target);
  const skip = new Set(dropped);
  // The VK Bridge licence goes only where the bridge goes.
  if (dropped.includes('js/vendor/vk-bridge.min.js')) skip.add('js/vendor/vk-bridge.LICENSE');
  for (const dir of COPY_DIRS) copyDir(path.join(ROOT, dir), path.join(outDir, dir), skip);
  // Remove a vendor folder left empty.
  const vendor = path.join(outDir, 'js', 'vendor');
  if (fs.existsSync(vendor) && !fs.readdirSync(vendor).length) fs.rmdirSync(vendor);
  fs.writeFileSync(path.join(outDir, 'index.html'), html);
  const ids = writeConfig(path.join(outDir, 'js', 'config.js'), target);
  checkRefs(outDir, html);

  const zipPath = path.join(dist, `rassvet-${target}.zip`);
  const count = writeZip(zipPath, outDir);
  const kb = (fs.statSync(zipPath).size / 1024).toFixed(1);
  console.log(`build ${target}: dist/${target}/ (${count} files), dist/rassvet-${target}.zip (${kb} KB)`);
  if (target === 'vk') {
    console.log(`  vkAppId=${ids.appId || '— (set app_id in vk-hosting-config.json)'} vkGroupId=${ids.groupId || '—'}`);
  }
}

const args = process.argv.slice(2);
const targets = args.includes('all') ? TARGETS : args.filter(a => TARGETS.includes(a));
if (!targets.length) fail('usage: node build.js yandex | vk | all');
targets.forEach(build);
