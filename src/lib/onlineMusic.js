export const ONLINE_MUSIC_PRESETS = [
  {
    id: "sneaky-snitch",
    name: "Sneaky Snitch (Kocak & Santai)",
    url: "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Sneaky%20Snitch.mp3",
  },
  {
    id: "monkeys-spinning",
    name: "Monkeys Spinning Monkeys (Enerjik & Ceria)",
    url: "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Monkeys%20Spinning%20Monkeys.mp3",
  },
  {
    id: "carefree",
    name: "Carefree (Gembira & Cepat)",
    url: "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Carefree.mp3",
  },
  {
    id: "pixelland",
    name: "Pixelland (Retro 8-Bit Game)",
    url: "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Pixelland.mp3",
  },
  {
    id: "cipher",
    name: "Cipher (Elektronik & Menegangkan)",
    url: "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Cipher.mp3",
  },
  {
    id: "the-builder",
    name: "The Builder (Fokus & Berpikir)",
    url: "https://incompetech.com/music/royalty-free/mp3-royaltyfree/The%20Builder.mp3",
  },
];

export function getAudioSource(musicFileName) {
  if (!musicFileName) return "";
  if (musicFileName.startsWith("http://") || musicFileName.startsWith("https://")) {
    return musicFileName;
  }
  return `/music/${musicFileName}`;
}
