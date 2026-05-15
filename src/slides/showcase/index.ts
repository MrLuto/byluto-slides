import Slide01Intro from './Slide01Intro';
import Slide02InteractiveChart from './Slide02InteractiveChart';
import Slide03FeatureAdoption from './Slide03FeatureAdoption';
import Slide04Interactive3D from './Slide03Interactive3D';
import Slide05CalendarBooking from './Slide04CalendarBooking';
import Slide06CTA from './Slide06CTA';

/**
 * Showcase deck registry.
 *
 * `id` is the stable identity for a slide and MUST NOT change once shipped —
 * it is the key used for persisting presenter notes (and, later, slide data)
 * in the database. Renaming a slide must NOT change its id.
 *
 * Use a short, kebab-case, prefixed string. Never derive ids from `name`.
 */
export const showcaseSlides = [
  { id: 'showcase-intro',         component: Slide01Intro,            name: 'Introduction',     template: 'title' },
  { id: 'showcase-supply-demand', component: Slide02InteractiveChart, name: 'Supply & Demand',  template: 'chart-focus' },
  { id: 'showcase-adoption',      component: Slide03FeatureAdoption,  name: 'Feature Adoption', template: 'interactive' },
  { id: 'showcase-3d',            component: Slide04Interactive3D,    name: '3D Interactive',   template: 'interactive' },
  { id: 'showcase-calendar',      component: Slide05CalendarBooking,  name: 'Calendar Booking', template: 'interactive' },
  { id: 'showcase-cta',           component: Slide06CTA,              name: 'Ready to Build?',  template: 'cta' },
] as const;
