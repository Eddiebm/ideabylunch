// Content registry for the marketing blog at /blog.
// Add a new post by pushing another entry here — the index and [slug]
// pages render straight off this array, no other wiring needed.

export type BlogBlock =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'law'; n: number; name: string; text: string }

export interface BlogPost {
  slug: string
  title: string
  description: string
  publishedAt: string // ISO date, e.g. '2026-10-13'
  readMins: number
  body: BlogBlock[]
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: '12-laws-of-success',
    title: 'The 12 Laws of Success (You\'re Already Following All of Them)',
    description:
      'Success isn\'t random and failure isn\'t bad luck — both follow 12 invisible laws. Here they are, and how to start bending them in your favor today.',
    publishedAt: '2026-10-13',
    readMins: 7,
    body: [
      {
        type: 'p',
        text:
          'Success isn\'t random. Failure isn\'t bad luck. Both follow the same set of invisible rules — and right now, you\'re obeying every one of them, whether you know it or not. These aren\'t opinions or productivity tips. They\'re laws: break them and you pay a quiet, compounding price; learn them and the trajectory of your life changes. Twelve laws. Here they all are.',
      },
      {
        type: 'law',
        n: 1,
        name: 'The Law of Identity',
        text:
          'You will never outperform the story you tell yourself about who you are. Your income, your relationships, your body — they all bend to match your self-image, always. Change the results without changing the identity underneath them, and the results snap back. Change the identity first, and the results have no choice but to follow.',
      },
      {
        type: 'law',
        n: 2,
        name: 'The Law of the Vacuum',
        text:
          'You can\'t receive what you want until you release what you\'re clinging to. Full hands can\'t grab new things. The job, the relationship, the plan you\'ve outgrown but keep defending — every one of them is a hand that isn\'t free. Let go, or stay stuck holding exactly what you already have.',
      },
      {
        type: 'law',
        n: 3,
        name: 'The Law of Reversed Effort',
        text:
          'The harder you chase approval, sleep, or confidence, the faster it runs. These things aren\'t won by force — they\'re suffocated by it. The things you want most only arrive the moment you stop clutching at them and let them catch up to you instead.',
      },
      {
        type: 'law',
        n: 4,
        name: 'The Law of Mirrored Reality',
        text:
          'The world doesn\'t respond to what you want. It responds to what you tolerate. Every boundary you don\'t set, every bar you quietly lower, teaches people — and circumstances — exactly how to treat you. Your standards are your destiny, not your wishes.',
      },
      {
        type: 'law',
        n: 5,
        name: 'The Law of Diminishing Intent',
        text:
          'The longer you wait to act on an idea, the less likely you ever will. Motivation has a half-life, and it decays by the hour. The best time to start was the moment the idea arrived — the second-best time is right now, before it decays any further.',
      },
      {
        type: 'law',
        n: 6,
        name: 'The Law of Emotional Gravity',
        text:
          'You are pulled toward the emotional state of the five closest people in your life. Choose that circle wrong, and no amount of personal willpower saves you — gravity always wins eventually. Choose it well, and discipline stops feeling like discipline.',
      },
      {
        type: 'law',
        n: 7,
        name: 'The Law of Silent Repetition',
        text:
          'The thought you repeat most becomes the belief. The belief becomes the behavior. The behavior becomes the life. It was never one big decision that built the life you have — it was the quiet sentence you\'ve told yourself a thousand times without noticing.',
      },
      {
        type: 'law',
        n: 8,
        name: 'The Law of the Hidden Payoff',
        text:
          'Every bad habit you keep is giving you something — comfort, distraction, sympathy, an excuse. Until you name exactly what you\'re secretly gaining from it, you will never quit it, no matter how badly you want to. You can\'t release a payoff you refuse to see.',
      },
      {
        type: 'law',
        n: 9,
        name: 'The Law of Inverted Fear',
        text:
          'The thing you are most afraid to do is almost always the thing you most need to do. Fear isn\'t a stop sign warning you away from danger — it\'s a compass pointing straight at your own growth. Follow where it points, not where it tells you to run.',
      },
      {
        type: 'law',
        n: 10,
        name: 'The Law of Delayed Identity',
        text:
          'You don\'t change when you learn something new. You change when you stop identifying with something old. Information isn\'t transformation — you can read every book on the subject and remain exactly who you\'ve always been, right up until you let the old self go.',
      },
      {
        type: 'law',
        n: 11,
        name: 'The Law of Energetic Debt',
        text:
          'Every lie you tell yourself borrows energy from your future. Inauthenticity is expensive, and the bill always comes due — usually as burnout, resentment, or a collapse that looks sudden but was financed one small self-deception at a time.',
      },
      {
        type: 'law',
        n: 12,
        name: 'The Law of Unconscious Obedience',
        text:
          'You are already following all 12 of these laws, every single day, whether you\'ve named them or not. The only real question is whether you\'re following them toward what you want — or away from it.',
      },
      {
        type: 'h2',
        text: 'Knowing the laws isn\'t the hard part',
      },
      {
        type: 'p',
        text:
          'Reading all 12 won\'t change anything on its own — that would just be the Law of Delayed Identity catching you in the act. The laws only start working for you the moment you act on one of them, while the intent is still fresh. That\'s the Law of Diminishing Intent again: motivation is decaying right now, as you read this.',
      },
      {
        type: 'p',
        text:
          'If there\'s an idea you\'ve been sitting on — a business, a product, a site you\'ve meant to build "when you have time" — that\'s exactly the kind of thing this law eats alive. IdeaByLunch exists for that one moment: describe the idea, get a real brief and a live, deployed site back, by lunch. Not someday. Today, while the intent is still worth something.',
      },
    ],
  },
]

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find(p => p.slug === slug)
}

export function getAllBlogSlugs(): string[] {
  return BLOG_POSTS.map(p => p.slug)
}
