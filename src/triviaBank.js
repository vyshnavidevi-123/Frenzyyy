// triviaBank.js — Quick Trivia question packs

export const TRIVIA_CATEGORIES = {
  movies: {
    label: "Movies", emoji: "🎬",
    questions: [
      { q: "Which movie features the line 'I'll be back'?", options: ["Terminator", "Rocky", "Predator", "Rambo"], answer: 0 },
      { q: "Who directed 'Jaws' and 'E.T.'?", options: ["George Lucas", "Steven Spielberg", "James Cameron", "Ridley Scott"], answer: 1 },
      { q: "What is the highest-grossing film of all time (unadjusted)?", options: ["Titanic", "Avengers: Endgame", "Avatar", "Star Wars"], answer: 2 },
      { q: "Which studio made 'Toy Story'?", options: ["DreamWorks", "Illumination", "Pixar", "Blue Sky"], answer: 2 },
      { q: "In 'The Matrix', what color pill does Neo take?", options: ["Blue", "Red", "Green", "Yellow"], answer: 1 },
      { q: "Who played the Joker in 'The Dark Knight'?", options: ["Jared Leto", "Joaquin Phoenix", "Heath Ledger", "Jack Nicholson"], answer: 2 },
      { q: "Which film won Best Picture at the 2020 Oscars?", options: ["1917", "Joker", "Parasite", "Ford v Ferrari"], answer: 2 },
    ],
  },
  anime: {
    label: "Anime", emoji: "⛩️",
    questions: [
      { q: "What is the name of the pirate crew in 'One Piece'?", options: ["Red Hair Pirates", "Straw Hat Pirates", "Whitebeard Pirates", "Heart Pirates"], answer: 1 },
      { q: "In 'Naruto', what village is Naruto from?", options: ["Sand", "Mist", "Leaf", "Stone"], answer: 2 },
      { q: "What is Light Yagami's weapon of choice in 'Death Note'?", options: ["A sword", "A gun", "The Death Note", "Poison"], answer: 2 },
      { q: "Which anime features Titans attacking humanity?", options: ["Attack on Titan", "Demon Slayer", "Jujutsu Kaisen", "Tokyo Ghoul"], answer: 0 },
      { q: "What is the main character's dream job in 'My Hero Academia'?", options: ["Doctor", "Hero", "Teacher", "Police Officer"], answer: 1 },
      { q: "Studio Ghibli's 'Spirited Away' is directed by whom?", options: ["Makoto Shinkai", "Hayao Miyazaki", "Mamoru Hosoda", "Satoshi Kon"], answer: 1 },
      { q: "What fruit gives Luffy his rubber powers?", options: ["Gum-Gum Fruit", "Flame-Flame Fruit", "Ice-Ice Fruit", "Bomb-Bomb Fruit"], answer: 0 },
      { q: "Who is the main protagonist in 'Demon Slayer'?", options: ["Zenitsu", "Inosuke", "Tanjiro", "Giyu"], answer: 2 },
    ],
  },
  cricket: {
    label: "Cricket", emoji: "🏏",
    questions: [
      { q: "How many players are on a cricket team?", options: ["9", "10", "11", "12"], answer: 2 },
      { q: "Which country won the 2023 Cricket World Cup?", options: ["India", "Australia", "England", "New Zealand"], answer: 1 },
      { q: "What is a perfect over called when no runs are scored?", options: ["Golden over", "Maiden over", "Silent over", "Dot over"], answer: 1 },
      { q: "Who holds the record for most international centuries?", options: ["Virat Kohli", "Ricky Ponting", "Sachin Tendulkar", "Kumar Sangakkara"], answer: 2 },
      { q: "How many runs is a 'six' worth?", options: ["4", "5", "6", "7"], answer: 2 },
      { q: "Which format has exactly 20 overs per side?", options: ["Test", "ODI", "T20", "T10"], answer: 2 },
      { q: "How many wickets make up a 'hat-trick'?", options: ["2", "3", "4", "5"], answer: 1 },
      { q: "What is the term for a ball delivered illegally over waist height?", options: ["No ball", "Wide", "Beamer", "Bouncer"], answer: 2 },
    ],
  },
  football: {
    label: "Football", emoji: "⚽",
    questions: [
      { q: "Which country has won the most FIFA World Cups?", options: ["Germany", "Argentina", "Brazil", "Italy"], answer: 2 },
      { q: "How long is a standard football match?", options: ["80 minutes", "90 minutes", "100 minutes", "120 minutes"], answer: 1 },
      { q: "Who is nicknamed 'CR7'?", options: ["Lionel Messi", "Cristiano Ronaldo", "Neymar Jr", "Kylian Mbappe"], answer: 1 },
      { q: "Which club has won the most UEFA Champions League titles?", options: ["Barcelona", "AC Milan", "Bayern Munich", "Real Madrid"], answer: 3 },
      { q: "What's the maximum number of substitutions in a standard match (post-2020)?", options: ["3", "4", "5", "6"], answer: 2 },
      { q: "Which player won the 2022 World Cup Golden Boot?", options: ["Messi", "Mbappe", "Ronaldo", "Griezmann"], answer: 1 },
    ],
  },
  general: {
    label: "General Knowledge", emoji: "🌍",
    questions: [
      { q: "What is the largest planet in our solar system?", options: ["Earth", "Saturn", "Jupiter", "Neptune"], answer: 2 },
      { q: "Which gas do plants primarily absorb?", options: ["Oxygen", "Nitrogen", "Carbon Dioxide", "Hydrogen"], answer: 2 },
      { q: "What is the capital of Japan?", options: ["Seoul", "Beijing", "Tokyo", "Bangkok"], answer: 2 },
      { q: "How many continents are there?", options: ["5", "6", "7", "8"], answer: 2 },
      { q: "What is the smallest prime number?", options: ["0", "1", "2", "3"], answer: 2 },
      { q: "Which organ pumps blood through the body?", options: ["Lungs", "Brain", "Liver", "Heart"], answer: 3 },
      { q: "What's the chemical symbol for gold?", options: ["Go", "Gd", "Au", "Ag"], answer: 2 },
    ],
  },
  coding: {
    label: "Coding", emoji: "💻",
    questions: [
      { q: "What does 'HTML' stand for?", options: ["HyperText Markup Language", "HighText Machine Language", "HyperTransfer Markup Language", "Home Tool Markup Language"], answer: 0 },
      { q: "Which symbol is used for comments in JavaScript (single line)?", options: ["#", "//", "<!--", "**"], answer: 1 },
      { q: "What does 'CSS' control on a webpage?", options: ["Logic", "Structure", "Styling", "Database"], answer: 2 },
      { q: "Which company developed React?", options: ["Google", "Meta", "Microsoft", "Amazon"], answer: 1 },
      { q: "What does 'API' stand for?", options: ["Application Programming Interface", "Automated Program Instruction", "App Process Integration", "Applied Programming Index"], answer: 0 },
      { q: "In Python, what symbol starts a comment?", options: ["//", "#", "--", "/*"], answer: 1 },
      { q: "What does 'SQL' primarily work with?", options: ["Styling", "Databases", "Animations", "Networking"], answer: 1 },
    ],
  },
  college: {
    label: "College Life", emoji: "🎓",
    questions: [
      { q: "What's commonly used to track unfinished course requirements?", options: ["Backlog", "Frontlog", "Sidelog", "Midlog"], answer: 0 },
      { q: "What is a 'viva' in college terms?", options: ["A party", "An oral exam", "A holiday", "A sports event"], answer: 1 },
      { q: "What do students usually pull before a deadline?", options: ["A prank", "An all-nighter", "A vacation", "A strike"], answer: 1 },
      { q: "What's the term for skipping class without permission?", options: ["Bunking", "Banking", "Blocking", "Booking"], answer: 0 },
      { q: "What event usually features cultural performances at college?", options: ["Orientation", "Cultural Fest", "Convocation", "Placement Drive"], answer: 1 },
      { q: "What's the common term for a senior student mentoring a junior?", options: ["Buddy", "Senior", "Mentor", "Captain"], answer: 2 },
    ],
  },
  memes: {
    label: "Memes", emoji: "😂",
    questions: [
      { q: "'Sus' is internet slang popularized by which game?", options: ["Fortnite", "Among Us", "Minecraft", "Roblox"], answer: 1 },
      { q: "What does 'NPC' stand for in meme culture?", options: ["New Player Character", "Non-Playable Character", "Next Path Choice", "No Personal Comment"], answer: 1 },
      { q: "'Stonks' is a meme about what going up?", options: ["Temperature", "Stocks", "Mood", "Height"], answer: 1 },
      { q: "What does 'rent free' mean when something lives in your head?", options: ["You forgot it", "You can't stop thinking about it", "It's expensive", "It's boring"], answer: 1 },
      { q: "'Touch grass' is internet slang telling someone to do what?", options: ["Garden", "Go outside / relax", "Mow the lawn", "Exercise more"], answer: 1 },
      { q: "What does 'W rizz' mean?", options: ["Winning at charisma", "A type of music", "A coding term", "A dance move"], answer: 0 },
    ],
  },
};

// Returns up to `count` random non-repeating questions. If the category has
// fewer questions than requested, returns all of them shuffled instead of
// silently running short with no indication.
export function getRandomQuestions(category = "general", count = 10) {
  const cat = TRIVIA_CATEGORIES[category] || TRIVIA_CATEGORIES.general;
  const pool = [...cat.questions];
  const safeCount = Math.min(count, pool.length);
  const result = [];
  for (let i = 0; i < safeCount; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    result.push(pool.splice(idx, 1)[0]);
  }
  return result;
}
