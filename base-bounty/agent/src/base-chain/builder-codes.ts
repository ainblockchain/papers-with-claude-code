/**
 * ERC-8021 builder code attribution using `ox/erc8021`.
 *
 * Builder codes serve dual purpose:
 * 1. Identifying the Cogito agent
 * 2. Attributing original paper authors / GitHub contributors whose work
 *    the knowledge derives from
 */

// Builder code prefix — the Cogito agent's own identifier
const COGITO_BUILDER_CODE = 'cogito_node';

export interface AuthorAttribution {
  type: 'arxiv' | 'github' | 'doi' | 'custom';
  identifier: string;
}

/**
 * Build ERC-8021 builder code suffix bytes for a transaction.
 * Encodes one or more builder codes as a hex suffix appended to tx calldata.
 *
 * @param agentCode - The agent's builder code (e.g. "cogito_node")
 * @param authors - Optional author attributions to include
 * @returns Hex string suffix to append to transaction data
 */
export function buildBuilderCodeSuffix(agentCode: string, authors?: AuthorAttribution[]): string {
  const codes = [agentCode];

  if (authors) {
    for (const author of authors) {
      codes.push(`${author.type}_${author.identifier}`);
    }
  }

  // Encode as ERC-8021 suffix: length-prefixed UTF-8 strings
  const encoded = codes.map(code => {
    const bytes = Buffer.from(code, 'utf-8');
    const lenByte = bytes.length.toString(16).padStart(2, '0');
    return lenByte + bytes.toString('hex');
  }).join('');

  return encoded;
}

/**
 * Tag a transaction with ERC-8021 builder codes.
 * Appends builder code suffix to transaction data.
 */
export function tagTransaction(
  txData: string,
  authors?: AuthorAttribution[]
): string {
  const suffix = buildBuilderCodeSuffix(COGITO_BUILDER_CODE, authors);
  // Ensure txData has 0x prefix
  const data = txData.startsWith('0x') ? txData : `0x${txData}`;
  return `${data}${suffix}`;
}

/**
 * Build author codes from paper metadata.
 * Extracts identifiable attributions from paper information.
 */
export function buildAuthorCodes(paper: {
  arxivId?: string;
  doi?: string;
  authors?: string[];
  githubRepo?: string;
}): AuthorAttribution[] {
  const attributions: AuthorAttribution[] = [];

  if (paper.arxivId) {
    attributions.push({ type: 'arxiv', identifier: paper.arxivId });
  }

  if (paper.doi) {
    attributions.push({ type: 'doi', identifier: paper.doi });
  }

  if (paper.githubRepo) {
    attributions.push({ type: 'github', identifier: paper.githubRepo });
  }

  if (paper.authors) {
    // Use first author's last name + year pattern for compact attribution
    for (const author of paper.authors.slice(0, 3)) {
      const lastName = author.split(' ').pop()?.toLowerCase() || author.toLowerCase();
      attributions.push({ type: 'custom', identifier: lastName });
    }
  }

  return attributions;
}

/**
 * Parse builder codes from a transaction's data suffix.
 * Reads length-prefixed UTF-8 strings from the end of calldata,
 * matching the format produced by buildBuilderCodeSuffix().
 */
export function parseBuilderCodes(txData: string): string[] {
  const hex = txData.startsWith('0x') ? txData.slice(2) : txData;
  if (hex.length < 4) return [];

  // Read forward through the suffix: each code is 1 byte (2 hex) length + N bytes content
  // We need to find where the builder codes start. Try reading from the end
  // by scanning backwards for valid length-prefixed sequences.
  const codes: string[] = [];

  // Strategy: try parsing from every possible start position near the end.
  // Builder codes are short (<128 bytes each), so scan the last 512 hex chars.
  const searchRegion = hex.slice(Math.max(0, hex.length - 512));
  let offset = 0;

  // Try to find a valid chain of length-prefixed codes
  for (let startPos = 0; startPos < searchRegion.length; startPos += 2) {
    const candidate = tryParseCodesAt(searchRegion, startPos);
    if (candidate.length > 0 && candidate.some(c => c === COGITO_BUILDER_CODE)) {
      return candidate;
    }
  }

  // Fallback: try reading from position 0 of search region
  return tryParseCodesAt(searchRegion, 0);
}

function tryParseCodesAt(hex: string, startPos: number): string[] {
  const codes: string[] = [];
  let pos = startPos;

  while (pos < hex.length) {
    // Read 1-byte length (2 hex chars)
    if (pos + 2 > hex.length) break;
    const len = parseInt(hex.slice(pos, pos + 2), 16);
    if (len === 0 || len > 128) break; // Invalid length
    pos += 2;

    // Read N bytes of UTF-8 content (2*N hex chars)
    const contentHexLen = len * 2;
    if (pos + contentHexLen > hex.length) break;
    const contentHex = hex.slice(pos, pos + contentHexLen);
    pos += contentHexLen;

    try {
      const content = Buffer.from(contentHex, 'hex').toString('utf-8');
      // Validate it looks like a builder code (printable ASCII, no control chars)
      if (/^[\x20-\x7e]+$/.test(content)) {
        codes.push(content);
      } else {
        break;
      }
    } catch {
      break;
    }
  }

  // Only return if we consumed exactly to the end (no leftover bytes)
  if (pos === hex.length && codes.length > 0) {
    return codes;
  }
  return codes;
}
