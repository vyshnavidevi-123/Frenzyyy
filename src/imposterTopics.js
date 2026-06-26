// imposterTopics.js
// Each topic has a "real" word the majority gets, with fun categories for chaos

export const IMPOSTER_TOPICS = [
  { category: "🍎 Fruits", word: "Apple" },
  { category: "🍎 Fruits", word: "Banana" },
  { category: "🍎 Fruits", word: "Watermelon" },
  { category: "🐾 Animals", word: "Elephant" },
  { category: "🐾 Animals", word: "Penguin" },
  { category: "🐾 Animals", word: "Kangaroo" },
  { category: "🎬 Movies", word: "Titanic" },
  { category: "🎬 Movies", word: "Avengers" },
  { category: "🍕 Food", word: "Pizza" },
  { category: "🍕 Food", word: "Sushi" },
  { category: "🍕 Food", word: "Biryani" },
  { category: "🏖️ Places", word: "Beach" },
  { category: "🏖️ Places", word: "Mountain" },
  { category: "🏖️ Places", word: "Airport" },
  { category: "⚽ Sports", word: "Football" },
  { category: "⚽ Sports", word: "Cricket" },
  { category: "🎮 Games", word: "Minecraft" },
  { category: "🎮 Games", word: "Among Us" },
  { category: "🚗 Vehicles", word: "Bicycle" },
  { category: "🚗 Vehicles", word: "Airplane" },
  { category: "👔 Jobs", word: "Doctor" },
  { category: "👔 Jobs", word: "Teacher" },
  { category: "👔 Jobs", word: "Chef" },
  { category: "🎵 Music", word: "Guitar" },
  { category: "🎵 Music", word: "Drums" },
  { category: "🦸 Superheroes", word: "Batman" },
  { category: "🦸 Superheroes", word: "Spider-Man" },
  { category: "🏫 College", word: "Hostel" },
  { category: "🏫 College", word: "Canteen" },
  { category: "📱 Apps", word: "Instagram" },
  { category: "📱 Apps", word: "WhatsApp" },
  { category: "🌦️ Weather", word: "Thunderstorm" },
  { category: "🌦️ Weather", word: "Snow" },
  { category: "🧸 Childhood", word: "Teddy Bear" },
  { category: "🧸 Childhood", word: "Trampoline" },
];

export function getRandomTopic() {
  return IMPOSTER_TOPICS[Math.floor(Math.random() * IMPOSTER_TOPICS.length)];
}
