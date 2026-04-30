export function extractCVEs(text: string): string[] {
    const regex = /CVE-\d{4}-\d{4,7}/gi;
    const matches = text.match(regex);
    return matches
        ? [...new Set(matches.map(c => c.toUpperCase()))]
        : [];
}