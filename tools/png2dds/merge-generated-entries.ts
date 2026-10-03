// The gen-leader-fallback / gen-loading-portrait / gen-loading-background scripts each handle one
// leader per run, but write shared files (one XLP per package, one FallbackLeaders.artdef). These
// pure helpers add the new leader's entry to the file's existing content so that running the script
// for a second leader does not drop the first leader's entry.

const XLP_ENTRIES_CLOSING_TAG = "\t</m_Entries>";
const ARTDEF_COLLECTION_CLOSING_TAGS = "\t\t</Element>\n\t</m_RootCollections>";

export const buildXlpEntryElement = (entryName: string): string =>
  `\t\t<Element>\n\t\t\t<m_EntryID text="${entryName}"/>\n\t\t\t<m_ObjectName text="${entryName}"/>\n\t\t</Element>\n`;

// Returns the XLP text with the entry appended, or unchanged when the entry is already listed.
export const addXlpEntry = (existingXlp: string, entryName: string): string => {
  if (existingXlp.includes(`<m_EntryID text="${entryName}"/>`)) return existingXlp;
  if (!existingXlp.includes(XLP_ENTRIES_CLOSING_TAG)) throw new Error("XLP has no </m_Entries> to append to");
  return existingXlp.replace(XLP_ENTRIES_CLOSING_TAG, buildXlpEntryElement(entryName) + XLP_ENTRIES_CLOSING_TAG);
};

// Returns the artdef text with the leader element appended to the "Leaders" collection, or unchanged
// when that leader is already defined. leaderElementXml is one leader's <Element>...</Element> block.
export const addFallbackLeaderToArtDef = (
  existingArtDef: string,
  leaderType: string,
  leaderElementXml: string,
): string => {
  if (existingArtDef.includes(`<m_Name text="${leaderType}"/>`)) return existingArtDef;
  if (!existingArtDef.includes(ARTDEF_COLLECTION_CLOSING_TAGS)) {
    throw new Error("artdef has no Leaders collection closing tags to append to");
  }
  return existingArtDef.replace(ARTDEF_COLLECTION_CLOSING_TAGS, leaderElementXml + ARTDEF_COLLECTION_CLOSING_TAGS);
};
