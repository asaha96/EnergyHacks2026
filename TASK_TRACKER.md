# TerraWatt Task Tracker

Use this document to track progress through the RALPH loop. Check off items as they're completed.

---

## Progress Overview

| Phase | Tasks | Completed | Status |
|-------|-------|-----------|--------|
| 1. Foundation | 5 | 5 | ✅ Complete |
| 2. Landing & Auth | 5 | 2 | 🟡 In Progress |
| 3. Home Dashboard | 3 | 0 | ⬜ Not Started |
| 4. Map & Area Select | 6 | 0 | ⬜ Not Started |
| 5. Constraints | 5 | 0 | ⬜ Not Started |
| 6. Agent Analysis | 6 | 0 | ⬜ Not Started |
| 7. Overview | 5 | 0 | ⬜ Not Started |
| 8. Analytics | 5 | 0 | ⬜ Not Started |
| 9. Billing | 4 | 0 | ⬜ Not Started |
| 10. Implementation | 5 | 0 | ⬜ Not Started |
| 11. Polish | 6 | 0 | ⬜ Not Started |
| **Total** | **55** | **5** | |

---

## Phase 1: Foundation

### Task 1.1: Project Setup
**Status:** ✅ Complete

**Subtasks:**
- [x] Initialize Next.js 14 with App Router (Next.js 16.1.4 with Turbopack)
- [x] Configure TypeScript
- [x] Set up Tailwind CSS (v4)
- [x] Install and configure shadcn/ui (base-vega style)
- [x] Create folder structure:
  ```
  app/
  components/
    ui/           # shadcn components
    layout/       # AppShell, Nav, Sidebar
    landing/      # Landing page components
    auth/         # Auth forms
    home/         # Dashboard components
    map/          # Map-related components
    plan/         # Plan detail components
  lib/
    utils.ts
  stores/         # Zustand stores
  types/          # TypeScript types
  ```
- [x] Set up path aliases in tsconfig
- [x] Installed Framer Motion + Zustand
- [x] Created base Zustand stores (plan-store.ts, ui-store.ts)
- [x] Created TypeScript types (types/plan.ts)

**Acceptance Criteria:**
- [x] `npm run dev` starts without errors
- [x] shadcn/ui Button component renders correctly
- [x] Tailwind classes work

---

### Task 1.2: Theme Configuration
**Status:** ✅ Complete (via shadcn/ui setup)

**Subtasks:**
- [x] Define color palette in Tailwind config (OKLCH colors via shadcn)
- [x] Configure CSS variables for dark/light
- [x] Set up typography scale (Inter + Geist fonts)
- [x] Define spacing tokens (Tailwind defaults)
- [x] Configure border radius tokens (--radius variable)
- [x] Define shadow tokens (shadcn defaults)

**Acceptance Criteria:**
- [x] All colors accessible via Tailwind classes
- [x] shadcn components use the new theme
- [x] Typography is consistent

---

### Task 1.3: Base Layout Components
**Status:** ✅ Complete

**Subtasks:**
- [x] Create `AppShell` component (wrapper for authenticated pages)
- [x] Create `TopNav` component with:
  - Logo (Leaf icon + TerraWatt)
  - User menu dropdown (Settings, Sign out)
  - Responsive behavior (hidden nav links on mobile)
- [x] Create `Sidebar` base component with:
  - Slide-in animation (right side, spring physics)
  - Overlay backdrop (blur + fade)
  - Close button
  - Width variants (sm/md/lg)
- [x] Set up Framer Motion via Providers in root layout
- [x] Create `PageTransition` wrapper component

**Files Created:**
- `components/layout/app-shell.tsx`
- `components/layout/top-nav.tsx`
- `components/layout/sidebar.tsx`
- `components/layout/page-transition.tsx`
- `components/layout/providers.tsx`
- `components/layout/index.ts`

**Acceptance Criteria:**
- [x] AppShell renders with TopNav
- [x] Sidebar slides in/out smoothly (spring animation)
- [x] Animations configured for 60fps

---

### Task 1.4: Mock Auth Flow (UI Only)
**Status:** ✅ Complete

**Subtasks:**
- [x] Create `/login` page with polished UI
- [x] Create `/register` page with polished UI  
- [x] Add Google sign-in button (styled, navigates to /home)
- [x] Add email/password form with validation UI
- [x] Clicking login/register auto-navigates to `/home`
- [x] Create simple auth context with mock user state (Zustand)

