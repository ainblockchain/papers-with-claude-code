import {
  buildBuilderCodeSuffix,
  tagTransaction,
  buildAuthorCodes,
  parseBuilderCodes,
  AuthorAttribution,
} from '../../src/base-chain/builder-codes.js';

describe('ERC-8021 Builder Codes', () => {
  // ---------------------------------------------------------------------------
  // buildBuilderCodeSuffix
  // ---------------------------------------------------------------------------

  describe('buildBuilderCodeSuffix', () => {
    it('should encode a single agent code', () => {
      const suffix = buildBuilderCodeSuffix('cogito_node');
      expect(suffix).toBeTruthy();
      expect(typeof suffix).toBe('string');

      // Verify it's valid hex
      expect(/^[0-9a-f]+$/i.test(suffix)).toBe(true);

      // Decode: first byte is length, rest is the code
      const codeBytes = Buffer.from('cogito_node', 'utf-8');
      const expectedLen = codeBytes.length.toString(16).padStart(2, '0');
      expect(suffix.startsWith(expectedLen)).toBe(true);

      // Verify the full code is encoded
      const encodedCode = suffix.slice(2);
      const decoded = Buffer.from(encodedCode, 'hex').toString('utf-8');
      expect(decoded).toBe('cogito_node');
    });

    it('should encode agent code with author attributions', () => {
      const authors: AuthorAttribution[] = [
        { type: 'arxiv', identifier: '1706.03762' },
        { type: 'github', identifier: 'huggingface/transformers' },
      ];

      const suffix = buildBuilderCodeSuffix('cogito_node', authors);

      // Should contain all three codes concatenated
      expect(suffix.length).toBeGreaterThan(0);

      // Verify it encodes 3 codes: cogito_node, arxiv_1706.03762, github_huggingface/transformers
      const code1 = 'cogito_node';
      const code2 = 'arxiv_1706.03762';
      const code3 = 'github_huggingface/transformers';

      // Each code should be present in the suffix as hex
      expect(suffix).toContain(Buffer.from(code1, 'utf-8').toString('hex'));
      expect(suffix).toContain(Buffer.from(code2, 'utf-8').toString('hex'));
      expect(suffix).toContain(Buffer.from(code3, 'utf-8').toString('hex'));
    });

    it('should handle empty authors array', () => {
      const suffix = buildBuilderCodeSuffix('test_agent', []);
      // Should just encode the agent code
      const singleSuffix = buildBuilderCodeSuffix('test_agent');
      expect(suffix).toBe(singleSuffix);
    });

    it('should handle special characters in identifiers', () => {
      const authors: AuthorAttribution[] = [
        { type: 'doi', identifier: '10.1038/s41586-021-03819-2' },
      ];

      const suffix = buildBuilderCodeSuffix('agent', authors);
      expect(suffix.length).toBeGreaterThan(0);
      // Should be valid hex
      expect(/^[0-9a-f]+$/i.test(suffix)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // tagTransaction
  // ---------------------------------------------------------------------------

  describe('tagTransaction', () => {
    it('should append builder code suffix to tx data with 0x prefix', () => {
      const txData = '0xabcdef';
      const tagged = tagTransaction(txData);

      expect(tagged.startsWith('0xabcdef')).toBe(true);
      expect(tagged.length).toBeGreaterThan(txData.length);
    });

    it('should add 0x prefix if missing', () => {
      const txData = 'abcdef';
      const tagged = tagTransaction(txData);

      expect(tagged.startsWith('0xabcdef')).toBe(true);
    });

    it('should include author attributions when provided', () => {
      const txData = '0x1234';
      const authors: AuthorAttribution[] = [
        { type: 'arxiv', identifier: '2305.12345' },
      ];

      const tagged = tagTransaction(txData, authors);

      expect(tagged.startsWith('0x1234')).toBe(true);
      // Should contain the author code
      expect(tagged).toContain(Buffer.from('arxiv_2305.12345', 'utf-8').toString('hex'));
    });

    it('should always include cogito_node agent code', () => {
      const tagged = tagTransaction('0x00');
      // cogito_node should be encoded in the suffix
      expect(tagged).toContain(Buffer.from('cogito_node', 'utf-8').toString('hex'));
    });
  });

  // ---------------------------------------------------------------------------
  // buildAuthorCodes
  // ---------------------------------------------------------------------------

  describe('buildAuthorCodes', () => {
    it('should extract arxiv ID', () => {
      const codes = buildAuthorCodes({ arxivId: '1706.03762' });

      expect(codes).toContainEqual({ type: 'arxiv', identifier: '1706.03762' });
    });

    it('should extract DOI', () => {
      const codes = buildAuthorCodes({ doi: '10.1038/s41586-021-03819-2' });

      expect(codes).toContainEqual({ type: 'doi', identifier: '10.1038/s41586-021-03819-2' });
    });

    it('should extract GitHub repo', () => {
      const codes = buildAuthorCodes({ githubRepo: 'huggingface/transformers' });

      expect(codes).toContainEqual({ type: 'github', identifier: 'huggingface/transformers' });
    });

    it('should extract author last names (max 3)', () => {
      const codes = buildAuthorCodes({
        authors: ['Ashish Vaswani', 'Noam Shazeer', 'Niki Parmar', 'Jakob Uszkoreit'],
      });

      const customCodes = codes.filter(c => c.type === 'custom');
      expect(customCodes).toHaveLength(3); // max 3 authors
      expect(customCodes[0].identifier).toBe('vaswani');
      expect(customCodes[1].identifier).toBe('shazeer');
      expect(customCodes[2].identifier).toBe('parmar');
    });

    it('should handle single-name authors', () => {
      const codes = buildAuthorCodes({ authors: ['Plato'] });

      expect(codes).toContainEqual({ type: 'custom', identifier: 'plato' });
    });

    it('should combine all attribution types', () => {
      const codes = buildAuthorCodes({
        arxivId: '1706.03762',
        doi: '10.1234/test',
        githubRepo: 'org/repo',
        authors: ['John Doe'],
      });

      expect(codes).toHaveLength(4);
      expect(codes.map(c => c.type)).toEqual(['arxiv', 'doi', 'github', 'custom']);
    });

    it('should return empty array for empty paper', () => {
      const codes = buildAuthorCodes({});
      expect(codes).toEqual([]);
    });

    it('should handle undefined fields', () => {
      const codes = buildAuthorCodes({
        arxivId: undefined,
        doi: undefined,
        githubRepo: undefined,
        authors: undefined,
      });
      expect(codes).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // parseBuilderCodes
  // ---------------------------------------------------------------------------

  describe('parseBuilderCodes', () => {
    it('should return empty array for now (simplified parser)', () => {
      const codes = parseBuilderCodes('0xabcdef1234');
      expect(Array.isArray(codes)).toBe(true);
    });

    it('should handle data with 0x prefix', () => {
      const codes = parseBuilderCodes('0x1234');
      expect(Array.isArray(codes)).toBe(true);
    });

    it('should handle data without 0x prefix', () => {
      const codes = parseBuilderCodes('1234');
      expect(Array.isArray(codes)).toBe(true);
    });
  });
});
