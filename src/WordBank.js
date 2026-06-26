// wordBank.js — Sketch & Guess word packs

export const WORD_PACKS = {
  general: {
    label: "General",
    emoji: "🌍",
    words: [
      "pizza","guitar","elephant","volcano","submarine","tornado","astronaut",
      "umbrella","lighthouse","skateboard","rainbow","helicopter","cactus",
      "dragon","spaceship","waterfall","penguin","castle","tornado","robot",
      "fireworks","jellyfish","parachute","treasure","compass","magnet",
      "diamond","pyramid","snowflake","thunderstorm","bridge","telescope",
      "microscope","clocktower","hot air balloon","quicksand","avalanche",
    ],
  },
  anime: {
    label: "Anime",
    emoji: "⛩️",
    words: [
      "ninja","samurai","katana","cherry blossom","torii gate","ramen",
      "mecha","shuriken","sensei","dojo","onigiri","futon","kimono",
      "manga","cosplay","kawaii","shrine","yukata","tamagotchi","sushi",
      "bento","origami","kabuki","sumo","geisha","tengu","kitsune",
    ],
  },
  movies: {
    label: "Movies",
    emoji: "🎬",
    words: [
      "director","clapperboard","popcorn","red carpet","trailer","sequel",
      "villain","hero","plot twist","sequel","blockbuster","stuntman",
      "screenplay","premiere","cinema","credits","cameo","soundtrack",
      "flashback","cliffhanger","monologue","explosion","chase scene",
    ],
  },
  tech: {
    label: "Tech",
    emoji: "💻",
    words: [
      "keyboard","debugger","algorithm","firewall","pixel","bandwidth",
      "blockchain","drone","satellite","WiFi","server","database","cloud",
      "encryption","glitch","update","reboot","cursor","terminal","bug",
      "compiler","interface","smartwatch","VR headset","solar panel",
    ],
  },
  college: {
    label: "College Life",
    emoji: "🎓",
    words: [
      "assignment","deadline","canteen","hostel","semester","backlog",
      "internship","attendance","professor","library","cafeteria","viva",
      "project","group study","all nighter","semester break","results",
      "placement","ragging","fresher","senior","bunking","cultural fest",
    ],
  },
  memes: {
    label: "Memes",
    emoji: "😂",
    words: [
      "doge","rickroll","among us","sus","vibe check","stonks","karen",
      "chad","NPC","touch grass","based","ratio","skill issue","cope",
      "slay","no cap","bussin","lowkey","W rizz","understood the assignment",
      "main character","rent free","it's giving","salty","ghosted",
    ],
  },
};

export function getRandomWords(pack = "general", count = 3) {
  const words = [...WORD_PACKS[pack].words];
  const result = [];
  for (let i = 0; i < count && words.length; i++) {
    const idx = Math.floor(Math.random() * words.length);
    result.push(words.splice(idx, 1)[0]);
  }
  return result;
}
