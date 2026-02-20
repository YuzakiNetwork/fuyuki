/**
 * commands/rpg/profile.js
 * Enhanced Player Profile
 */

import { getPlayer }          from '../../lib/game/player.js';
import { JOB_TREE, getTierName } from '../../lib/game/job.js';
import { TITLES, RARITY_COLOR }  from '../../lib/game/title.js';
import { getPet, PET_TYPES }     from '../../lib/game/pet.js';
import { getGuild }              from '../../lib/game/guild.js';
import { ZONES }                 from './zone.js';

function hpBar(cur, max, len = 10) {
  const fill = Math.round(Math.max(0, cur / max) * len);
  return '█'.repeat(fill) + '░'.repeat(len - fill);
}

let handler = async (m, { args }) => {
  // Support !profile @mention
  const mentions = m.raw?.message?.extendedTextMessage?.contextInfo?.mentionedJid;
  const targetId = mentions?.[0] || m.sender;

  const player = getPlayer(targetId);
  if (!player) return m.reply(`❌ Player tidak ditemukan.`);

  const jobData  = JOB_TREE[player.job || player.class];
  const zone     = ZONES[player.currentZone || 'village'] || ZONES.village;
  const pet      = getPet(targetId);
  const petType  = pet?.active ? PET_TYPES[pet.typeId] : null;
  const summon   = player.activeSummon?.uses > 0 ? player.activeSummon : null;
  const guild    = player.guildId ? getGuild(player.guildId) : null;
  const title    = player.activeTitle ? TITLES[player.activeTitle] : null;
  const awakening = player.awakeningTier || 0;
  const reincarnation = player.reincarnation || 0;

  const expBar   = hpBar(player.exp || 0, player.expToNext || 100);
  const hpBarStr = hpBar(player.hp  || 0, player.maxHp    || 100);

  const wins   = player.stats?.wins   || 0;
  const losses = player.stats?.losses || 0;
  const killed = player.stats?.monstersKilled || 0;

  const lines = [
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `👤 *${player.name}*`,
    title ? `${RARITY_COLOR[title.rarity]} ${title.name}` : '',
    reincarnation > 0 ? `♾️ Reinkarnasi ${reincarnation}` : '',
    `━━━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `🏅 *Job:* ${jobData?.emoji || '⚔️'} *${player.job || player.class}* ${getTierName(jobData?.tier)}`,
    `📊 *Level:* ${player.level} | Rank: ${player.rank || 'E'}`,
    awakening > 0 ? `⚡ *Awakening:* Tier ${awakening} "${player.awakeningName || ''}"` : '',
    ``,
    `❤️  HP:  ${hpBarStr} ${player.hp}/${player.maxHp}`,
    `💧 MP:  ${player.mana || 0}/${player.maxMana || 50}`,
    `⭐ EXP: ${expBar} ${player.exp}/${player.expToNext}`,
    ``,
    `⚔️  ATK: ${player.attack}   🛡️ DEF: ${player.defense}`,
    `💨 SPD: ${player.speed}    💰 Gold: ${(player.gold || 0).toLocaleString()}g`,
    ``,
    `📍 *Zona:* ${zone.name}`,
    guild ? `🏛️ *Guild:* ${guild.name} [${guild.tag}] — ${player.guildRole}` : '',
    petType ? `🐾 *Pet:* ${petType.name || pet.name} Lv.${pet.level}` : '',
    summon ? `🎴 *Summon:* ${summon.emoji} ${summon.name} (${summon.uses}× uses)` : '',
    ``,
    `📈 *Battle Stats:*`,
    `⚔️ Menang: ${wins} | 💀 Kalah: ${losses}`,
    `👾 Monster Dibunuh: ${killed}`,
    `🏆 Title: ${(player.earnedTitles || []).length} diraih`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
  ].filter(l => l !== '');

  return m.reply(lines.join('\n'));
};

handler.help    = ['profile', 'profile @user'];
handler.tags    = ['rpg'];
handler.command = /^(profile|profil|status|stat|me)$/i;
handler.cooldown = 5;
export default handler;
