import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://udmdtwdpeahthybwtlql.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkbWR0d2RwZWFodGh5Ynd0bHFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQwNDYzMDEsImV4cCI6MjA1OTYyMjMwMX0.RuQkRV55uV8flYP6xssQGL-YEFQs5hI-50mKdJFJtbY'; // Use anon or service key if safe
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const PLAYER_TAGS = ['#P8V8YRG99', '#OTHER_TAG']; // Add all player tags you want tracked
const SERVER_ENDPOINT = 'https://server-coc.onrender.com/api/player/';

async function trackForPlayer(tag) {
  const encodedTag = encodeURIComponent(tag);
  const res = await fetch(`${SERVER_ENDPOINT}${encodedTag}`);
  const data = await res.json();

  const today = new Date().toISOString().split("T")[0];
  const friendInNeed = data.achievements.find(a => a.name === 'Friend in Need')?.value || 0;
  const sharingIsCaring = data.achievements.find(a => a.name === 'Sharing is Caring')?.value || 0;
  const siegeSharer = data.achievements.find(a => a.name === 'Siege Sharer')?.value || 0;

  const { data: yesterdayData } = await supabase
    .from("daily_donations")
    .select("friend_in_need, sharing_is_caring, siege_sharer, total_xp")
    .eq("player_tag", tag)
    .lt("date", today)
    .order("date", { ascending: false })
    .limit(1);

  const prev = yesterdayData?.[0] || {};
  const xpGainedToday = (sharingIsCaring - (prev.sharing_is_caring || 0)) * 5
    + (siegeSharer - (prev.siege_sharer || 0)) * 30;

  const totalXP = friendInNeed + sharingIsCaring * 5 + siegeSharer * 30;

  const { error } = await supabase
    .from("daily_donations")
    .upsert([{
      player_tag: tag,
      date: today,
      friend_in_need: friendInNeed,
      sharing_is_caring: sharingIsCaring,
      siege_sharer: siegeSharer,
      xp_gained_today: xpGainedToday,
      total_xp: totalXP
    }], { onConflict: ['player_tag', 'date'] });

  if (error) {
    console.error(`Error saving data for ${tag}:`, error);
  } else {
    console.log(`Updated ${tag}: XP today = ${xpGainedToday}`);
  }
}

async function runCron() {
  for (const tag of PLAYER_TAGS) {
    await trackForPlayer(tag);
  }
}

runCron();
