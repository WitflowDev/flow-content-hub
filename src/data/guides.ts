import type { Guide } from '@/data/types'

const tutorialRoot = '/assets/tutorials'

function guide(id: string, title: string, desc: string, duration: string, steps: string[]): Guide {
  return {
    id,
    title,
    desc,
    duration,
    gif: `${tutorialRoot}/${id}.gif`,
    poster: `${tutorialRoot}/${id}.png`,
    steps,
  }
}

export const guides: Guide[] = [
  guide('download', 'How to download your content', 'Download one asset or an entire collection in a few clicks.', '00:08', [
    'Open the asset or collection you need.',
    'Choose Download.',
    'Your file starts downloading immediately.',
  ]),
  guide('share', 'Sharing with your team', 'Create a simple collection link for colleagues or partners.', '00:07', [
    'Open the collection.',
    'Choose Share collection.',
    'Copy the link and send it to your team.',
  ]),
  guide('filters', 'Finding the right content', 'Use format and channel filters to narrow the library quickly.', '00:09', [
    'Open My Content.',
    'Choose a content type or channel.',
    'Combine filters with search when needed.',
  ]),
  guide('use-content', 'How to use your content map', 'See the channel and purpose Flow recommends for each asset.', '00:08', [
    'Open a collection.',
    'Check the Mini Content Map.',
    'Use the recommendation as a starting point, then adapt it to your campaign.',
  ]),
  guide('reels', 'Using your Reels', 'Quick guidance for getting more from short-form vertical video.', '00:10', [
    'Lead with the strongest visual.',
    'Keep the core message in the first few seconds.',
    'Adapt copy and CTA to the channel.',
  ]),
  guide('photos', 'Using your photos', 'Choose the right crop and image type for each channel.', '00:09', [
    'Check the recommended channel.',
    'Choose the crop that fits the placement.',
    'Download the final-resolution file.',
  ]),
  guide('collections', 'How collections work', 'Browse campaigns and Content Days as visual collections.', '00:08', [
    'Open Collections.',
    'Choose a campaign or Content Day.',
    'Preview, share or download the full collection.',
  ]),
]