**Files Created:**
- `app/login/page.tsx` - Login page with split-screen layout
- `app/register/page.tsx` - Register page with password strength indicator
- `components/auth/auth-layout.tsx` - Reusable split-screen auth layout
- `components/auth/index.ts` - Barrel export
- `stores/auth-store.ts` - Mock auth state with login/logout
- `hooks/use-mobile.ts` - Mobile breakpoint hook

**Acceptance Criteria:**
- [x] Login page looks professional and matches design system
- [x] Register page looks professional with password strength indicator
- [x] Form validation shows inline errors (password match, strength)
- [x] Submit navigates to home dashboard (no real auth)

---

### Task 1.5: Mock Data & Sample Plans
**Status:** ✅ Complete

**Subtasks:**
- [x] Create mock user data object (in auth-store.ts)
- [x] Create 3 sample plan objects with realistic data
- [x] Store mock data in Zustand (persisted to localStorage)
- [x] Create home dashboard to display sample plans

**Files Created:**
- `lib/mock-data.ts` - Sample plans with realistic Colorado addresses, financials
- `app/home/page.tsx` - Dashboard page with plan grid
- `components/home/plan-card.tsx` - Plan card with status badges, metrics, delete
- `components/home/empty-state.tsx` - Empty state with CTA
- `components/home/index.ts` - Barrel export

**Sample Plans:**
1. Johnson Family Farm - 12.5 acres, 45kW solar, Complete
2. Meadow Creek Ranch - 28.3 acres, 85kW solar+wind+storage, Complete  
3. Sunset Acres - 7.8 acres, Draft status

**Acceptance Criteria:**
- [x] Sample plans available for UI development
- [x] Mock data structure matches TypeScript types
- [x] Data persists in localStorage via Zustand

---

## Phase 2: Landing & Auth

### Task 2.1: Landing Hero
**Status:** ✅ Complete

**Subtasks:**
- [x] Create hero section layout (full viewport height)
- [x] Add animated background (subtle energy flow or terrain)
- [x] Implement headline: "See What Your Land Can Power"
- [x] Add subheadline with value prop
- [x] Create primary CTA button: "Start Planning"
- [x] Add secondary link: "Learn More"
- [x] Implement scroll indicator

**Files Created:**
- `components/landing/hero.tsx` - Hero component with animations
- `components/landing/index.ts` - Barrel export
- Updated `app/page.tsx` - Uses Hero component

**Acceptance Criteria:**
- [x] Hero fills viewport on desktop
- [x] Animation is subtle and performant
- [x] CTA links to register/login
- [x] Mobile responsive

---

### Task 2.2: Landing Sections
**Status:** ✅ Complete

**Subtasks:**
- [x] Create "How It Works" section with 3 steps:
  1. Select your land on the map
  2. AI analyzes optimal placement
  3. Get complete implementation plan
- [x] Create stats bar:
  - "125,000+ acres analyzed"
  - "3,200+ plans created"
  - "850+ MW capacity planned"
- [x] Create testimonial section (mock quotes)
- [x] Create final CTA section
- [x] Create footer with links

**Files Created:**
- `components/landing/how-it-works.tsx` - 3-step process with connecting lines
- `components/landing/stats-bar.tsx` - Animated counters on primary bg
- `components/landing/testimonials.tsx` - 3 testimonial cards with ratings
- `components/landing/final-cta.tsx` - Large CTA section
- `components/landing/footer.tsx` - Links and copyright
- Updated `components/landing/index.ts` - All exports

**Acceptance Criteria:**
- [x] All sections render correctly
- [x] Scroll animations work (fade-in on scroll via useInView)
- [x] Responsive on all breakpoints

---

### Task 2.3: Auth Pages Layout
**Status:** ⬜ Not Started

**Subtasks:**
- [ ] Create split-screen layout:
  - Left: Branded visual (50%)
  - Right: Form area (50%)
- [ ] Add background illustration/animation to left side
- [ ] Create responsive behavior (stacked on mobile)
- [ ] Add logo to form side

**Acceptance Criteria:**
- [ ] Layout works on desktop and mobile
- [ ] Visual matches app aesthetic
- [ ] Smooth transition between login/register

---

### Task 2.4: Login Form
**Status:** ⬜ Not Started

