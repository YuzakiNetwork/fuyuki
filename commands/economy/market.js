/**
 * commands/economy/market.js
 * Market overview — trending items and world event status.
 * Usage: !market
 */

import { loadEconomy, getWorldEvent, getWorldState } from '../../lib/game/economy.js';
import { getItem, RARITY_EMOJI }                     from '../../lib/game/item.js';
import { trendArrow }                                from '../../lib/utils/random.js';

let handler = async (m) => {
  const economy = loadEconomy();
  const world   = getWorldEvent();
  const state   = getWorldState();

  // Top gainers (biggest % above base)
  const entries = Object.values(economy)
    .filter(e => getItem(e.itemId))
    .map(e => ({
      ...e,
      pct: ((e.currentPrice - e.basePrice) / e.basePrice) * 100,
    }));

  const gainers = [...entries]
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 5);

  const losers = [...entries]
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 5);

  const formatEntry = (e) => {
    const item  = getItem(e.itemId);
    const emoji = RARITY_EMOJI[item.rarity] || '⬜';
    const trend = trendArrow(e.currentPrice, e.basePrice);
    const sign  = e.pct >= 0 ? '+' : '';
    return `${trend} ${emoji} *${item.name}*: ${e.currentPrice}g (${sign}${e.pct.toFixed(1)}%)`;
  };

  const msLeft  = Math.max(0, state.endsAt - Date.now());
  const minsLeft = Math.floor(msLeft / 60000);

  return m.reply(
    `📈 *Market Overview*\n\n` +
    (world.id !== 'none'
      ? `${world.emoji} *WORLD EVENT: ${world.name}*\n${world.description}\n⏱ Ends in: *${minsLeft}m*\n\n`
      : `🌿 *No active world event*\n\n`) +
    `━━━ 🔝 Top Gainers ━━━\n` +
    gainers.map(formatEntry).join('\n') +
    `\n\n━━━ 📉 Top Losers ━━━\n` +
    losers.map(formatEntry).join('\n') +
    `\n\n💡 *!price <item>* — detailed market data\n` +
    `💡 *!shop* — browse the shop`
  );
};

handler.help    = ['market'];
handler.tags    = ['economy'];
handler.command = /^market$/i;
handler.cooldown = 5;

export default handler;
