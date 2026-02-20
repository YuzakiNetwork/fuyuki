import 'dotenv/config';

// ── Parse multi-value env (comma separated) ───────────────────────────────────
function parseList(envVal, suffix = '') {
  return (envVal || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => suffix && !s.endsWith(suffix) ? `${s}${suffix}` : s);
}

const ownerNumbers = parseList(process.env.BOT_OWNER_NUMBER, '@s.whatsapp.net');
const ownerLids    = parseList(process.env.BOT_OWNER_LID, '@lid');

const legacyOwners = parseList(process.env.BOT_OWNER, '@s.whatsapp.net');
for (const jid of legacyOwners) {
  if (!ownerNumbers.includes(jid)) ownerNumbers.push(jid);
}

const _ownerSet = new Set([...ownerNumbers, ...ownerLids]);

export function isOwner(jid) {
  if (!jid) return false;
  if (_ownerSet.has(jid)) return true;

  // Coba match angka saja (tanpa suffix)
  const num = jid.split('@')[0];
  for (const o of _ownerSet) {
    if (o.split('@')[0] === num) return true;
  }
  return false;
}

export const config = {
  bot: {
    name:        process.env.BOT_NAME    || 'RPGBot',
    prefix:      process.env.BOT_PREFIX  || '!',
    number:      process.env.BOT_NUMBER  || '',
    sessionName: process.env.SESSION_NAME || 'rpg-bot-session',

    // Owner lists — bisa berisi @s.whatsapp.net atau @lid
    ownerNumbers,   // ['628xxx@s.whatsapp.net', ...]
    ownerLids,      // ['169969xxx@lid', ...]

    // Array gabungan untuk backward compat (misal di routeMessage lama)
    get owner() { return [..._ownerSet]; },
  },

  db: {
    path: process.env.DB_PATH || './database',
  },

  cooldowns: {
    battle:  Number(process.env.BATTLE_COOLDOWN)  || 30,
    dungeon: Number(process.env.DUNGEON_COOLDOWN) || 300,
    shop:    Number(process.env.SHOP_COOLDOWN)    || 5,
    quest:   600,
    skill:   10,
  },

  economy: {
    tickInterval:         Number(process.env.ECONOMY_TICK_INTERVAL)     || 5,
    priceVolatilityBase:  Number(process.env.PRICE_VOLATILITY_BASE)     || 0.05,
    meanReversionRate:    Number(process.env.PRICE_MEAN_REVERSION_RATE) || 0.02,
    demandDecayRate:      Number(process.env.DEMAND_DECAY_RATE)         || 0.1,
    shopSellRatio:        0.6,
    priceCap:             10.0,
    priceFloor:           0.1,
  },

  features: {
    worldEvents:       process.env.ENABLE_WORLD_EVENTS        !== 'false',
    economySimulation: process.env.ENABLE_ECONOMY_SIMULATION  !== 'false',
    dungeonSystem:     process.env.ENABLE_DUNGEON_SYSTEM      !== 'false',
  },

  rpg: {
    maxLevel:          100,
    baseExpPerLevel:   100,
    expScalingFactor:  1.15,

    ranks: ['E', 'D', 'C', 'B', 'A', 'S'],
    rankThresholds: { E: 0, D: 10, C: 25, B: 50, A: 75, S: 90 },

    classes: {
      Warrior:  { hp: 150, mana: 60,  attack: 18, defense: 15, speed: 10, description: '⚔️ Tank. HP & DEF tinggi.' },
      Mage:     { hp: 80,  mana: 200, attack: 25, defense: 6,  speed: 12, description: '🔮 Mage. Mana & ATK magic tinggi.' },
      Archer:   { hp: 100, mana: 80,  attack: 22, defense: 8,  speed: 20, description: '🏹 Hunter. Speed & range tinggi.' },
      Assassin: { hp: 90,  mana: 100, attack: 28, defense: 7,  speed: 25, description: '🗡️ Striker. ATK & crit tertinggi.' },
      Summoner: { hp: 85,  mana: 180, attack: 20, defense: 9,  speed: 15, description: '🎴 Summoner. Panggil summon lewat gacha!' },
    },

    critChanceBase: 0.10,
    missChanceBase: 0.05,
    damageVariance: 0.15,

    elementChart: {
      fire:    { water: 0.5, earth: 2.0, fire: 1.0, wind: 1.0 },
      water:   { fire:  2.0, earth: 0.5, water: 1.0, wind: 1.0 },
      earth:   { wind:  2.0, fire:  0.5, earth: 1.0, water: 1.0 },
      wind:    { earth: 0.5, water: 2.0, wind: 1.0,  fire: 1.0 },
      neutral: { fire:  1.0, water: 1.0, earth: 1.0, wind: 1.0 },
    },
  },

  log: {
    level: process.env.LOG_LEVEL || 'info',
  },
  
  donate: {
    enabled:      process.env.TRAKTEER_ENABLED !== 'false',

    // API Key dari dashboard.trakteer.id/manage/api-trakteer
    // Format: trapi-xxxxxxxxxxxxxxxx
    apiKey:       process.env.TRAKTEER_API_KEY || '',

    // Interval polling dalam ms (default 30 detik)
    pollInterval: Number(process.env.TRAKTEER_POLL_INTERVAL) || 30_000,

    // Target WA untuk kirim notif (group ID atau DM)
    // Bisa multiple, pisah koma: 120363xxx@g.us,628xxx@s.whatsapp.net
    notifyTargets: (process.env.DONATE_NOTIFY_TARGETS || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean),
  },
};

export default config;