**Subtasks:**
- [ ] Create Google sign-in button (styled)
- [ ] Add "or" divider
- [ ] Create email input with validation
- [ ] Create password input with show/hide toggle
- [ ] Add "Remember me" checkbox
- [ ] Add "Forgot password?" link
- [ ] Create submit button with loading state
- [ ] Add link to register page
- [ ] Implement form validation (client-side)

**Acceptance Criteria:**
- [ ] Form validates before submit
- [ ] Loading state shows during auth
- [ ] Error messages display properly
- [ ] Successful login redirects to Home

---

### Task 2.5: Register Form
**Status:** ⬜ Not Started

**Subtasks:**
- [ ] Create Google sign-up button
- [ ] Add "or" divider
- [ ] Create full name input
- [ ] Create email input with validation
- [ ] Create password input with strength indicator
- [ ] Create confirm password input
- [ ] Add terms checkbox: "I agree to Terms of Service"
- [ ] Create submit button with loading state
- [ ] Add link to login page

**Acceptance Criteria:**
- [ ] Password strength shows (weak/medium/strong)
- [ ] Passwords must match
- [ ] Terms must be checked
- [ ] Successful register redirects appropriately

---

## Phase 3: Home Dashboard

### Task 3.1: Home Layout
**Status:** ⬜ Not Started

**Subtasks:**
- [ ] Create dashboard container with AppShell
- [ ] Add page header: "Your Plans"
- [ ] Create "New Plan" button (prominent)
- [ ] Set up grid layout for plan cards (responsive)
- [ ] Add sorting/filtering UI (optional for MVP)

**Acceptance Criteria:**
- [ ] Page renders within AppShell
- [ ] "New Plan" navigates to Area Select
- [ ] Grid adjusts for different screen sizes

---

### Task 3.2: Plan Cards
**Status:** ⬜ Not Started

**Subtasks:**
- [ ] Create card component with:
  - Map preview image (static or placeholder)
  - Plan name (editable inline)
  - Location summary (address or coordinates)
  - Created date
  - Status badge (Draft / Analyzing / Complete)
- [ ] Add hover state with action buttons (View, Delete)
- [ ] Implement click to navigate to Overview
- [ ] Create delete confirmation dialog

**Acceptance Criteria:**
- [ ] Cards display all required info
- [ ] Hover reveals actions
- [ ] Click navigates to correct plan
- [ ] Delete removes card (with confirmation)

---

### Task 3.3: Empty State
**Status:** ⬜ Not Started

**Subtasks:**
- [ ] Create illustrated empty state component
- [ ] Add message: "No plans yet"
- [ ] Add subtext: "Start by selecting an area on the map"
- [ ] Add CTA button: "Create Your First Plan"
- [ ] Ensure it centers nicely in the viewport

**Acceptance Criteria:**
- [ ] Shows when no plans exist
- [ ] Illustration matches app aesthetic
- [ ] CTA navigates to Area Select

---

## Phase 4: Map & Area Selection

### Task 4.1: Map Integration
**Status:** ⬜ Not Started

