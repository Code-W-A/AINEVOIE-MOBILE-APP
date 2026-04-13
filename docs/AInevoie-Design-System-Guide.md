# AInevoie Design System Guide

This guide defines the visual system that should drive future screen redesigns in AInevoie.

It is not a component library specification.
It does not require rebuilding screens or replacing working JSX.

Its purpose is to help future refactors restyle existing screens in a consistent way while preserving:
- current routes
- current handlers
- current business logic
- current validation
- current navigation flow
- current screen responsibilities

The main principle of this system is:

**AInevoie should feel light, minimal, calm, premium, and easy to scan.**

The UI should never feel crowded, noisy, over-layered, or overly containerized.

---

## 1. What We Already Extracted From Auth And Onboarding

The auth and onboarding redesign established the new baseline visual language for AInevoie:

- light-only interface direction
- one central accent color
- strong heading hierarchy
- spacious mobile-first layout
- large rounded controls
- restrained use of surfaces
- calm premium spacing
- subtle shadows only on real interactive controls
- soft abstract background shapes used sparingly
- clean state-driven UI for focus, selected, active, and error states
- minimal visual noise
- clear hierarchy without unnecessary wrappers
- flatter and more breathable composition

This is the reference system that should influence the rest of the product.

Current implementation anchors:
- [`src/features/auth/theme/authTheme.js`](/Users/code-with-a/Dev/codecanyon-Lw0Bqv2T-home-service-finder-provider-booking-template-in-react-native-2-apps-urbanhome-android-ios/User%20App/rn-UrbanHome-User/src/features/auth/theme/authTheme.js)
- [`constant/styles.js`](/Users/code-with-a/Dev/codecanyon-Lw0Bqv2T-home-service-finder-provider-booking-template-in-react-native-2-apps-urbanhome-android-ios/User%20App/rn-UrbanHome-User/constant/styles.js)
- [`src/features/shared/styles/discoverySystem.js`](/Users/code-with-a/Dev/codecanyon-Lw0Bqv2T-home-service-finder-provider-booking-template-in-react-native-2-apps-urbanhome-android-ios/User%20App/rn-UrbanHome-User/src/features/shared/styles/discoverySystem.js)

---

## 2. Core Design Rules

### 2.1 Light-only product baseline

The product baseline is light.

Use:
- near-white app backgrounds
- white or very light neutral surfaces
- dark readable text
- subtle borders
- soft shadows only where needed

Avoid:
- dark dashboard treatment as default
- charcoal or navy layouts as the main direction
- dark cards over light screens
- heavy gradients
- glow-heavy styling

### 2.2 One accent color only

Use one centralized accent color for the whole product.

The accent should drive:
- primary CTA fill
- selected states
- focused inputs
- active tabs and chips
- links
- key icon emphasis
- strong confirmations

Do not hardcode accent colors per screen.
If a screen needs emphasis, it should derive it from the centralized token system.

### 2.3 Preserve layout, improve styling

When redesigning a screen:
- keep the existing JSX structure where possible
- keep the same layout skeleton if it already works
- improve spacing, surfaces, hierarchy, borders, states, and typography
- only extract shared styles or small primitives when duplication becomes obvious

Default mindset:
- refactor the visual layer
- do not rebuild the screen

### 2.4 Minimalism first

AInevoie should feel minimal, not busy.

Use:
- fewer visual containers
- more breathing room
- stronger typography hierarchy
- simpler grouping methods
- restrained emphasis
- only one clear primary focus per section

Avoid:
- UI overload
- too many cards on the same vertical level
- decorative wrappers that do not add meaning
- multiple heavy surfaces competing for attention
- “container inside container inside container” composition
- overdesigned sections that feel like stacked boxes

A screen should feel:
- open
- breathable
- intentional
- easy to scan in seconds

### 2.5 Hierarchy through spacing, not through too many boxes

Hierarchy should come primarily from:
- typography
- spacing
- section rhythm
- subtle dividers
- soft background contrast
- icon anchors
- selective use of surface elevation

Not from:
- large wrapper cards around everything
- repeated framed blocks
- card-in-card layout patterns
- heavy border stacking

---

## 3. Visual Language To Reuse Across Existing Screens

### 3.1 Background model

Preferred screen background:
- `background.app` equivalent to the current auth light background
- optional soft abstract orbs only when they help the top hero area
- background effects should stay low-noise and low-contrast

Use section contrast through:
- spacing
- divider lines
- subtle white surfaces
- accent-soft highlights

Do not rely on large parent cards for basic grouping.

### 3.2 Surface model

The app should feel flatter, cleaner, and more breathable than the original UrbanHome base.

Use these surface levels:
- level 0: app background
- level 1: standalone controls like inputs, pills, rows, CTA buttons
- level 2: occasional true cards only when content is complex enough to justify grouping

Rule:
- use cards only when they help comprehension
- avoid card-in-card hierarchy
- avoid wrapping an entire section in a large card if the children already behave as standalone surfaces
- avoid turning every block into a card

Preferred grouping methods:
- vertical spacing
- section headings
- dividers
- icon badges
- subtle tinted rows
- light section rhythm

A surface should earn its existence.
If removing a wrapper makes the screen cleaner and nothing is lost structurally, the wrapper should probably not exist.

### 3.3 Shape system

Use a consistent rounded system:
- buttons: pill or near-pill
- inputs: large rounded rectangles
- cards: soft large radius
- chips: pill
- icon containers: circular or rounded pill

The UI should feel:
- touch-friendly
- soft
- premium
- mobile-native

### 3.4 Typography hierarchy

Use typography as the main hierarchy tool.

