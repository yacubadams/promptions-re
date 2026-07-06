import { Turn } from "../types";

// Same normalization the LLM path uses: fold smart quotes and whitespace so a
// human-pasted quote matches the transcript even with cosmetic differences.
function normalize(s: string): string {
    return s
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201c\u201d]/g, '"')
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
}

// Returns the transcript turn that contains the quote verbatim, or undefined.
// Grounding is enforced in code — a quote that isn't a real substring is rejected.
export function locateQuote(quote: string, turns: Turn[]): Turn | undefined {
    const needle = normalize(quote);
    if (!needle) return undefined;
    return turns.find((t) => normalize(t.text).includes(needle));
}