**Subtasks:**
- [ ] Install react-leaflet and dependencies
- [ ] Create dynamic import wrapper (SSR fix)
- [ ] Set up MapContainer with custom styling
- [ ] Configure tile layer (Mapbox or CartoDB Positron)
- [ ] Style tiles to match app theme (muted colors)
- [ ] Set default center (US center or user's location)
- [ ] Set appropriate default zoom

**Acceptance Criteria:**
- [ ] Map renders without SSR errors
- [ ] Tiles load correctly
- [ ] Pan and zoom work smoothly
- [ ] Visual style matches app

---

### Task 4.2: Map Controls
**Status:** ⬜ Not Started

**Subtasks:**
- [ ] Create custom zoom controls (styled buttons)
- [ ] Add satellite/map style toggle
- [ ] Add fullscreen toggle (optional)
- [ ] Add "locate me" button (geolocation)
- [ ] Position controls (bottom-left)

**Acceptance Criteria:**
- [ ] Zoom in/out works
- [ ] Style toggle switches tile layer
- [ ] Geolocation centers on user (with permission)

---

### Task 4.3: Address Search
**Status:** ⬜ Not Started

**Subtasks:**
- [ ] Create search input component (floating, top-center)
- [ ] Integrate geocoding API (Nominatim or Mapbox)
- [ ] Show autocomplete suggestions as dropdown
- [ ] On select: fly to location with animation
- [ ] Show recent searches (stored in localStorage)
- [ ] Handle no results / errors gracefully

**Acceptance Criteria:**
- [ ] Typing shows suggestions
- [ ] Selecting a suggestion flies to location
- [ ] Recent searches persist
- [ ] Errors show friendly message

---

### Task 4.4: Polygon Drawing
**Status:** ⬜ Not Started

**Subtasks:**
- [ ] Install react-leaflet-draw
- [ ] Create drawing toolbar (floating, left side)
- [ ] Enable polygon drawing mode
- [ ] Enable rectangle drawing mode (alternative)
- [ ] Style the drawn polygon (fill color, border)
- [ ] Add vertex editing (drag to adjust)
- [ ] Add delete/clear functionality
- [ ] Store polygon coordinates in state

**Acceptance Criteria:**
- [ ] Can draw polygons by clicking
- [ ] Can edit vertices after drawing
- [ ] Can delete and start over
- [ ] Polygon styled consistently with app

---

### Task 4.5: Area Calculator
**Status:** ⬜ Not Started

**Subtasks:**
- [ ] Calculate area from polygon coordinates (in acres)
- [ ] Display area in real-time as drawing
- [ ] Create floating indicator component
- [ ] Position near the polygon or in corner
- [ ] Show "X.XX acres" with nice formatting

**Acceptance Criteria:**
- [ ] Area updates as polygon is drawn/edited
- [ ] Calculation is reasonably accurate
- [ ] Display is clear and readable

---

### Task 4.6: Confirmation Dialog
**Status:** ⬜ Not Started

**Subtasks:**
- [ ] Create floating dialog (bottom-right)
- [ ] Show only after polygon is complete
- [ ] Display:
  - Area size
  - Approximate location/address
  - "Analyze This Area" button
  - "Redraw" button
- [ ] Animate dialog appearance
- [ ] "Analyze" triggers constraints sidebar

**Acceptance Criteria:**
- [ ] Dialog appears after polygon drawn
- [ ] Shows correct area
- [ ] "Analyze" opens constraints sidebar
- [ ] "Redraw" clears and lets user start over

---

## Phase 5: Constraints

### Task 5.1: Sidebar Animation
**Status:** ⬜ Not Started

**Subtasks:**
- [ ] Create ConstraintsSidebar component extending base Sidebar
- [ ] Implement slide-in from right animation
- [ ] Make map compress/shift left when sidebar opens
- [ ] Set sidebar width (400px)
- [ ] Add close button (X or back arrow)
- [ ] Ensure smooth 60fps animation

**Acceptance Criteria:**
- [ ] Sidebar slides in smoothly
- [ ] Map adjusts width gracefully
- [ ] Close button works
- [ ] No jank or stutter

---

### Task 5.2: Financial Constraints
**Status:** ⬜ Not Started

**Subtasks:**
- [ ] Create collapsible section: "Budget & Financing"
- [ ] Add budget range slider ($10k - $500k+)
- [ ] Add financing radio options:
  - Pay cash
  - Finance with loan
  - Lease equipment
  - Not sure yet
- [ ] Add payback priority slider (Faster ROI ↔ Lower Upfront)
- [ ] Show estimated values as user adjusts

**Acceptance Criteria:**
- [ ] Slider shows current value
- [ ] All options selectable
- [ ] Values stored in state
- [ ] Section collapsible

---

### Task 5.3: Energy & Land Constraints
**Status:** ⬜ Not Started

**Subtasks:**
- [ ] Create "Energy Goals" section:
  - Primary goal dropdown (Offset bills, Generate income, Independence, Environmental)
  - Target production input (optional, kWh/month)
  - Grid connection radio (Connected, Off-grid, Hybrid)
- [ ] Create "Land Use" section:
  - "Draw exclusion zones" button (activates drawing on map)
  - Existing structures checkboxes (Barn, Home, Well, Pond, etc.)
  - Current land use multi-select (Active farming, Grazing, Unused, Forest)
  
**Acceptance Criteria:**
- [ ] All inputs functional
- [ ] Exclusion zones drawable on map
- [ ] State updates correctly

---

### Task 5.4: Technical & Timeline Constraints
**Status:** ⬜ Not Started

**Subtasks:**
- [ ] Create "Technology Preferences" section:
  - Technology checkboxes (Solar ✓, Wind, Battery Storage, Micro-hydro)
  - Aesthetic concern slider (Not concerned ↔ Very important)
  - Maintenance capacity radio (DIY, Full service, Mixed)
- [ ] Create "Timeline" section:
  - Urgency radio (ASAP, This year, 1-2 years, Just exploring)

**Acceptance Criteria:**
- [ ] All inputs functional
- [ ] At least one technology must be selected
- [ ] Values stored in state

---

### Task 5.5: Constraints Validation
**Status:** ⬜ Not Started

**Subtasks:**
- [ ] Add validation indicators per section (check mark when complete)
- [ ] Highlight required fields
- [ ] Disable "Analyze" button until minimum fields complete:
  - Budget range set
  - At least one technology selected
  - Primary goal selected
- [ ] Show inline validation messages
- [ ] Add "Analyze My Land" button at bottom (fixed position)

**Acceptance Criteria:**
- [ ] Visual feedback on completion
- [ ] Cannot proceed without required fields
- [ ] Clear error messages
- [ ] Button click triggers agent phase

---

## Phase 6: Agent Analysis

### Task 6.1: Agent Sidebar UI
**Status:** ⬜ Not Started

**Subtasks:**
- [ ] Transform constraints sidebar into agent sidebar (animated transition)
- [ ] Create message stream container
- [ ] Create individual message component:
  - Icon (varies by type: loading, check, info)
  - Text content
  - Timestamp (optional)
- [ ] Auto-scroll to latest message
- [ ] Add overall progress indicator at top

**Acceptance Criteria:**
- [ ] Transition from constraints is smooth
- [ ] Messages appear with animation
- [ ] Auto-scrolls as new messages arrive
- [ ] Progress shows current phase

---

### Task 6.2: Phase Indicator
**Status:** ⬜ Not Started

**Subtasks:**
- [ ] Create phase progress component showing:
  1. Data Collection
  2. Constraint Integration
  3. Technology Optimization
  4. System Design
  5. Financial Modeling
- [ ] Highlight current phase
- [ ] Show completed phases with checkmark
- [ ] Animate transitions between phases

**Acceptance Criteria:**
- [ ] Current phase clearly visible
- [ ] Completed phases marked
- [ ] Smooth animations

---

### Task 6.3: Map Overlay System
**Status:** ⬜ Not Started

**Subtasks:**
- [ ] Create overlay layer management system
- [ ] Implement terrain/elevation overlay (heat map style)
- [ ] Implement solar irradiance overlay (yellow-orange gradient)
- [ ] Implement wind potential overlay (blue gradient)
- [ ] Implement exclusion zone overlay (red hatching)
- [ ] Implement optimal zone highlighting (green)
- [ ] Add fade-in animations for each layer

**Acceptance Criteria:**
- [ ] Layers toggle on/off correctly
- [ ] Colors are distinguishable
- [ ] Performance remains good
- [ ] Animations are smooth

---

### Task 6.4: Equipment Markers
**Status:** ⬜ Not Started

**Subtasks:**
- [ ] Create custom marker icons:
  - Solar panel array (grouped)
  - Wind turbine
  - Battery storage
  - Inverter location
- [ ] Style markers to match app theme
- [ ] Add click handler to show tooltip/popup
- [ ] Popup shows: type, capacity, estimated cost
- [ ] Animate markers appearing on map

**Acceptance Criteria:**
- [ ] Icons are clear and recognizable
- [ ] Tooltips work on hover/click
- [ ] Markers animate in

---

### Task 6.5: Analysis Simulation
**Status:** ⬜ Not Started

**Subtasks:**
- [ ] Create timed sequence of agent messages:
  - Phase 1 messages (5-10 seconds)
  - Phase 2 messages (3-5 seconds)
  - Phase 3 messages (5-10 seconds)
  - Phase 4 messages (5-10 seconds)
  - Phase 5 messages (3-5 seconds)
- [ ] Coordinate messages with map updates
- [ ] Add typing indicator between messages
- [ ] Make timing feel natural (slight variance)

**Acceptance Criteria:**
- [ ] Full sequence runs automatically
- [ ] Map updates sync with messages
- [ ] Feels dynamic and "real"
- [ ] Total time: 30-60 seconds

---

### Task 6.6: Summary Generation
**Status:** ⬜ Not Started

**Subtasks:**
- [ ] Show summary card when analysis complete:
  - Total system size (kW)
  - Estimated production (kWh/year)
  - Total cost
  - Payback period
- [ ] Add "Save Plan" button
- [ ] Add "Start Over" option
- [ ] Save triggers navigation to Overview
- [ ] Store analysis results in plan state

**Acceptance Criteria:**
- [ ] Summary shows accurate mock data
- [ ] Save creates/updates plan
- [ ] Navigation to Overview works

---

## Phase 7: Overview

### Task 7.1: Overview Layout
**Status:** ⬜ Not Started

**Subtasks:**
- [ ] Create split layout:
  - Left (60%): Interactive map with final plan
  - Right (40%): Info panel
- [ ] Add top bar with:
  - Back to Home button
  - Plan name (editable)
  - Actions dropdown (Export, Share, Delete)
- [ ] Make layout responsive (stack on mobile)

**Acceptance Criteria:**
- [ ] Layout renders correctly
- [ ] Map shows final equipment placement
- [ ] Responsive on all breakpoints

---

### Task 7.2: Metrics Grid
**Status:** ⬜ Not Started

**Subtasks:**
- [ ] Create 2x3 grid of metric cards:
  - Total System Size (kW)
  - Annual Production (kWh)
  - Total Investment ($)
  - Payback Period (years)
  - Annual Savings ($)
  - CO2 Offset (tons/year)
- [ ] Style cards with icons and formatted numbers
- [ ] Add subtle hover effect

**Acceptance Criteria:**
- [ ] All metrics display correctly
- [ ] Numbers are nicely formatted
- [ ] Cards match design system

---

### Task 7.3: Section Navigation
**Status:** ⬜ Not Started

**Subtasks:**
- [ ] Create 3 large navigation cards:
  - 📊 Analytics - "View detailed projections"
  - 🧾 Billing - "See what you need to buy"
  - 📋 Implementation - "Get started building"
- [ ] Add icons and descriptions
- [ ] Implement click to open respective sidebar

**Acceptance Criteria:**
- [ ] Cards are visually prominent
- [ ] Clicking opens correct sidebar
- [ ] Hover states work

---

### Task 7.4: Plan Header
**Status:** ⬜ Not Started

**Subtasks:**
- [ ] Make plan name editable (click to edit)
- [ ] Add location display (address or coords)
- [ ] Create actions dropdown:
  - Export as PDF
  - Share (copy link)
  - Duplicate plan
  - Delete plan
- [ ] Handle delete with confirmation

**Acceptance Criteria:**
- [ ] Name saves on blur/enter
- [ ] Dropdown works correctly
- [ ] Delete has confirmation

---

### Task 7.5: Plan Persistence
**Status:** ⬜ Not Started

**Subtasks:**
- [ ] Implement save plan to storage (localStorage for MVP)
- [ ] Implement load plan from storage
- [ ] Handle plan not found error
- [ ] Add last modified timestamp
- [ ] Sync state with storage on changes

**Acceptance Criteria:**
- [ ] Plans persist across page refreshes
- [ ] Can navigate away and back
- [ ] Data integrity maintained

---

## Phase 8: Analytics Section

### Task 8.1: Analytics Sidebar
**Status:** ⬜ Not Started

**Subtasks:**
- [ ] Create sidebar container with tabs:
  - Production
  - Financial
  - Environmental
  - Comparison
- [ ] Style tab navigation
- [ ] Add close button
- [ ] Handle tab switching with animation

**Acceptance Criteria:**
- [ ] Tabs switch content
- [ ] Close returns to overview
- [ ] Animations smooth

---

### Task 8.2: Production Charts
**Status:** ⬜ Not Started

**Subtasks:**
- [ ] Install Recharts
- [ ] Create daily production line chart (seasonal curve)
- [ ] Create monthly production bar chart
- [ ] Create hourly profile chart (average day)
- [ ] Add chart tooltips and legends
- [ ] Make charts responsive

**Acceptance Criteria:**
- [ ] Charts render with mock data
- [ ] Tooltips show values
- [ ] Responsive sizing

---

### Task 8.3: Financial Analysis
**Status:** ⬜ Not Started

**Subtasks:**
- [ ] Create cost breakdown pie chart
- [ ] Create 25-year cash flow projection chart
- [ ] Create payback timeline visualization
- [ ] Create incentives table:
  - Federal ITC (30%)
  - State incentives
  - USDA REAP eligibility
  - Utility rebates
- [ ] Add financing scenario toggle

**Acceptance Criteria:**
- [ ] All visualizations render
- [ ] Incentives listed correctly
- [ ] Scenarios toggle works

---

### Task 8.4: Environmental Impact
**Status:** ⬜ Not Started

**Subtasks:**
- [ ] Create carbon offset display (annual/lifetime)
- [ ] Add equivalency metrics:
  - Trees planted equivalent
  - Cars off road equivalent
  - Homes powered equivalent
- [ ] Style with icons and large numbers

**Acceptance Criteria:**
- [ ] Numbers calculated from production
- [ ] Visually engaging display

---

### Task 8.5: Comparison Tools
**Status:** ⬜ Not Started

**Subtasks:**
- [ ] Create before/after bill comparison
- [ ] Add "what if" scenario selector:
  - Different budget
  - Different technology mix
  - Different timeline
- [ ] Show how changes affect ROI

**Acceptance Criteria:**
- [ ] Comparisons are clear
- [ ] Scenarios update projections

---

## Phase 9: Billing Section

### Task 9.1: BOM Sidebar
**Status:** ⬜ Not Started

**Subtasks:**
- [ ] Create sidebar with category sections:
  - Solar Equipment
  - Wind Equipment (if applicable)
  - Storage (if applicable)
  - Balance of System
  - Installation Materials
- [ ] Add collapsible sections
- [ ] Show category subtotals

**Acceptance Criteria:**
- [ ] All categories render
- [ ] Sections expand/collapse
- [ ] Subtotals calculated

---

### Task 9.2: Line Item Component
**Status:** ⬜ Not Started

**Subtasks:**
- [ ] Create line item row component:
  - Product name/model
  - Quantity
  - Unit price
  - Line total
  - Expand for details
- [ ] Expandable details show:
  - Full specifications
  - Why this was selected
  - Link to example supplier
- [ ] Style with alternating row colors

**Acceptance Criteria:**
- [ ] Items display correctly
- [ ] Expansion works
- [ ] Numbers formatted

---

### Task 9.3: Price Summary
**Status:** ⬜ Not Started

**Subtasks:**
- [ ] Create summary section (sticky at bottom or top):
  - Equipment subtotal
  - Installation estimate
  - Permit fees
  - Contingency (10%)
  - **Gross Total**
  - Incentives breakdown
  - **Net Cost After Incentives**
- [ ] Highlight the final number

**Acceptance Criteria:**
- [ ] All math correct
- [ ] Final cost prominent
- [ ] Incentives clearly shown

---

### Task 9.4: Export Functionality
**Status:** ⬜ Not Started

**Subtasks:**
- [ ] Add "Export as PDF" button
- [ ] Add "Export as CSV" button
- [ ] Generate formatted PDF with logo
- [ ] Generate CSV with all line items
- [ ] Handle download

**Acceptance Criteria:**
- [ ] PDF downloads and is readable
- [ ] CSV opens in spreadsheet apps
- [ ] Formatting is professional

---

## Phase 10: Implementation Section

### Task 10.1: Implementation Sidebar
**Status:** ⬜ Not Started

**Subtasks:**
- [ ] Create sidebar with sections:
  - Permits & Approvals
  - Construction Guide
  - Contractor Info
  - Documentation
- [ ] Use accordion or tabs for navigation
- [ ] Add section icons

**Acceptance Criteria:**
- [ ] All sections accessible
- [ ] Navigation intuitive

---

### Task 10.2: Permits Section
**Status:** ⬜ Not Started

**Subtasks:**
- [ ] Create permit card component showing:
  - Permit name
  - What it's for
  - Typical cost
  - Typical timeline
  - Status (Not started / In progress / Approved)
  - Required documents checklist
- [ ] List permits:
  - Building Permit
  - Electrical Permit
  - Utility Interconnection
  - Zoning (if needed)

**Acceptance Criteria:**
- [ ] All permits listed with details
- [ ] Status can be toggled (for user tracking)
- [ ] Checklists interactive

---

### Task 10.3: Construction Guide
**Status:** ⬜ Not Started

**Subtasks:**
- [ ] Create project timeline visualization
- [ ] Add step-by-step overview:
  1. Site Preparation
  2. Foundation/Mounting
  3. Equipment Installation
  4. Wiring & Connection
  5. Inspection
  6. Grid Connection
- [ ] Add simplified wiring diagram image
- [ ] List inspection checkpoints

**Acceptance Criteria:**
- [ ] Timeline is visual and clear
- [ ] Steps are understandable
- [ ] Diagram is helpful

---

### Task 10.4: Documentation Package
**Status:** ⬜ Not Started

**Subtasks:**
- [ ] Create downloadable documents list:
  - Site Plan (PDF)
  - Equipment Specifications
  - Permit Application Templates
  - Interconnection Application Template
  - Scope of Work Template
- [ ] Style download cards with icons
- [ ] Generate documents from plan data

**Acceptance Criteria:**
- [ ] All documents downloadable
- [ ] Documents contain plan-specific info

---

### Task 10.5: Contractor Info
**Status:** ⬜ Not Started

**Subtasks:**
- [ ] List recommended contractor types:
  - Licensed Electrician
  - General Contractor
  - Solar Installer (if specialized)
- [ ] Add "Questions to Ask Contractors" section
- [ ] Provide typical project timeline estimate
- [ ] Add tips for vetting contractors

**Acceptance Criteria:**
- [ ] Information is helpful
- [ ] Well-formatted and readable

---

## Phase 11: Polish

### Task 11.1: Loading States
**Status:** ⬜ Not Started

**Subtasks:**
- [ ] Create skeleton loader components
- [ ] Add loading spinners where appropriate
- [ ] Implement loading states for:
  - Map initial load
  - Plan list fetch
  - Plan save
  - Export generation

**Acceptance Criteria:**
- [ ] No empty states during loading
- [ ] Skeletons match content shape

---

### Task 11.2: Error Handling
**Status:** ⬜ Not Started

**Subtasks:**
- [ ] Create toast notification system
- [ ] Add error boundary for critical failures
- [ ] Handle specific errors:
  - Network failures
  - Geolocation denied
  - Storage quota exceeded
  - Invalid form submission
- [ ] Create friendly error messages

**Acceptance Criteria:**
- [ ] Errors don't crash app
- [ ] Users know what went wrong
- [ ] Can recover from errors

---

### Task 11.3: Responsive Design
**Status:** ⬜ Not Started

**Subtasks:**
- [ ] Test and fix mobile (375px)
- [ ] Test and fix tablet (768px)
- [ ] Test and fix desktop (1440px+)
- [ ] Adjust map UI for touch
- [ ] Make sidebars full-screen on mobile
- [ ] Test all forms on mobile

**Acceptance Criteria:**
- [ ] Usable on all devices
- [ ] Touch targets large enough
- [ ] No horizontal scrolling

---

### Task 11.4: Animation Polish
**Status:** ⬜ Not Started

**Subtasks:**
- [ ] Review all page transitions
- [ ] Polish sidebar animations
- [ ] Add micro-interactions:
  - Button hover/press
  - Card hover
  - Input focus
  - Toggle switches
- [ ] Ensure consistent timing/easing
- [ ] Remove any jank

**Acceptance Criteria:**
- [ ] Animations feel cohesive
- [ ] 60fps throughout
- [ ] No unnecessary motion

---

### Task 11.5: Accessibility
**Status:** ⬜ Not Started

**Subtasks:**
- [ ] Add keyboard navigation to all interactive elements
- [ ] Ensure focus visible states
- [ ] Add ARIA labels where needed
- [ ] Test with screen reader (basic)
- [ ] Ensure color contrast meets WCAG
- [ ] Add skip links

**Acceptance Criteria:**
- [ ] Tab navigation works
- [ ] Focus visible
- [ ] No critical a11y errors

---

### Task 11.6: Performance
**Status:** ⬜ Not Started

**Subtasks:**
- [ ] Implement code splitting for heavy components
- [ ] Lazy load map components
- [ ] Optimize images (if any)
- [ ] Review bundle size
- [ ] Add resource hints (preload, prefetch)
- [ ] Test Lighthouse score

**Acceptance Criteria:**
- [ ] Initial load < 3s on 3G
- [ ] Lighthouse performance > 80
- [ ] No obvious bottlenecks

---

## Completion Checklist

Before marking the project complete:

- [ ] All 55 tasks completed
- [ ] All pages accessible
- [ ] No console errors
- [ ] Works offline (basic)
- [ ] Data persists correctly
- [ ] Responsive on all devices
- [ ] Animations smooth
- [ ] Learnings documented
- [ ] Code commented where complex
- [ ] README updated

---

*Last Updated: [DATE]*