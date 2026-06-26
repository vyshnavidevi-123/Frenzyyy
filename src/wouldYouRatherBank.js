// wouldYouRatherBank.js

export const WYR_QUESTIONS = [
  { a: "Live without music 🎵", b: "Live without movies 🎬" },
  { a: "Be able to fly ✈️", b: "Be invisible 👻" },
  { a: "Always be 10 minutes late", b: "Always be 20 minutes early" },
  { a: "Have unlimited money but no friends", b: "Have amazing friends but be broke forever" },
  { a: "Know when you'll die", b: "Know how you'll die" },
  { a: "Give up your phone for a month", b: "Give up junk food for a year" },
  { a: "Be famous but broke", b: "Be rich but unknown" },
  { a: "Talk to animals", b: "Speak every human language" },
  { a: "Relive your favorite day forever", b: "Never repeat a day again" },
  { a: "Have a rewind button on life", b: "Have a pause button on life" },
  { a: "Lose all your memories", b: "Never make new memories again" },
  { a: "Be the funniest person in the room", b: "Be the smartest person in the room" },
  { a: "Travel to the past", b: "Travel to the future" },
  { a: "Have super strength", b: "Have super speed" },
  { a: "Live in a world with no internet", b: "Live in a world with no AC/heating" },
  { a: "Always say what you think", b: "Never speak again" },
  { a: "Be able to read minds", b: "Be able to predict the future" },
  { a: "Have a personal chef", b: "Have a personal driver" },
  { a: "Win the lottery but lose a close friend", b: "Stay broke but keep all your friends" },
  { a: "Explore space", b: "Explore the deep ocean" },
  { a: "Never use social media again", b: "Never watch another movie/show again" },
  { a: "Be stuck in traffic for 2 hours daily", b: "Have a 1-hour commute with no traffic" },
  { a: "Have free WiFi everywhere forever", b: "Have free food everywhere forever" },
  { a: "Be able to teleport", b: "Be able to time travel" },
  { a: "Have a rewind on embarrassing moments", b: "Never feel embarrassed again" },
];

export function getRandomWYR(count = 8) {
  const pool = [...WYR_QUESTIONS];
  const result = [];
  for (let i = 0; i < count && pool.length; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    result.push(pool.splice(idx, 1)[0]);
  }
  return result;
}
