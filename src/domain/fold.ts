/** Lower case, accents off: how words are compared in the prompt’s search (starts.ts). */
export const fold = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');
