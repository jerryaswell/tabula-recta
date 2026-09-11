/* The alphabet arithmetic every cipher on the table shares: letters in, indices
   0-25 out, and back again. Everything else works in indices. */

export const A = 65;
export const N = 26;

/** Index 0-25 to its letter. */
export const chr = (i) => String.fromCharCode(A + i);

/** Strip a string down to the upper-case letters the table knows about. */
export const AZ = (s) => s.toUpperCase().replace(/[^A-Z]/g, '');

/** A string as a list of alphabet indices. */
export const idx = (s) => [...AZ(s)].map((ch) => ch.charCodeAt(0) - A);

/** The digits in a string, in order — a Gronsfeld key. */
export const digitsOf = (s) => [...s].filter((ch) => /[0-9]/.test(ch)).map(Number);

/** A list of alphabet indices back as a word. */
export const word = (v) => v.map(chr).join('');
