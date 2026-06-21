import { IOSBuild } from "./types";

/**
 * Parses raw JSON version entry into structured information for UI display.
 * Maps title and description to mimic the screenshot styling:
 *   - App title (e.g. "Pol Pay" or "Develop on UAT")
 *   - Clean version number (e.g. "4.6.8" or "4.6.4")
 *   - Build identifier label (e.g. "Build 5" or "develop")
 */
export function parseBuildInfo(build: IOSBuild) {
  // 1. Parse Version
  // Look for version numbers in format digital dotted like 4.6.4
  const versionRegex = /(\d+\.\d+\.\d+)/;
  const versionMatch = build.desc.match(versionRegex) || build.title.match(versionRegex);
  const version = versionMatch ? versionMatch[1] : "4.6.4";

  // 2. Parse Build details (e.g., "b1-develop", "b2-develop", etc.)
  // Look for pattern _bX-develop inside description, or use custom parts
  const buildRegex = /_([^._]+-develop)\.ipa/i;
  const buildMatch = build.desc.match(buildRegex);
  let buildNum = "develop";
  if (buildMatch && buildMatch[1]) {
    buildNum = buildMatch[1];
  } else {
    // Fallbacks
    const simpleBNumMatch = build.desc.match(/b\d+/i) || build.title.match(/B\d+/i);
    if (simpleBNumMatch) {
      buildNum = simpleBNumMatch[0].toLowerCase();
    }
  }

  // 3. Extract Clean Title
  // The screenshot shows high-fidelity subprojects like "Pol Pay" and "Develop on UAT"
  // Let's create beautiful display titles from the build titles (e.g. "4.6.4 Regression" -> "Regression Build")
  let displayTitle = build.title;
  
  // Clean version, build patterns from the title to make it super clean
  displayTitle = displayTitle
    .replace(/\b\d+\.\d+\.\d+\b/gi, "") // remove numeric versions
    .replace(/\bB\d+\b/gi, "")          // remove B1, B2
    .replace(/\bRegression\b/gi, "Regression Build") // expand
    .replace(/\s+/g, " ")               // normalize spaces
    .trim();

  // Highlight if it looks empty or just placeholder
  if (!displayTitle || displayTitle.length < 3) {
    displayTitle = "HamrahBaam iOS Beta";
  }

  // Standardize titles: e.g. "Regression Build" or Capitalized title
  displayTitle = displayTitle.split(" ").map(word => {
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(" ");

  // Extract raw IPA file name if possible for direct downloading
  let ipaFilename = "";
  const ipaMatch = build.desc.match(/Download\s+([a-zA-Z0-9_\-\.]+)/i);
  if (ipaMatch && ipaMatch[1]) {
    ipaFilename = ipaMatch[1].trim();
  } else {
    // Fallback parser: replace .plist with .ipa
    ipaFilename = build.plistUrl.replace(".plist", ".ipa").replace("manifest", "HamrahBaam");
  }

  return {
    title: displayTitle,
    version: version,
    buildNum: buildNum,
    ipaFilename: ipaFilename
  };
}

/**
 * Beautifully formats dynamic dates.
 * Converts "Tue 21 Oct 2025 16:14" to "October 21, 2025" or clean date
 */
export function formatBuildDate(dateStr: string): string {
  try {
    // Attempt standard parsing first
    // dateStr format: "Tue 21 Oct 2025 16:14"
    const cleaned = dateStr.trim();
    const parts = cleaned.split(/\s+/);
    
    if (parts.length >= 4) {
      const day = parts[1];
      const monthShort = parts[2];
      const year = parts[3];
      
      const monthMap: Record<string, string> = {
        jan: "Jan", feb: "Feb", mar: "Mar", apr: "Apr",
        may: "May", jun: "Jun", jul: "Jul", aug: "Aug",
        sep: "Sep", oct: "Oct", nov: "Nov", dec: "Dec"
      };
      
      const monthFull = monthMap[monthShort.toLowerCase()] || monthShort;
      return `${monthFull} ${day}, ${year}`;
    }
    
    // Fallback
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric"
      });
    }
  } catch (e) {
    console.error("Date formatting failed for:", dateStr, e);
  }
  
  return dateStr; // Return as-is
}
