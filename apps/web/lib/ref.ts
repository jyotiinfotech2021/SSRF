// Reference vocabularies, carried over unchanged from the prototype (core.js) so evidence labels and workflow stages keep their meaning.
export const ASSESS: Record<string, string> = { documented: "Documented", corroborated: "Confirmed by several sources", attributed: "Single source", unverified: "Unconfirmed account", disputed: "Sources differ" };
export const ASSESS_HELP: Record<string, string> = { documented: "Supported by identifiable documentary evidence", corroborated: "Supported by independent sources", attributed: "Clearly attributed, not independently confirmed", unverified: "Insufficient evidence so far", disputed: "Credible sources give materially different accounts" };
export const NATURE = ["Primary source", "Oral history", "Family testimony", "Secondary research", "Tertiary source"];
export const NATURE_HELP: Record<string, string> = { "Primary source": "Contemporary document, official record, photograph, letter or order", "Oral history": "Recorded or transcribed first-hand testimony", "Family testimony": "An account passed on by a family member", "Secondary research": "Historical analysis by a researcher or journalist", "Tertiary source": "Encyclopaedia, general reference or compilation" };
export const VSTAT: Record<string, string> = { submitted: "Submitted", checking: "Under verification", evidence: "Evidence requested", verified: "Verified", rejected: "Rejected", recheck: "Needs re-verification", published: "Published" };
export const STAGES: Record<string, string> = { submitted: "Submitted", screening: "Initial screening", research: "Research review", factcheck: "Fact-check", approval: "Editorial approval", evidence: "Evidence requested", published: "Published", rejected: "Not accepted", resolved: "Resolved", withdrawn: "Withdrawn" };
export const CATEGORIES = ["Founding member", "Veteran member", "Family and legacy member", "Research member", "Academic member", "Student member", "Institutional member", "Volunteer member", "Patron or supporter"];
export const KINDS = ["Article", "Memoir", "Anecdote", "Video"];
export const ERAS = ["Early life and Bikaner", "Goa 1961", "Nathu La 1967", "Mizo Hills", "1971 war", "Later years", "Legacy today"];
export const BKINDS = ["Biography", "Book", "Article", "Official record", "Memoir", "Thesis", "Newspaper", "Documentary or video", "Lecture or talk", "Other"];
export const PKINDS = ["Statue", "Bust", "Named after him", "Memorial", "Observance", "Honour", "Museum or display", "Proposal", "Other"];
export const ETYPES = ["Commemorative", "Research", "Public engagement"];
export const ACATS = ["Photograph", "Document", "Letter", "Map", "Audio-video", "Newspaper", "Oral history"];
export const ACOLL = ["Sagat Singh Personal Archive", "Bikaner Ganga Risala Collection", "Goa Liberation Collection", "Nathu La and Cho La Collection", "1971 War Collection", "Oral History Collection", "Family Photographs Collection", "Military Documents Collection"];
export const RIGHTS = ["I own the rights", "The rights holder has given permission", "Public domain", "Rights unknown"];
export const QTOPICS: Record<string, string> = { early: "Early life", goa: "Goa 1961", nathula: "Nathu La", "1971": "Mizo Hills and 1971", legacy: "Legacy" };
export const QLEVELS: Record<string, string> = { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" };

export const GROUPS: [string, string, [string, string, string][]][] = [
  ["history", "Explore history", [["/biography", "life", "Biography"], ["/campaigns", "campaigns", "Campaigns"], ["/people", "people", "People and units"]]],
  ["research", "Research and archives", [["/archive", "archive", "Digital archive"], ["/library", "library", "Library"], ["/videos", "videos", "Videos"], ["/sources", "sources", "Sources"]]],
  ["community", "Community", [["/stories", "stories", "Stories"], ["/members", "members", "Members"], ["/chapters", "chapters", "Chapters"]]],
  ["learn", "Learning", [["/learn", "learn", "Learning Centre"]]],
  ["events", "Events and recognition", [["/events", "events", "Events"], ["/recognition", "recognition", "Recognition register"]]],
  ["about", "About SSRF", [["/about", "about", "About"], ["/account", "account", "Join"]]],
];

// Source ranking used to order citations (primary sources first, encyclopaedias last); an entry marked incorrect is hidden from the public.
const NEG = /incorrect|error|do not include/i;
export const isNeg = (loc?: string | null) => NEG.test(loc ?? "");
export function srcRank(id: string, src?: { nature: string; publisher?: string | null; author: string }) {
  if (id === "book") return 0;
  if (/^wiki/i.test(id) || /wikipedia/i.test(src?.publisher ?? src?.author ?? "")) return 5;
  return ({ "Primary source": 1, "Secondary research": 2, "Oral history": 2, "Family testimony": 2, "Tertiary source": 4 } as Record<string, number>)[src?.nature ?? ""] ?? 3;
}
