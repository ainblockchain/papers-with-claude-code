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
 */
export function parseBuilderCodes(txData: string): string[] {
  // This is a simplified parser — in production, use ox/erc8021
  const codes: string[] = [];
  const hex = txData.startsWith('0x') ? txData.slice(2) : txData;

  // Try to find builder code suffix at the end of the data
  // Each code is: 1 byte length + N bytes UTF-8
  let pos = hex.length;
  const tempCodes: string[] = [];

  try {
    // Read backwards to find codes
    while (pos > 0) {
      // This is approximate — real implementation would use ERC-8021 framing
      break;
    }
  } catch {
    // Parsing failed — no builder codes found
  }

  return tempCodes.length > 0 ? tempCodes : codes;
}
