import type { SlotPayloads } from './site-types';
import { SECTION_IDS } from './site-types';
/** Approved fallback copies of existing source surfaces; never fallback domain records. Media IDs stay null. */
export const SITE_DEFAULTS: Readonly<SlotPayloads> = {
    'homepage.hero': { enabled: true, eyebrow: 'JAKARTA, INDONESIA', established: 'EST. 2024', headline: 'WE RUN. WE CONNECT. WE MOVE.', description: 'Built in Jakarta. USS Running brings people together through movement, then keeps the story going through culture, friendship and shared experiences.', cta: { label: 'EXPLORE RUNS', href: '/runs' }, desktopMediaId: null, mobileMediaId: null, focus: 50, overlay: 55 },
    'homepage.membership': { enabled: true, kicker: '04 / MEMBERSHIP / FREE', headline: 'ONE COMMUNITY.\nNO PAID TIER.\nONE ID.', description: 'USS membership is free. Create one community ID to RSVP to runs, keep your run pass and build your USS history as you keep showing up.', cta: { label: 'JOIN USS - FREE', href: '/membership' }, imageMediaId: null },
    'homepage.manifesto': { enabled: true, label: '02 / OUR MOVEMENT', paragraphs: ['RUNNING BROUGHT US TOGETHER.', '18 RUNNERS ON DAY ONE. AROUND 500 ON DAY 365.', 'WE RUN, CHEER, EAT, CREATE AND SHOW UP FOR EACH OTHER.'], footnote: 'PEOPLE OVER PACE / JAKARTA SINCE 2024', cta: { label: 'OUR STORY', href: '/about' } },
    'homepage.marquee': { enabled: true, text: 'RUNNING / COMMUNITY / CULTURE /' },
    'homepage.featured': { enabled: true, storyIds: [], galleryIds: [], partnerIds: [], eventIds: [] },
    'homepage.sections': { order: [...SECTION_IDS] },
    'login.visual': { enabled: true, kicker: 'MY USS / COMMUNITY ACCESS', headline: 'YOUR RUNS. YOUR PEOPLE. ONE ID.', description: 'Sign in to keep your RSVPs, run passes and USS history in one place. Membership stays free.', desktopMediaId: null, mobileMediaId: null, focus: 50, overlay: 55 },
    'auth.login': { eyebrow: 'WELCOME BACK', heading: 'LOG IN TO\nMY USS.', description: 'Access your runs, passes and USS participation history with one community ID.' },
    'auth.register': { enabled: true, eyebrow: 'USS MEMBERSHIP / JAKARTA', headline: 'JOIN THE\nCREW.', description: 'Create one USS ID for community runs, RSVPs, run passes and your participation history.', formKicker: 'CREATE YOUR USS ID', formDescription: 'One account for the USS community.', backgroundMediaId: null },
    'footer.global': { tagline: 'Built in Jakarta. Made to move together.', newsletterKicker: 'USS DISPATCH', newsletterTitle: 'STAY IN THE LOOP.', newsletterDescription: 'Runs, community stories, race-week moments and selected USS updates. No noise.', copyright: 'USS Running. All rights reserved.', instagram: 'https://www.instagram.com/ussrunning', strava: 'https://strava.app.link/fC4mwJNBS6b', contactEmail: 'hello@ussrunning.com' }
};
