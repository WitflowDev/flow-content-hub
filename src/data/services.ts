export type ServiceCompanyId = 'flow' | 'witflow'

export type ServiceOffer = {
  title: string
  summary: string
  href: string
}

export type ServiceLink = {
  company: ServiceCompanyId
  theme: string
  note: string
}

export type ServiceTheme = {
  id: string
  title: string
  summary: string
  body: string
  directory: string
  services: ServiceOffer[]
  related: ServiceLink[]
}

export type ServiceCompany = {
  id: ServiceCompanyId
  name: string
  kicker: string
  directoryLabel: string
  themes: ServiceTheme[]
}

const FLOW = 'https://www.flowproductions.pt'
const WIT = 'https://www.witflow.co'

export const serviceCompanies: ServiceCompany[] = [
  {
    id: 'flow',
    name: 'Flow Productions',
    kicker: 'See everything Flow Productions can help you with.',
    directoryLabel: 'Open on Flow Productions',
    themes: [
      {
        id: 'martech',
        title: 'MarTech',
        summary: 'Websites, campaigns and sales tools built to be found by people and by answer engines.',
        body: 'MarTech is how Flow Productions turns a go-to-market plan into pages, media and agents that can be discovered, measured and used. The work covers the site itself, the offers on it, and the systems that follow a buyer from the first search to a conversation.',
        directory: `${FLOW}/en/martech`,
        services: [
          {
            title: 'AEO, GEO & SEO-ready websites',
            summary: 'Sites structured so search engines and AI answers can understand and cite the brand.',
            href: `${FLOW}/en/martech/aeo-seo-geo`,
          },
          {
            title: 'Non-gated demand gen',
            summary: 'Useful content and tools that create demand without hiding everything behind a form.',
            href: `${FLOW}/en/martech/non-gated-demand-gen`,
          },
          {
            title: 'Go-to-market strategy',
            summary: 'The offer, audience and path to market, decided before the pages and campaigns are built.',
            href: `${FLOW}/en/martech/go-to-market`,
          },
          {
            title: 'LLM advertisement & paid media',
            summary: 'Paid placement planned for both classic media channels and AI-led discovery.',
            href: `${FLOW}/en/martech/paid-media`,
          },
          {
            title: 'Landing pages & AI offers',
            summary: 'Campaign pages with an offer or tool that helps the visitor act on that visit.',
            href: `${FLOW}/en/martech/landing-pages`,
          },
          {
            title: 'AI agents for marketing & sales',
            summary: 'Agents that answer, qualify and route interest so the team spends time on real conversations.',
            href: `${FLOW}/en/martech/ai-agents`,
          },
        ],
        related: [
          { company: 'flow', theme: 'marketing', note: 'The message and content those pages and campaigns are built from.' },
          { company: 'flow', theme: 'design', note: 'The interface and brand system the MarTech work has to wear.' },
          { company: 'witflow', theme: 'discovery', note: 'WitFlow keeps the same presence findable as AI search changes.' },
        ],
      },
      {
        id: 'marketing',
        title: 'Marketing',
        summary: 'Strategy, writing and distribution for the brand, the social channels and the campaigns.',
        body: 'Marketing at Flow Productions is the thinking and the words: who the brand is for, what it should say, and where that shows up. It feeds the design, the films and the pages, so the company is not producing assets that point in different directions.',
        directory: `${FLOW}/en/marketing`,
        services: [
          { title: 'Content strategy', summary: 'What to publish, for whom, and how the pieces support each other.', href: `${FLOW}/en/servicos/content-strategy` },
          { title: 'Brand strategy', summary: 'Positioning, audience and the rules that keep the brand recognisable.', href: `${FLOW}/en/servicos/brand-strategy` },
          { title: 'Copywriting', summary: 'Lines, pages and scripts written for the offer and the reader.', href: `${FLOW}/en/servicos/copywriting` },
          { title: 'Social media content', summary: 'A content rhythm for the channels the audience actually uses.', href: `${FLOW}/en/servicos/social-media-content` },
          { title: 'Blog content writing', summary: 'Articles that explain the work and give search something solid to cite.', href: `${FLOW}/en/servicos/blog-content-writing` },
          { title: 'Digital advertising', summary: 'Campaigns planned around a message, not a pile of unrelated ads.', href: `${FLOW}/en/servicos/digital-advertising` },
          { title: 'Storytelling', summary: 'The narrative that design, video and campaigns can all repeat.', href: `${FLOW}/en/servicos/storytelling` },
          { title: 'Consulting', summary: 'A direct read on what to stop, what to fix and what to make next.', href: `${FLOW}/en/servicos/consultoria` },
        ],
        related: [
          { company: 'flow', theme: 'design', note: 'Strategy only lands when the visual system can carry it.' },
          { company: 'flow', theme: 'audiovisual', note: 'The same story, told with film and photography.' },
          { company: 'witflow', theme: 'orchestration', note: 'WitFlow runs that message across accounts without adding headcount.' },
        ],
      },
      {
        id: 'design',
        title: 'Design',
        summary: 'Brand, editorial, product and space design, from the mark to the page someone uses.',
        body: 'Design is the visible system of the company: identity, layout, packaging, interfaces and the places people meet the brand. Flow Productions designs these as one family, so a social post, a website and a printed piece do not look like they came from different teams.',
        directory: `${FLOW}/en/design`,
        services: [
          { title: 'Branding', summary: 'Identity, voice cues and the assets a brand needs to be used consistently.', href: `${FLOW}/en/servicos/branding` },
          { title: 'Editorial', summary: 'Publications, reports and layouts with a clear reading order.', href: `${FLOW}/en/servicos/design-editorial` },
          { title: 'Web design', summary: 'Pages designed around the content and the action they need to earn.', href: `${FLOW}/en/servicos/web-design` },
          { title: 'UX / UI design', summary: 'Flows and interfaces that make a product or site understandable.', href: `${FLOW}/en/servicos/ux-ui-design` },
          { title: 'Packaging design', summary: 'Packs that carry the brand into the hand, not only onto the screen.', href: `${FLOW}/en/servicos/packaging-design` },
          { title: 'Social media design', summary: 'Templates and posts that stay on-brand once the team is publishing often.', href: `${FLOW}/en/servicos/social-media-design` },
          { title: 'Illustration', summary: 'Drawn assets for campaigns, explainers and brands that need a visual voice.', href: `${FLOW}/en/servicos/ilustracao` },
          { title: 'Space branding', summary: 'Brand applied to rooms, events and physical environments.', href: `${FLOW}/en/servicos/space-branding` },
        ],
        related: [
          { company: 'flow', theme: 'marketing', note: 'The positioning the design has to express.' },
          { company: 'flow', theme: 'animation', note: 'Motion built on the same visual system, not a separate look.' },
          { company: 'flow', theme: 'martech', note: 'Interfaces and landing pages that the MarTech work ships.' },
        ],
      },
      {
        id: 'animation',
        title: 'Animation',
        summary: 'Motion for products, teaching, ads and the effects a film needs.',
        body: 'Animation is how Flow Productions explains something that a still or a talking head cannot. It covers product films, explainers, campaign motion and effects, using the brand’s design rather than a stock look.',
        directory: `${FLOW}/en/animacao`,
        services: [
          { title: 'Motion graphics', summary: 'Type, diagrams and brand motion for screens and presentations.', href: `${FLOW}/en/servicos/motion-graphics` },
          { title: 'Product animation', summary: 'A product shown in use, in parts, or in a way a camera cannot stage.', href: `${FLOW}/en/servicos/animacao-produto` },
          { title: 'Corporate and educational animation', summary: 'Explainers for teams, training and complex offers.', href: `${FLOW}/en/servicos/animacao-corporativa-educativa` },
          { title: 'Advertising and social media animation', summary: 'Short motion made for ads and social placements.', href: `${FLOW}/en/servicos/animacao-publicitaria-social` },
          { title: 'Special effects', summary: 'Effects that support a shot instead of replacing the story.', href: `${FLOW}/en/servicos/efeitos-especiais` },
        ],
        related: [
          { company: 'flow', theme: 'audiovisual', note: 'Live action and animation planned as one film, not two vendors.' },
          { company: 'flow', theme: 'design', note: 'Motion that uses the identity, illustration and layout already in place.' },
          { company: 'flow', theme: 'marketing', note: 'Scripts and campaign ideas the animation is there to carry.' },
        ],
      },
      {
        id: 'audiovisual',
        title: 'Audiovisual',
        summary: 'Story, video, photography and coverage for launches, brands and events.',
        body: 'Audiovisual is the recorded side of the brand: films, stills and event coverage with a point of view. Flow Productions treats the shoot as part of the same story the marketing and design teams are telling, so the footage can be used again instead of sitting in a folder.',
        directory: `${FLOW}/en/audiovisual`,
        services: [
          { title: 'Storytelling', summary: 'The narrative structure of a film before the shoot is booked.', href: `${FLOW}/en/servicos/storytelling-audiovisual` },
          { title: 'Video', summary: 'Brand, campaign and corporate films, shot and finished to be published.', href: `${FLOW}/en/servicos/video` },
          { title: 'Photography', summary: 'Stills for campaigns, sites and the library this hub already holds.', href: `${FLOW}/en/servicos/fotografia` },
          { title: 'Event coverage', summary: 'Photo and video of a live moment, delivered so it can be reused.', href: `${FLOW}/en/servicos/cobertura-eventos` },
        ],
        related: [
          { company: 'flow', theme: 'animation', note: 'Graphics and effects when the shoot needs more than the room.' },
          { company: 'flow', theme: 'marketing', note: 'The story and channels that decide what is worth filming.' },
          { company: 'flow', theme: 'design', note: 'Thumbnails, titles and layouts the footage has to sit inside.' },
        ],
      },
    ],
  },
  {
    id: 'witflow',
    name: 'WitFlow',
    kicker: 'Need help bringing AI into your business? WitFlow can help.',
    directoryLabel: 'Open on WitFlow',
    themes: [
      {
        id: 'discovery',
        title: 'Discovery',
        summary: 'Be found when buyers search, compare and ask questions, including in AI answers.',
        body: 'Discovery is the WitFlow work that makes a company understandable to search engines and to answer engines. It covers the website and the content system behind it, so the brand shows up when a buyer is already looking, not only when someone remembers the name.',
        directory: `${WIT}/pt-PT/solutions`,
        services: [
          {
            title: 'AEO websites',
            summary: 'A site built for AI search, answer engines and ordinary results, with a clear entity and buyer intent.',
            href: `${WIT}/pt-PT/solutions/aeo-websites`,
          },
          {
            title: 'AI-native CMS',
            summary: 'A content system that keeps useful, intent-led pages moving at the pace demand gen needs.',
            href: `${WIT}/pt-PT/solutions/ai-cms`,
          },
        ],
        related: [
          { company: 'witflow', theme: 'conversion', note: 'Being found only helps if the next page gives the buyer a way forward.' },
          { company: 'flow', theme: 'martech', note: 'Flow Productions designs and builds the sites and offers WitFlow then makes findable.' },
          { company: 'witflow', theme: 'orchestration', note: 'Orchestration decides which accounts and channels that visibility should serve.' },
        ],
      },
      {
        id: 'conversion',
        title: 'Conversion',
        summary: 'Give buyers something useful early, so interest becomes a decision instead of a bounce.',
        body: 'Conversion at WitFlow is the step after someone arrives. Landing pages and interactive tools answer the question in front of the buyer before a meeting is requested, using the brand and the real offer rather than a generic template.',
        directory: `${WIT}/pt-PT/solutions`,
        services: [
          {
            title: 'AI landing pages',
            summary: 'Campaign pages built and tuned by the platform, ready for SEO, AEO and GEO from the first version.',
            href: `${WIT}/pt-PT/solutions/ai-lps`,
          },
          {
            title: 'AI tools',
            summary: 'Calculators, diagnostics and advisors that deliver value before a form or a meeting.',
            href: `${WIT}/pt-PT/solutions/ai-tools`,
          },
        ],
        related: [
          { company: 'witflow', theme: 'discovery', note: 'The pages and tools need a site and content system people can find.' },
          { company: 'flow', theme: 'design', note: 'Flow Productions’ UX and web design is what those pages should feel like.' },
          { company: 'witflow', theme: 'orchestration', note: 'Outreach and social only convert when the destination is this clear.' },
        ],
      },
      {
        id: 'orchestration',
        title: 'Orchestration',
        summary: 'Coordinate outreach, social presence and demand so the work runs without a larger team.',
        body: 'Orchestration is the operating layer. WitFlow’s workers research accounts, draft outreach and keep social presence consistent, with people still deciding what is good enough to send. It is how a small team keeps demand moving between channels instead of restarting it every week.',
        directory: `${WIT}/pt-PT/solutions`,
        services: [
          {
            title: 'Outreach',
            summary: 'Signal-based prospecting that researches each contact and drafts scored, personal email for your review.',
            href: `${WIT}/pt-PT/solutions/outreach`,
          },
          {
            title: 'Witfy.social',
            summary: 'A structured social system that keeps the company present for the right audience.',
            href: `${WIT}/pt-PT/solutions/witfy-social`,
          },
          {
            title: 'DG orchestrator',
            summary: 'AI workers that research accounts, build campaigns and execute, with human pilots on quality.',
            href: `${WIT}/pt-PT/solutions/dg`,
          },
        ],
        related: [
          { company: 'witflow', theme: 'discovery', note: 'Orchestration needs a presence buyers can check once outreach lands.' },
          { company: 'witflow', theme: 'conversion', note: 'The campaign still needs a page or tool worth clicking.' },
          { company: 'flow', theme: 'marketing', note: 'Flow Productions sets the message and content the orchestration should repeat.' },
        ],
      },
    ],
  },
]

export function findServiceTheme(companyId: string, themeId: string): { company: ServiceCompany; theme: ServiceTheme } | null {
  const company = serviceCompanies.find((entry) => entry.id === companyId)
  const theme = company?.themes.find((entry) => entry.id === themeId)
  if (!company || !theme) return null
  return { company, theme }
}
