/**
 * Swiss Bot Name Generator
 * Generates authentic Swiss names for bot players
 * Always appends " (bot)" to indicate it's a computer player
 */

const swissMaleNames = [
  'Hans', 'Peter', 'Fritz', 'Kurt', 'Werner', 'Walter', 'Ernst', 'Karl',
  'Otto', 'Heinrich', 'Rudolf', 'Alfred', 'Emil', 'Hermann', 'Gustav',
  'Bruno', 'Oskar', 'Felix', 'Markus', 'Stefan', 'Thomas', 'Andreas',
  'Urs', 'Beat', 'Reto', 'Marco', 'Daniel', 'Lukas', 'Martin', 'Adrian'
];

const swissFemaleNames = [
  'Heidi', 'Anna', 'Maria', 'Rosa', 'Emma', 'Sophie', 'Klara', 'Greta',
  'Martha', 'Frieda', 'Elsa', 'Lina', 'Bertha', 'Ida', 'Helene',
  'Vreni', 'Trudi', 'Ursula', 'Brigitte', 'Silvia', 'Monika', 'Petra',
  'Sandra', 'Nicole', 'Sabine', 'Andrea', 'Barbara', 'Christina', 'Daniela'
];

const swissLastNames = [
  'Müller', 'Meier', 'Schmid', 'Keller', 'Weber', 'Huber', 'Schneider',
  'Meyer', 'Steiner', 'Fischer', 'Gerber', 'Brunner', 'Baumann', 'Frei',
  'Zimmermann', 'Moser', 'Wyss', 'Roth', 'Kaufmann', 'Lehmann', 'Berger',
  'Koch', 'Hofmann', 'Suter', 'Graf', 'Hofer', 'Bieri', 'Kuster',
  'Jäggi', 'Fuchs', 'Zbinden', 'Burri', 'Lüthi', 'Aebischer', 'Aebi'
];

let usedNames: Set<string> = new Set();

/**
 * Generates a unique Swiss bot name
 * Format: "FirstName LastName (bot)"
 * @param gender - Optional gender preference ('male', 'female', or 'random')
 * @returns A Swiss name with (bot) suffix
 */
export function generateSwissBotName(gender: 'male' | 'female' | 'random' = 'random'): string {
  let attempts = 0;
  const maxAttempts = 100;

  while (attempts < maxAttempts) {
    const selectedGender = gender === 'random' 
      ? (Math.random() < 0.5 ? 'male' : 'female')
      : gender;

    const firstNames = selectedGender === 'male' ? swissMaleNames : swissFemaleNames;
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = swissLastNames[Math.floor(Math.random() * swissLastNames.length)];
    
    const fullName = `${firstName} ${lastName} (bot)`;

    if (!usedNames.has(fullName)) {
      usedNames.add(fullName);
      return fullName;
    }

    attempts++;
  }

  // Fallback if we somehow can't find a unique name
  const timestamp = Date.now().toString().slice(-4);
  const fallbackName = `Swiss Player ${timestamp} (bot)`;
  usedNames.add(fallbackName);
  return fallbackName;
}

/**
 * Generates an array of unique Swiss bot names
 * @param count - Number of bot names to generate
 * @returns Array of Swiss bot names
 */
export function generateMultipleSwissBotNames(count: number): string[] {
  const names: string[] = [];
  for (let i = 0; i < count; i++) {
    names.push(generateSwissBotName());
  }
  return names;
}

/**
 * Checks if a name is a bot
 * @param name - Player name to check
 * @returns True if the name ends with (bot)
 */
export function isBot(name: string): boolean {
  return name.trim().endsWith('(bot)');
}

/**
 * Gets the display name without the bot suffix
 * @param name - Full name including possible (bot) suffix
 * @returns Name without (bot) suffix
 */
export function getDisplayName(name: string): string {
  return name.replace(/\s*\(bot\)\s*$/i, '').trim();
}

/**
 * Resets the used names cache
 * Useful when starting a new session
 */
export function resetBotNames(): void {
  usedNames.clear();
}

// Export for direct use
export default {
  generateSwissBotName,
  generateMultipleSwissBotNames,
  isBot,
  getDisplayName,
  resetBotNames
};
