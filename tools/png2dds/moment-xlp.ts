// Pure builders for the UI/HoloX_Moments XLP package that holds every Historic Moment
// illustration (UU/UD/UB alike). The package is shared, so regenerating one illustration must
// keep the entries already registered for the others (parse the existing XLP, then rebuild).
const MOMENT_PACKAGE_NAME = "UI/HoloX_Moments";

const parseXlpEntryIds = (xml: string): readonly string[] =>
  [...xml.matchAll(/<m_EntryID text="([^"]+)"\/>/g)].map((match) => match[1]!);

const buildMomentXlp = (entryIds: readonly string[]): string => {
  const entries = entryIds
    .map(
      (entryId) => `\t\t<Element>
\t\t\t<m_EntryID text="${entryId}"/>
\t\t\t<m_ObjectName text="${entryId}"/>
\t\t</Element>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8" ?>
<AssetObjects..XLP>
\t<m_Version>
\t\t<major>4</major>
\t\t<minor>0</minor>
\t\t<build>434</build>
\t\t<revision>920</revision>
\t</m_Version>
\t<m_ClassName text="UITexture"/>
\t<m_PackageName text="${MOMENT_PACKAGE_NAME}"/>
\t<m_Entries>
${entries}
\t</m_Entries>
\t<m_AllowedPlatforms>
\t\t<Element>WINDOWS</Element>
\t\t<Element>LINUX</Element>
\t\t<Element>MACOS</Element>
\t\t<Element>IOS</Element>
\t</m_AllowedPlatforms>
</AssetObjects..XLP>
`;
};

export { parseXlpEntryIds, buildMomentXlp };
