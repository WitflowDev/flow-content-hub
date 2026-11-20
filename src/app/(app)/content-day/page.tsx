import type { Metadata } from 'next'
import { ContentDayScreen } from '@/components/screens/ContentDayScreen'

export const metadata: Metadata = {
  title: 'Book a Content Day',
  description: 'Request a Content Day with Flow Productions. Video, photography and posts in one production day.',
}

export default function ContentDayPage() {
  return <ContentDayScreen />
}
