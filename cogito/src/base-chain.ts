/**
 * Base chain integration for the Cogito container.
 * ERC-8021 builder codes attribute paper authors on Base transactions.
 *
 * Only active when BASE_RPC_URL and BASE_PRIVATE_KEY are set.
 */

import { ethers } from 'ethers';
import { Paper } from './paper-discovery.js';

// ERC-8021 constants
const ERC_MARKER = '80218021802180218021802180218021';
const SCHEMA_ID = '00';
const COGITO_BUILDER_CODE = 'cogito_node';

interface AuthorAttribution {
  type: 'arxiv' | 'github' | 'doi' | 'custom';
  identifier: string;
}

/**
 * Encode builder codes into an ERC-8021 hex suffix.
 */
function encodeBuilderCodes(codes: string[]): string {
  if (codes.length === 0) throw new Error('At least one builder code is required');

  const codesString = codes.join(',');
  const codesBytes = Buffer.from(codesString, 'ascii');

  if (codesBytes.length > 255) {
    throw new Error(`Builder codes total length ${codesBytes.length} exceeds 255 bytes`);
  }

  const codesLengthHex = codesBytes.length.toString(16).padStart(2, '0');
  const codesHex = codesBytes.toString('hex');

  return codesLengthHex + codesHex + SCHEMA_ID + ERC_MARKER;
}

/**
 * Build author attributions from paper metadata.
 */
function buildAuthorCodes(paper: Paper): AuthorAttribution[] {
  const attributions: AuthorAttribution[] = [];

  if (paper.arxivId) {
    attributions.push({ type: 'arxiv', identifier: paper.arxivId });
  }

  if (paper.codeUrl) {
    // Extract owner/repo from GitHub URL
    const match = paper.codeUrl.match(/github\.com\/([^/]+\/[^/]+)/);
    if (match) {
      attributions.push({ type: 'github', identifier: match[1] });
    }
  }

  // First author's last name
  if (paper.authors.length > 0) {
    const lastName = paper.authors[0].split(' ').pop()?.toLowerCase();
    if (lastName) {
      attributions.push({ type: 'custom', identifier: lastName });
    }
  }

  return attributions;
}

export class BaseChain {
  private provider: ethers.JsonRpcProvider;
  private signer: ethers.Wallet;

  constructor(rpcUrl: string, privateKey: string) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.signer = new ethers.Wallet(privateKey, this.provider);
  }

  /**
   * Record a Base chain transaction with ERC-8021 builder codes
   * attributing the original paper authors whose work informed the content.
   */
  async recordAttribution(
    topicPath: string,
    papers: Paper[],
  ): Promise<string | null> {
    try {
      // Build codes: agent + paper authors
      const codes = [COGITO_BUILDER_CODE];
      for (const paper of papers.slice(0, 3)) {
        const authorCodes = buildAuthorCodes(paper);
        for (const ac of authorCodes) {
          codes.push(`${ac.type}_${ac.identifier}`);
        }
      }

      // Encode topic as data payload
      const topicHex = Buffer.from(`cogito:enrich:${topicPath}`).toString('hex');
      const suffix = encodeBuilderCodes(codes);
      const data = `0x${topicHex}${suffix}`;

      // Self-transfer with builder code attribution
      const tx = await this.signer.sendTransaction({
        to: this.signer.address,
        value: 0,
        data,
      });

      const authorCount = codes.length - 1;
      console.log(`[Base] Tx recorded: ${tx.hash} (topic: ${topicPath}, codes: ${COGITO_BUILDER_CODE}+${authorCount} authors)`);
      return tx.hash;
    } catch (err: any) {
      console.error(`[Base] Failed to record attribution: ${err.message}`);
      return null;
    }
  }

  getAddress(): string {
    return this.signer.address;
  }
}
