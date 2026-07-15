import { describe, expect, it } from 'vitest';

import { forgetTarget } from '@/modules/refindery/testing';

describe('forgetTarget', () => {
  it('uses the URL field for absolute URLs', () => {
    expect(forgetTarget(' https://example.com/page ')).toEqual({
      url: 'https://example.com/page',
    });
  });

  it('uses the domain field for bare domains', () => {
    expect(forgetTarget(' example.com ')).toEqual({ domain: 'example.com' });
  });
});
