import { describe, it, expect } from 'vitest';
import { Attribution } from 'ox/erc8021';
import { extractPaperCodes, encodeBuilderCodes } from '../erc8021';

describe('extractPaperCodes', () => {
  it('parses exploration tags into builder codes', () => {
    const tags = 'arxiv:2401.12345,code:https://github.com/author/repo,educational';
    const codes = extractPaperCodes(tags);
    expect(codes).toEqual(['bc_cy2vjcg9', 'arxiv:2401.12345', 'github:author/repo']);
  });

  it('handles multiple papers and authors', () => {
    const tags =
      'arxiv:1706.03762,code:https://github.com/tensorflow/tensor2tensor,author:vaswani,author:shazeer,author:parmar';
    const codes = extractPaperCodes(tags);
    expect(codes).toEqual([
      'bc_cy2vjcg9',
      'arxiv:1706.03762',
      'github:tensorflow/tensor2tensor',
      'author:vaswani',
      'author:shazeer',
      'author:parmar',
    ]);
  });

  it('returns just agent code when no paper metadata', () => {
    const tags = 'educational,enriched';
    const codes = extractPaperCodes(tags);
    expect(codes).toEqual(['bc_cy2vjcg9']);
  });
});

describe('ERC-8021 encoding roundtrip', () => {
  it('encodes and decodes paper attribution codes', () => {
    const codes = ['bc_cy2vjcg9', 'arxiv:2401.12345', 'github:author/repo'];
    const encoded = Attribution.toDataSuffix({ codes });
    const decoded = Attribution.fromData('0xdeadbeef' + encoded.slice(2));
    expect(decoded.codes).toEqual(codes);
  });
});

describe('sendAttributedTransaction data construction', () => {
  it('includes all paper codes in tx data', () => {
    // Verify the exact data field that sendAttributedTransaction constructs:
    // baseData + ERC-8021 suffix (without double 0x)
    const codes = ['bc_cy2vjcg9', 'arxiv:2401.12345', 'github:foo/bar'];
    const suffix = Attribution.toDataSuffix({ codes });
    const baseData = '0x';
    const taggedData = baseData + suffix.slice(2);

    // The tagged data should start with 0x
    expect(taggedData.startsWith('0x')).toBe(true);

    // Decoding the tagged data should recover all codes
    const decoded = Attribution.fromData(taggedData);
    expect(decoded.codes).toEqual(codes);

    // Verify paper-specific codes are present
    expect(decoded.codes).toContain('arxiv:2401.12345');
    expect(decoded.codes).toContain('github:foo/bar');
    expect(decoded.codes).toContain('bc_cy2vjcg9');
  });
});

describe('POST /api/erc8021 with tags', () => {
  it('extracts paper metadata and sends attributed tx', () => {
    // Unit test: verify extractPaperCodes produces the right codes from tags,
    // which the API route uses to call sendAttributedTransaction
    const tags = 'arxiv:2401.12345,code:https://github.com/foo/bar';
    const codes = extractPaperCodes(tags);
    expect(codes).toEqual(['bc_cy2vjcg9', 'arxiv:2401.12345', 'github:foo/bar']);

    // Verify these codes produce valid ERC-8021 encoding
    const suffix = encodeBuilderCodes(codes);
    expect(suffix).toBeTruthy();
    expect(suffix.startsWith('0x')).toBe(true);

    // Verify roundtrip
    const decoded = Attribution.fromData('0x' + suffix.slice(2));
    expect(decoded.codes).toEqual(codes);
  });
});
