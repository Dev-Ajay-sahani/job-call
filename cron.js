import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const COC_TOKEN = process.env.COC_TOKEN;

const PLAYER_TAGS = ['#P8V8YRG99'];

async function trackPlayer(tag) {
  const encodedTag = encodeURIComponent(tag);
  const today = new Date().toISOString().split("T")[0];

  const res = await fetch(`https://server-coc.onrender.com/api/player/${encodedTag}`);
  const data = await res.json();

  const friendInNeed = data.achievements.find(a => a.name === "Friend in Need")?.value || 0;
  const sharingIsCaring = data.achievements.find(a => a.name === "Sharing is Caring")?.value || 0;
  const siegeSharer = data.achievements.find(a => a.name === "Siege Sharer")?.value || 0;

  const totalXP = friendInNeed + sharingIsCaring * 5 + siegeSharer * 30;

  const { data: previous } = await supabase
    .from("daily_donations")
    .select("total_xp")
    .eq("player_tag", tag)
    .lt("date", today)
    .order("date", { ascending: false })
    .limit(1);

  const prevXP = previous?.[0]?.total_xp || 0;
  const xpGainedToday = totalXP - prevXP;

  await supabase.from("daily_donations").upsert([{
    player_tag: tag,
    date: today,
    friend_in_need: friendInNeed,
    sharing_is_caring: sharingIsCaring,
    siege_sharer: siegeSharer,
    total_xp: totalXP,
    xp_gained_today: xpGainedToday,
    donations: friendInNeed
  }], { onConflict: ['player_tag', 'date'] });

  console.log(`✅ ${tag}: XP today = ${xpGainedToday}`);
}

(async () => {
  for (const tag of PLAYER_TAGS) {
    await trackPlayer(tag);
  }
})();
