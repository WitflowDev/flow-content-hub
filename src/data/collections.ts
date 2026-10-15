import type { Collection } from '@/data/types'

export const collections: Collection[] = [
  {
    slug: 'summer',
    title: 'Summer Content Day',
    count: 42,
    date: '24 Sep 2026',
    description: 'A focused library around the summer experience campaign.',
    ids: ['surf', 'portrait', 'cliffs', 'palms', 'sunset', 'cove'],
    cover: ['surf', 'portrait', 'cliffs'],
  },
  {
    slug: 'brand',
    title: 'Brand & Team',
    count: 18,
    date: '02 Sep 2026',
    description: 'Portraits, details and evergreen brand imagery.',
    ids: ['portrait', 'shadow', 'wave', 'palms'],
    cover: ['portrait', 'shadow', 'wave'],
  },
  {
    slug: 'social',
    title: 'Social Ready',
    count: 24,
    date: '19 Aug 2026',
    description: 'Crops and assets prepared for organic social publishing.',
    ids: ['portrait-social', 'surf', 'sunset', 'wave'],
    cover: ['portrait-social', 'sunset', 'wave'],
  },
  {
    slug: 'paid',
    title: 'Paid Social Cutdowns',
    count: 12,
    date: '08 Aug 2026',
    description: 'Short edits and campaign-ready adaptations for paid media.',
    ids: ['surf-cut', 'cove-ad', 'cove'],
    cover: ['surf-cut', 'cove-ad', 'cove'],
  },
  {
    slug: 'web',
    title: 'Website Refresh',
    count: 15,
    date: '22 Jul 2026',
    description: 'Web-first imagery and landscape crops for key website sections.',
    ids: ['coast-wide', 'cliffs', 'cove', 'portrait'],
    cover: ['coast-wide', 'cove', 'portrait'],
  },
]
