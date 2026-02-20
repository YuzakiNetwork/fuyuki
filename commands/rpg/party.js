/**
 * commands/rpg/party.js
 * Party System — Bentuk kelompok, party quest bersama
 */

import { getPlayer, savePlayer } from '../../lib/game/player.js';
import db from '../../lib/database/db.js';

const PARTY_COL = 'parties';
const MAX_PARTY = 4;

function getParty(partyId) { return db.getRecord(PARTY_COL, partyId); }
function getPartyByCode(code) {
  return db.getAllRecords(PARTY_COL).find(p => p.code === code && p.active);
}
function getPartyByLeader(leaderId) {
  return db.getAllRecords(PARTY_COL).find(p => p.leaderId === leaderId && p.active);
}
function getPartyByMember(playerId) {
  return db.getAllRecords(PARTY_COL).find(p => p.members?.some(m => m.id === playerId) && p.active);
}
async function saveParty(party) { return db.setRecord(PARTY_COL, party.id, party); }

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

let handler = async (m, { args, sock }) => {
  const player = getPlayer(m.sender);
  if (!player) return m.reply(`❌ Daftar dulu: *!register <nama> <class>*`);

  const sub = args[0]?.toLowerCase() || 'status';
  const myParty = getPartyByMember(m.sender);

  // ── !party status ──────────────────────────────────────────────────────────
  if (sub === 'status' || sub === 'info') {
    if (!myParty) {
      return m.reply(
        `👥 *Kamu tidak di party manapun.*\n\n` +
        `*Perintah:*\n` +
        `!party buat <nama>  — buat party baru\n` +
        `!party gabung <kode> — gabung pakai kode 6 digit\n\n` +
        `Party memungkinkan:\n` +
        `• Party Quest bersama\n` +
        `• Berbagi exp & gold\n` +
        `• Support antar member`
      );
    }
    const leader = getPlayer(myParty.leaderId);
    const memberLines = myParty.members.map((mem, i) => {
      const p = getPlayer(mem.id);
      return `${i === 0 ? '👑' : `${i+1}.`} *${mem.name}* [Lv.${p?.level || '?'}] ${mem.id === m.sender ? '← kamu' : ''}`;
    });
    const isLeader = myParty.leaderId === m.sender;
    return m.reply(
      `👥 *${myParty.name}*\n\n` +
      `👑 Leader: *${leader?.name || '?'}*\n` +
      `Members: *${myParty.members.length}/${MAX_PARTY}*\n\n` +
      memberLines.join('\n') +
      (isLeader ? `\n\n🔑 Kode Party: *${myParty.code}*` : '') +
      `\n\n!party quest — lihat party quest`
    );
  }

  // ── !party buat <nama> ─────────────────────────────────────────────────────
  if (sub === 'buat' || sub === 'create' || sub === 'new') {
    if (myParty) return m.reply(`❌ Kamu sudah di party! Keluar dulu: *!party keluar*`);

    const partyName = args.slice(1).join(' ').trim();
    if (!partyName) return m.reply(`❌ Masukkan nama party!\nUsage: *!party buat <nama party>*`);
    if (partyName.length < 3) return m.reply(`❌ Nama party minimal 3 karakter.`);
    if (partyName.length > 20) return m.reply(`❌ Nama party maksimal 20 karakter.`);

    // Generate kode unik
    let code;
    let attempt = 0;
    do {
      code = generateCode();
      attempt++;
    } while (getPartyByCode(code) && attempt < 10);

    const party = {
      id:        `party_${m.sender}_${Date.now()}`,
      name:      partyName,
      code:      code,
      leaderId:  m.sender,
      members:   [{ id: m.sender, name: player.name, joinedAt: Date.now() }],
      active:    true,
      createdAt: Date.now(),
    };
    await saveParty(party);
    return m.reply(
      `✅ *Party "${partyName}" dibuat!*\n\n` +
      `👑 Kamu adalah leader.\n` +
      `🔑 Kode Party: *${code}*\n\n` +
      `Bagikan kode ini ke temanmu!\n` +
      `Mereka ketik: *!party gabung ${code}*\n\n` +
      `Kapasitas: ${party.members.length}/${MAX_PARTY} member`
    );
  }

  // ── !party gabung <kode> ───────────────────────────────────────────────────
  if (sub === 'gabung' || sub === 'join') {
    if (myParty) return m.reply(`❌ Kamu sudah di party. Keluar dulu: *!party keluar*`);

    const code = args[1]?.trim();
    if (!code) return m.reply(`Usage: *!party gabung <kode 6 digit>*`);
    if (!/^\d{6}$/.test(code)) return m.reply(`❌ Kode harus 6 digit angka!`);

    const party = getPartyByCode(code);
    if (!party) return m.reply(`❌ Kode party tidak ditemukan atau sudah tidak aktif.`);
    if (party.members.length >= MAX_PARTY) return m.reply(`❌ Party sudah penuh! (${MAX_PARTY} max)`);

    party.members.push({ id: m.sender, name: player.name, joinedAt: Date.now() });
    await saveParty(party);

    const leader = getPlayer(party.leaderId);
    try {
      await sock.sendMessage(party.leaderId, {
        text: `👥 *${player.name}* bergabung ke party *${party.name}*!`
      });
    } catch {}

    return m.reply(
      `✅ *Bergabung ke party "${party.name}"!*\n` +
      `👑 Leader: ${leader?.name || '?'}\n` +
      `Members: ${party.members.length}/${MAX_PARTY}\n\n` +
      `Gunakan *!party status* untuk lihat info.`
    );
  }

  // ── !party invite @user (opsional, kirim DM berisi kode) ──────────────────
  if (sub === 'invite' || sub === 'ajak') {
    if (!myParty) return m.reply(`❌ Buat party dulu: *!party buat <nama>*`);
    if (myParty.leaderId !== m.sender) return m.reply(`❌ Hanya leader yang bisa invite.`);
    if (myParty.members.length >= MAX_PARTY) return m.reply(`❌ Party sudah penuh! (${MAX_PARTY} max)`);

    const mentions = m.raw?.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    if (!mentions.length) return m.reply(`Usage: *!party invite @user*`);

    const targetId = mentions[0];
    const target   = getPlayer(targetId);
    if (!target)   return m.reply(`❌ User belum terdaftar di bot.`);
    if (getPartyByMember(targetId)) return m.reply(`❌ User sudah di party lain.`);

    try {
      await sock.sendMessage(targetId, {
        text:
          `👥 *Party Invitation!*\n\n` +
          `*${player.name}* [Lv.${player.level}] mengajakmu bergabung ke party *"${myParty.name}"*!\n\n` +
          `🔑 Kode Party: *${myParty.code}*\n\n` +
          `Ketik: *!party gabung ${myParty.code}*`
      });
    } catch {}

    return m.reply(`✅ Undangan dikirim ke *${target.name}*!\nMereka bisa join dengan kode: *${myParty.code}*`);
  }

  // ── !party kode ────────────────────────────────────────────────────────────
  if (sub === 'kode' || sub === 'code') {
    if (!myParty) return m.reply(`❌ Kamu tidak di party.`);
    if (myParty.leaderId !== m.sender) return m.reply(`❌ Hanya leader yang bisa lihat kode.`);
    return m.reply(`🔑 Kode party *"${myParty.name}"*: *${myParty.code}*\n\nBagikan ke teman: *!party gabung ${myParty.code}*`);
  }

  // ── !party keluar ──────────────────────────────────────────────────────────
  if (sub === 'keluar' || sub === 'leave' || sub === 'quit') {
    if (!myParty) return m.reply(`❌ Kamu tidak di party.`);
    if (myParty.leaderId === m.sender) {
      // Leader bubar partai
      myParty.active = false;
      await saveParty(myParty);
      for (const mem of myParty.members) {
        if (mem.id === m.sender) continue;
        try { await sock.sendMessage(mem.id, { text: `👥 Party *"${myParty.name}"* dibubarkan oleh leader.` }); } catch {}
      }
      return m.reply(`✅ Party *"${myParty.name}"* dibubarkan.`);
    }
    myParty.members = myParty.members.filter(mem => mem.id !== m.sender);
    await saveParty(myParty);

    const leader = getPlayer(myParty.leaderId);
    try {
      await sock.sendMessage(myParty.leaderId, {
        text: `👥 *${player.name}* keluar dari party *"${myParty.name}"*.`
      });
    } catch {}

    return m.reply(`✅ Kamu keluar dari party *"${myParty.name}"*.`);
  }

  // ── !party quest ───────────────────────────────────────────────────────────
  if (sub === 'quest' || sub === 'raid') {
    if (!myParty) return m.reply(`❌ Kamu tidak di party.`);

    const PARTY_QUESTS = [
      { name: '🐺 Pemburuan Kawanan Serigala', desc: 'Kalahkan 10 Forest Wolf bersama.', reward: { gold: 500, exp: 300 }, minLevel: 5 },
      { name: '🏰 Penjelajahan Dungeon Bersama', desc: 'Selesaikan dungeon 5 lantai.', reward: { gold: 1000, exp: 700 }, minLevel: 15 },
      { name: '🐉 Perburuan Naga', desc: 'Kalahkan Ancient Dragon.', reward: { gold: 5000, exp: 3000 }, minLevel: 40 },
      { name: '💀 Melawan Pasukan Iblis', desc: 'Kalahkan 30 monster dalam 1 hari.', reward: { gold: 2000, exp: 1500 }, minLevel: 20 },
    ];

    const avgLevel = Math.floor(myParty.members.reduce((sum, mem) => {
      const p = getPlayer(mem.id);
      return sum + (p?.level || 1);
    }, 0) / myParty.members.length);

    const available = PARTY_QUESTS.filter(q => avgLevel >= q.minLevel);

    return m.reply(
      `⚔️ *Party Quest — ${myParty.name}*\n\n` +
      `Party Level Avg: *${avgLevel}*\n\n` +
      (available.length
        ? available.map((q, i) =>
          `${i + 1}. ${q.name}\n   "${q.desc}"\n   💰 ${q.reward.gold}g | ⭐ ${q.reward.exp} EXP`
        ).join('\n\n')
        : '_Belum ada quest tersedia untuk level ini._') +
      `\n\n💡 Party quest akan ditambahkan lebih lanjut!`
    );
  }

  return m.reply(
    `👥 *Party Commands*\n\n` +
    `!party              — status party\n` +
    `!party buat <nama>  — buat party baru\n` +
    `!party gabung <kode>— gabung via kode 6 digit\n` +
    `!party invite @u    — kirim undangan ke user\n` +
    `!party kode         — lihat kode party (leader)\n` +
    `!party quest        — lihat party quest\n` +
    `!party keluar       — keluar party`
  );
};

handler.help    = ['party', 'party buat <nama>', 'party gabung <kode>'];
handler.tags    = ['rpg'];
handler.command = /^(party|grup|kelompok)$/i;
handler.cooldown = 5;
export default handler;
