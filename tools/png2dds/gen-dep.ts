// Generate a .dep (GameDependencyData) file from a Mod.Art.xml (GameArtSpecification).
// ModBuddy's own "Build" didn't emit this file for our project, but a real shipped mod's
// .dep is a mechanical, tag-renamed transform of its own Art.xml (verified against
// "Hololive 1st Generation.dep" vs its Mod.Art.xml: id->ID, artConsumers->SystemDependencies
// (consumerName->ConsumerName, relativeArtDefPaths->ArtDefDependencyPaths,
// libraryDependencies->LibraryDependencies, loadsLibraries->LoadsLibraries),
// gameLibraries->LibraryDependencies (libraryName->LibraryName,
// relativePackagePaths->PackageDependencies), requiredGameArtIDs->RequiredGameArtIDs.
// Usage: tsx gen-dep.ts <Mod.Art.xml> <out.dep>
import { readFileSync, writeFileSync } from "node:fs";

const [, , artXmlPath, outputPath] = process.argv;
if (!artXmlPath || !outputPath) {
  console.error("Usage: tsx gen-dep.ts <Mod.Art.xml> <out.dep>");
  process.exit(1);
}

let xml = readFileSync(artXmlPath, "utf8");

xml = xml.replace(/<AssetObjects::GameArtSpecification>/, "<AssetObjects..GameDependencyData>");
xml = xml.replace(/<\/AssetObjects::GameArtSpecification>/, "</AssetObjects..GameDependencyData>");

xml = xml.replace(
  /<id>\s*\n(\s*<name text="[^"]*"\/>)\s*\n(\s*<id text="[^"]*"\/>)\s*\n\s*<\/id>/,
  (_fullMatch, nameLine, idLine) => `<ID>\n${nameLine}\n${idLine}\n\t</ID>`,
);

xml = xml.replace(/<artConsumers>/, "<SystemDependencies>");
xml = xml.replace(/<\/artConsumers>/, "</SystemDependencies>");
xml = xml.replace(/<consumerName /g, "<ConsumerName ");
xml = xml.replace(/<relativeArtDefPaths>/g, "<ArtDefDependencyPaths>");
xml = xml.replace(/<relativeArtDefPaths\/>/g, "<ArtDefDependencyPaths/>");
xml = xml.replace(/<\/relativeArtDefPaths>/g, "</ArtDefDependencyPaths>");
xml = xml.replace(/<libraryDependencies>/g, "<LibraryDependencies>");
xml = xml.replace(/<libraryDependencies\/>/g, "<LibraryDependencies/>");
xml = xml.replace(/<\/libraryDependencies>/g, "</LibraryDependencies>");
xml = xml.replace(/<loadsLibraries>/g, "<LoadsLibraries>");
xml = xml.replace(/<\/loadsLibraries>/g, "</LoadsLibraries>");

// Real .dep files also have an <ArtDefDependencies> section (artdef-to-artdef graph,
// computed by the cooker from the .artdef files themselves) between SystemDependencies
// and the gameLibraries-derived LibraryDependencies. Verified against a real shipped
// mod's .dep (Hololive 4th Generation, installed locally) that our own artdefs (leaf
// artdefs with no references to other artdefs, e.g. Leaders.artdef) get an empty
// <ArtDefDependencyPaths/> here regardless of what consumers reference them.
const artDefNames = [...xml.matchAll(/<Element text="([^"]+\.artdef)"\/>/g)].map(
  ([, artDefName]) => artDefName,
);
const uniqueArtDefNames = [...new Set(artDefNames)];
const artDefDependenciesSection =
  uniqueArtDefNames.length === 0
    ? "<ArtDefDependencies/>"
    : `<ArtDefDependencies>\n${uniqueArtDefNames
        .map(
          (artDefName) =>
            `\t\t<Element>\n\t\t\t<ArtDefPath text="${artDefName}"/>\n\t\t\t<ArtDefDependencyPaths/>\n\t\t</Element>`,
        )
        .join("\n")}\n\t</ArtDefDependencies>`;
xml = xml.replace(/<\/SystemDependencies>/, `</SystemDependencies>\n\t${artDefDependenciesSection}`);

xml = xml.replace(/<gameLibraries>/, "<LibraryDependencies>");
xml = xml.replace(/<\/gameLibraries>/, "</LibraryDependencies>");
xml = xml.replace(/<libraryName /g, "<LibraryName ");
xml = xml.replace(/<relativePackagePaths>/g, "<PackageDependencies>");
xml = xml.replace(/<relativePackagePaths\/>/g, "<PackageDependencies/>");
xml = xml.replace(/<\/relativePackagePaths>/g, "</PackageDependencies>");

xml = xml.replace(/<requiredGameArtIDs>/, "<RequiredGameArtIDs>");
xml = xml.replace(/<\/requiredGameArtIDs>/, "</RequiredGameArtIDs>");

// Real .dep files order this right after <ID>, but Art.xml has it last; move it up.
const requiredIdsMatch = xml.match(/\t<RequiredGameArtIDs>[\s\S]*?<\/RequiredGameArtIDs>\r?\n/);
if (requiredIdsMatch) {
  xml = xml.replace(requiredIdsMatch[0], "");
  xml = xml.replace(/(<\/ID>\r?\n)/, `$1${requiredIdsMatch[0]}`);
}

writeFileSync(outputPath, xml);
console.log(outputPath);
