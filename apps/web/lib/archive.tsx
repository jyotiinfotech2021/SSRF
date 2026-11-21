// Archive reference data and icons, carried over from the prototype (views.js) so the Digital archive keeps its identity.
export const ACOLLMETA: Record<string, [string, string]> = {
  "Sagat Singh Personal Archive": ["SP", "#762633"], "Bikaner Ganga Risala Collection": ["BG", "#8C7438"], "Goa Liberation Collection": ["GL", "#2f6f6a"],
  "Nathu La and Cho La Collection": ["NL", "#3d5a80"], "1971 War Collection": ["71", "#303B30"], "Oral History Collection": ["OH", "#6b3f5e"],
  "Family Photographs Collection": ["FP", "#7b5a3c"], "Military Documents Collection": ["MD", "#4a4a42"],
};
export const collMeta = (c?: string | null): [string, string] => (c && ACOLLMETA[c]) || ["AR", "#5a5a50"];
export const ATYPES: [string, string][] = [["Photograph", "Photographs"], ["Letter", "Letters"], ["Document", "Documents"], ["Map", "Maps"], ["Audio-video", "Recordings"], ["Oral history", "Oral histories"], ["Newspaper", "Newspapers"]];

const ICONP: Record<string, string> = {
  Photograph: '<rect x="3" y="7" width="18" height="13" rx="2"/><circle cx="12" cy="13.5" r="3.6"/><path d="M8 7l1.6-2.5h4.8L16 7"/>',
  Letter: '<rect x="3" y="6" width="18" height="13" rx="1.5"/><path d="M3.5 7l8.5 6.5L20.5 7"/>',
  Document: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 15.5h6M9 9h3"/>',
  Map: '<path d="M3 6l6-2.5 6 2.5 6-2.5v15l-6 2.5-6-2.5-6 2.5z"/><path d="M9 3.5v15M15 6v15"/>',
  "Audio-video": '<rect x="3" y="6" width="13" height="12" rx="1.5"/><path d="M16 10l5-3v10l-5-3"/>',
  "Oral history": '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6"/>',
  Newspaper: '<rect x="3" y="5" width="18" height="15" rx="1"/><path d="M6 9h12M6 12.5h5M6 16h5M13.5 12.5H18v3.5h-4.5z"/>',
};

export function AIcon({ t, big }: { t?: string | null; big?: boolean }) {
  return <svg className={big ? "aicon big" : "aicon"} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" dangerouslySetInnerHTML={{ __html: ICONP[t ?? ""] ?? ICONP.Document }} />;
}