Recommended levels:
- hero title: bold, large, high presence
- section title: bold, compact, clear
- body: readable medium weight
- support text: muted
- labels and captions: smaller, clean, quiet

Tone:
- short
- calm
- direct
- easy to scan

Typography should do more work than decoration.

### 3.5 Interaction states

State language must stay consistent:

- focused: accent border or accent-tinted icon background
- selected: accent border, accent-soft background, or accent icon fill
- pressed: slightly darker accent or lower elevation
- error: dedicated error color with no ambiguity
- disabled: lower contrast and quieter text/surface

Do not invent different state patterns on every screen.

---

## 4. Token Model For General Screen Refactors

Future screen redesigns should gradually converge toward a shared token model equivalent to:

- `brand.primary`
- `brand.primarySoft`
- `brand.primaryPressed`
- `brand.primaryShadow`
- `background.app`
- `background.section`
- `surface.card`
- `surface.input`
- `surface.sheet`
- `surface.subtle`
- `text.primary`
- `text.secondary`
- `text.muted`
- `text.onAccent`
- `border.subtle`
- `border.focus`
- `state.active`
- `state.disabled`
- `state.error`
- `semantic.successSoft`
- `semantic.warningSoft`
- `semantic.infoSoft`

Current practical source of truth:
- start from `authTheme.js`
- move old hardcoded values from `constant/styles.js` toward the same naming direction over time
- align `discoverySystem.js` to the same visual grammar instead of letting it evolve into a separate design language

---

## 5. How To Restyle Existing Screens Without Rebuilding JSX

Use the following transformation rules when touching other screens.

### 5.1 Screen shell

Keep the same screen layout, but change:
- background color
- spacing rhythm
- section padding
- hero/header hierarchy
- divider usage

Prefer:
- cleaner top spacing
- more air between blocks
- fewer visual enclosures

### 5.2 Existing cards

When a screen already has cards:
- keep only the cards that represent real content grouping
- remove decorative parent wrappers
- reduce border noise
- use lighter borders and softer elevation
- simplify card density
- let the content breathe inside the card

If cards are nested:
- eliminate the outer card first
- keep the inner meaningful card/row only if it holds the actual interaction or content grouping
- do not preserve nested cards just because they already exist

Goal:
- one meaningful surface is usually enough

### 5.3 Existing list items and rows

For lists, service rows, booking rows, message rows:
- make the row itself the main surface
- use white or near-white background
- add soft radius
- use subtle border
- use very restrained shadow only if needed
- rely on spacing and typography to create hierarchy

Do not place rows inside oversized decorative section cards unless that card is structurally necessary.

### 5.4 Existing input-like areas

Apply the auth input model to:
- search bars
- filters
- form rows
- promo code fields
- address inputs

They should feel:
- large
- rounded
- soft
- lightly elevated
- clearly focused with accent border

### 5.5 Existing tabs, chips, filters

Selected state should use the same accent logic as auth:
- accent fill for strong selected states
- accent-soft background for softer selected states
- neutral off-state with subtle border

Do not over-style chips or create too many competing filter surfaces.

### 5.6 Existing buttons

Buttons should converge toward:
- one clear primary CTA per screen
- pill or large rounded shape
- strong fill using the centralized accent
- secondary buttons as white or soft neutral surfaces with border

Avoid:
- multiple equally loud CTAs
- mixed button shapes on the same screen
- oversized button wrappers

### 5.7 Existing icons and badges

Icons should usually sit in:
- a soft accent circle
- a subtle neutral circle
- a small tinted badge

Avoid floating icons with random colors.

---

## 6. Product-wide UI Patterns To Reuse

These patterns are already validated by auth/onboarding and should influence the rest of the app:

- hero section with eyebrow + strong heading + short subtitle
- accent-soft brand pill
- standalone rounded controls on a light background
- flat section grouping through spacing instead of large wrapper cards
- icon-in-circle visual anchors
- subtle divider-led information sections
- strong full-width CTA
- quiet secondary actions
- fewer but more meaningful surfaces
- simpler sections with stronger breathing room

---

## 7. What To Avoid When Redesigning Other Screens

Avoid:
- rebuilding screens from scratch
- inventing new layouts when the existing one is already functional
- mixing old blue UrbanHome styling with the new violet accent on the same screen
- card inside card
- card inside card inside card
- dense UI with low breathing room
- wrapping every section in a large rounded card
- using containers just to make things “look designed”
- overusing shadows
- using many highlight colors in one screen
- random one-off design experiments that do not map to the token system
- decorative complexity that makes the screen feel heavy
- visual stacking that makes the layout feel boxed-in

If a screen starts feeling crowded, the first fix should usually be:
- remove wrappers
- simplify surfaces
- increase spacing
- reduce simultaneous emphasis

---

## 8. Recommended Rollout Strategy

When redesigning the rest of the app, work in batches:

1. Shared tokens and shared visual rules
2. Discovery / home / search / service listing screens
3. Detail screens and booking flow
4. Messaging and notifications
5. Profile, settings, support, legal, static screens

For each batch:
- inspect current JSX first
- keep the same screen responsibilities
- restyle surfaces, spacing, typography, and states
- only extract shared styles when it clearly improves consistency
- simplify before adding
- remove unnecessary wrappers before inventing new ones

---

## 9. Practical Rule For Codex Or Future Refactors

When modifying an existing screen, the guiding question should be:

`How can this screen look like AInevoie's auth/onboarding design system while keeping its current layout and logic, and making it cleaner, lighter, and less crowded?`

Not:

`How can this screen be rebuilt as a new design concept?`

And not:

`How can this screen be made to feel more decorative by adding more cards, more wrappers, and more surfaces?`

That distinction should guide every redesign pass.