// Converts Oxford's US "respell" phonetic notation (e.g. "əˈprōCH") into WordUp's
// existing plain-ASCII, lowercase, hyphen-separated house style (e.g. "uh-proach"),
// matching examples already hand-written in the word bank such as "ar-tik-yuh-lit"
// for "articulate" and "kun-sys" for "concise".
//
// This is a best-effort heuristic, not a verified phonetic transcription: Oxford's
// stress marks (ˈ ˌ) approximate syllable breaks but don't mark every boundary, and
// mapping diacritic vowels to plain letters is inherently lossy. Every output should
// get a human read-aloud check before publishing — this exists to produce a
// reviewable first draft, not a final answer.

const SYMBOL_REPLACEMENTS = [
  // Multi-character sequences first, so they aren't shadowed by single-character rules below.
  [/o͞o/g, 'oo'],
  [/o͝o/g, 'oo'],
  ['CH', 'ch'],
  ['SH', 'sh'],
  ['TH', 'th'],
  ['NG', 'ng'],
  ['zh', 'zh'],
  // Parenthetical optional sounds — keep the sound, drop the parens.
  [/\(t\)/g, 't'],
  [/\(ə\)/g, 'uh'],
  [/\(y\)/g, 'y'],
  [/\(ô\)/g, 'aw'],
  // Single-character vowel/consonant respellings (Oxford US respell key).
  ['ā', 'ay'],
  ['ä', 'ah'],
  ['ē', 'ee'],
  ['ī', 'y'],
  ['ō', 'oh'],
  ['ô', 'aw'],
  ['ə', 'uh'],
  ['œ', 'er'],
];

export function respellToWordUpStyle(oxfordRespell) {
  if (!oxfordRespell) return null;

  let result = oxfordRespell;
  for (const [pattern, replacement] of SYMBOL_REPLACEMENTS) {
    result = result.split(pattern).join(replacement);
  }

  // Treat both stress marks as syllable breaks — WordUp's existing style doesn't
  // distinguish primary/secondary stress, only hyphenates between syllables.
  result = result.replace(/[ˈˌ]/g, '-');

  result = result.toLowerCase();
  result = result.replace(/^-+|-+$/g, '');
  result = result.replace(/-{2,}/g, '-');

  return `/${result}/`;
}
