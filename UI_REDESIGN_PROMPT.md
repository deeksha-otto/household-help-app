# UI Redesign Prompt — Household Help Attendance & Salary App

## Design direction: Duolingo-inspired (this supersedes the general
## "warm/friendly" direction below — apply this specific style instead)

Duolingo's look isn't just "colorful" — it's a specific set of concrete
patterns. Apply these directly:

- **Chunky 3D buttons**: every primary button has a solid bottom "shadow"
  border in a darker shade of the same color (like a button that looks
  physically pressable), not a flat color with a soft drop-shadow. On tap,
  the button visually "presses down" (shifts down a few px, shadow
  shrinks) for tactile feedback.
- **COLOR SCHEME OVERRIDE — use District (by Zomato) as the color
  reference instead of Duolingo's green.** District uses a deep, rich
  purple as its signature color (distinct from typical app blues/greens),
  paired with a bold, slightly editorial typographic identity — more
  premium and modern than Duolingo's playful flat green, while still bold
  and distinctive rather than corporate. Concretely:
  - Primary brand/action color: a deep, rich purple/violet (e.g. in the
    range of #4A0E4E to #6D2E75 — velvety, not pastel/lavender)
  - Background: a soft off-white or very light neutral (not stark white,
    not dark mode) so the purple pops as the clear accent
  - Keep the chunky 3D-press button style from Duolingo (bottom shadow
    border, press-down animation), just recolor it into this purple family
    instead of green
  - Secondary accent colors (for Absent=red, Half-day=amber, Paid
    Leave=blue) stay as before — only the PRIMARY brand/action color
    changes from green to this deep purple
  - Typography can be slightly more modern/editorial rather than
    ultra-rounded-cartoonish — still bold and confident, but leaning
    toward a more grown-up, premium feel to match District's tone
- **Thick, rounded sans-serif font**, bigger and bolder than a typical
  app — headings especially should feel chunky and confident, not thin/light
  weight.
- **Big rounded-rectangle cards and buttons** (16-20px radius), lots of
  white/light space around them so nothing feels cramped.
- **Progress + streaks**: add a visible "streak" — consecutive days the
  employer has marked attendance without missing a day — shown prominently
  on the home screen with a flame/fire icon, Duolingo-style. This is a new
  small feature, not just styling: track consecutive days-used as a simple
  counter.
- **Celebratory micro-animations on completion** — when attendance is
  marked, a brief bounce/confetti/checkmark-pop animation, the way Duolingo
  celebrates finishing a lesson. Keep it quick (under 1 second) so it
  doesn't slow down the 3-second daily habit loop.
- **Mascot-style friendliness (optional but recommended)** — a simple
  friendly icon/character (doesn't need to be literal, could just be an
  expressive icon set) used in empty states and celebration moments — e.g.
  a happy icon when all workers are marked for the day, similar to
  Duolingo's owl showing up at key moments.
- **Playful, encouraging microcopy** — instead of dry labels, use small
  moments of personality: "All done for today! 🎉" instead of "Attendance
  complete," "3 workers left to mark" instead of a bare count.

Apply this Duolingo direction across every screen listed below — treat the
screen-by-screen notes as content/layout guidance, but replace the visual
tone (colors, button style, typography) with the Duolingo direction above
wherever they conflict.

**Note: the streak counter is not purely styling.** It needs a small data
addition — e.g. a field on the employer record tracking consecutive days
where at least one attendance action was logged, incrementing daily and
resetting if a day is missed. Flag this to Claude Code explicitly as a
small logic addition alongside the visual redesign, not styling alone.

## Original design direction (colors/tone below are now superseded by the
## Duolingo direction above — keep the layout/functional guidance only)

Redesign the entire app's UI with the following direction. Keep all existing
functionality and Supabase logic exactly as-is — this is a visual/UX pass
only, not a feature or logic change.

## Overall design direction
- Mobile-first, one-handed use, large tap targets throughout (minimum 48px
  tap height on any button)
- Rounded corners on cards and buttons (12-16px radius), soft drop shadows
  instead of hard borders
- Generous spacing/padding — avoid dense, cramped layouts
- Color palette: warm and friendly, NOT sterile corporate blue-and-white.
  Use a primary color like a warm teal, terracotta, or deep green as the
  brand color, with a soft off-white/cream background (not stark white).
  Reserve red strictly for "Absent" and negative amounts, green strictly for
  "Present" and positive/settled states — don't overload these colors
  elsewhere. IMPORTANT: the Duolingo direction above overrides the PRIMARY
  brand/action color to deep purple (District-inspired), NOT green — so
  green is only used for "Present" status, never for primary buttons.
  Since Present is green, do NOT use green or purple for "Paid Leave" —
  use blue for Paid Leave so all four statuses plus the brand color stay
  visually distinct.
- Typography: large, legible sans-serif, bigger font sizes than a typical
  web app default — this needs to be readable at a glance, possibly by
  someone who isn't highly tech-savvy or may be older
- Avoid dense tables anywhere in the main flow — prefer card-based layouts
  (like Splitwise/PagarBook) over spreadsheet-style grids

## Screen-by-screen direction

### 0. Splash screen (shows first, before login)
- App name: **Sahayak**
- Full-screen, brand primary color (the deep purple from the District
  color override above) as background, or a light background with the
  logo as the hero element — pick whichever reads cleaner
- Center: a simple logo mark + "Sahayak" in the bold rounded typography
  established above. Since there's no existing logo asset, generate a
  simple icon-based mark (e.g. a friendly icon — a checkmark, a calendar
  tick, or a house/hand motif reflecting "household help" — inside a
  rounded shape), not literal text-as-logo alone
- Tagline, one line, lighter weight: "Attendance & salary, sorted" (or
  similar short line reflecting the core pitch)
- Auto-dismiss after 1.5-2 seconds into the login screen (no tap required)
  — a splash screen should never block the user, just brief brand framing
- Keep it simple — no heavy animation needed beyond maybe a soft fade/scale
  in on the logo, consistent with the snappy, non-slowing-down feel of the
  rest of the app

### 1. Login / Signup
- At the top: a toggle/segmented control — **"Employer" / "Worker"** —
  styled as two chunky pill-shaped tabs (Duolingo/District tone), clearly
  showing which one is selected (filled with the primary purple) vs
  unselected (outlined/greyed)
- Below the toggle, the same Sign In / Sign Up form either way — only the
  behavior on submit differs (see `BUILD_SPEC.md` for the linking logic)
- If a Worker signs up with an email that has no matching worker profile,
  show a friendly, clear inline error (not a generic auth error) — e.g.
  "No worker profile found with this email — ask your employer to add you
  first."
- Simple centered card, generous padding, clear single primary button
- Toggle between Sign In / Sign Up should feel like one smooth motion, not
  a jarring page swap

### 2. Worker list (home screen)
- Inspired by PagarBook: each worker shown as a card, not a table row —
  name, role (with a small icon per role: cook/maid/car washer/etc.),
  and a quick-glance indicator of today's attendance status if already
  marked
- Prominent, thumb-reachable "+" button (bottom-right, floating, like most
  Indian utility apps) to add a new worker
- Filter/group by role optional but nice — small pill-style filter chips
  at the top, not a dropdown

### 3. Add/edit worker
- Single-column form, one field visible/focused at a time if possible
  (reduces overwhelm), large input fields
- Role selection as a visual grid of icons/labels (not a plain dropdown) —
  cook, maid, car washer, newspaper, milk, gardener, nanny, + custom
- Attendance frequency as 3 large selectable cards (not a dropdown): "Daily"
  / "Specific Days" / "Alternate Days" — with a one-line description under
  each (e.g. "Comes every day except a weekly off" / "Comes only on chosen
  days, like once a week" / "Comes every other day")
- Show the relevant follow-up input only after a frequency is picked:
  - Daily → weekly off day, as a row of 7 day-abbreviation pills (Mon-Sun)
  - Specific Days → same 7-day pills, but multi-select (can pick more than
    one day)
  - Alternate Days → a single date picker for the start date
- This progressive reveal (only show what's relevant) keeps the form from
  feeling cluttered despite supporting 3 different scheduling modes

### 4. Daily attendance (the core, most-used screen)
- This is the Duolingo-inspired screen: one clear question ("Mark today
  for [Worker Name]"), four large, distinctly colored buttons:
  - Present → green
  - Absent → red
  - Half-day → amber/orange
  - Paid Leave → blue
- On tap: immediate visual confirmation (a checkmark animation, brief color
  fill, or similar) — this needs to feel satisfying and instant, like
  completing a Duolingo lesson tap
- Weekly off days auto-display as a soft, greyed-out "Weekly Off" state
  with no buttons shown — nothing to tap, just an acknowledgment
- For workers on "Specific Days" or "Alternate Days" frequency: on days
  that aren't scheduled for them, show a similar soft, greyed-out "Not
  Scheduled Today" state instead of the 4 action buttons — visually
  distinct from "Weekly Off" (e.g. a different icon) so the employer can
  tell the two apart, but same calm/neutral tone (no action needed)
- IMPORTANT: if a worker has already used up their allowed paid leaves for
  this period, tapping "Paid Leave" again must show a clear, visible
  warning (not a silent action) that this day will count as unpaid/absent
  instead — e.g. a small inline banner or confirmation dialog, in the same
  red/amber tone used for warnings elsewhere. This must not be a silent
  background calculation; the employer needs to see it in the moment.
- Small calendar strip or list below to view/edit past days in the current
  period, but keep it secondary/collapsed — today's action is the star

### 5. Log a payment
- Big amount input (numeric keypad by default on mobile), date defaults to
  today, optional note field
- Past payments shown as a Splitwise-style list: amount, date, note, with
  a running "total given this period" shown clearly at the top

### 6. Monthly summary
- Card-based breakdown, not a table: Days Present / Absent / Half-days /
  Paid Leave shown as simple stat cards with icons, not rows of numbers
- Any deduction line items (unpaid absences, half-days, and any paid-leave
  days converted to unpaid because the allowed limit was exceeded) should
  use the red/negative color from the palette rules above, and the
  leave-limit-exceeded case specifically should be labeled clearly (e.g.
  "2 extra leave days — deducted") so it's not confused with a regular
  absence
- Final amount due shown LARGE and prominent at the bottom — this is the
  number the employer actually cares about, it should be unmissable
- "Mark Settled" as a clear, confident primary button — maybe require a
  simple confirmation step since this archives the period

### 7. Settlement history
- Splitwise-style list of past settled periods, most recent first, each
  expandable to show the same breakdown as the monthly summary
- Should feel like flipping through past receipts — clean, chronological,
  scannable

## Reference apps (for tone, not literal copying)
- PagarBook — worker list and summary layout simplicity
- Splitwise — ledger/payment list style, running balances, settlement
  history
- Google Pay / PhonePe — tap target sizing, friendly-but-trustworthy color
  use, everyday-utility-app feel
- Duolingo — the one-tap daily action feel specifically for the attendance
  screen

## What NOT to do
- No dense data tables anywhere in the main user flow
- No sterile/corporate blue-and-white color scheme
- No dropdowns where a visual picker (pills, icon grid) would work better
- No small, cramped tap targets — this must work for someone tapping with
  one thumb, possibly not very tech-savvy
