# 🌸 Dailio — Minimalist Habit Tracker

Dailio is a gorgeous, minimalist habit-tracking web application designed with desktop-first precision and mobile-first responsiveness. It focuses on maximizing your done/to-do completion ratio over daily and weekly periods, helping you build positive habits and break negative ones with extreme clarity.

---

## 🎨 Visual Philosophy & Theme
Dailio is built with a clean, high-contrast, Swiss-modern aesthetic:
- **Typography**: Paired with elegant display headings and monospaced indicators for structured data tracking.
- **Dual Themes**: Fully supports polished Light Mode (default) and Slate Dark Mode. Visual line charts and plot elements automatically adjust (e.g., high-visibility white lines on dark backdrops, dark lines on light backdrops).
- **Layout & Spacing**: Features ample negative space, smooth entry animations, blurred backdrop-filter modals, and strict scroll locks on mobile views.

---

## ✨ Features Breakdown

### 1. Flexible Habit Categories
Track your life in multiple styles:
- **Daily Habits**: Standard routines that reset each morning.
- **Weekly Habits**: Long-term tasks to accomplish by Sunday.
- **One-off Tasks**: Quick target objectives added directly to a specific period.
- **Anti-Tasks (Negative Reinforcement)**: 
  - *Checked by default* at the start of each period.
  - You uncheck them if you perform the undesired action (e.g., "Sweets", "Procrastination"). This lets you track slip-ups without ruining standard completion streaks.

### 2. Multiplicity (Sub-Tasks)
- Set a frequency threshold from **1 to 5** when creating or editing a habit.
- Displays elegant tiny sub-checkbox bubbles next to the habit name on the dashboard.
- **Smart Completion Logic**:
  - Checking the overall task checks all sub-tasks instantly.
  - Toggling sub-tasks incrementally updates progress.
  - Checking all sub-tasks automatically completes the parent task.
  - Only fully-completed habits count toward your ratio and earn progress marks.

### 3. Static Custom Reordering
- Enter **Reorder Mode** to prioritize your dashboard.
- Seamless drag-and-drop sorting powered by `motion` layout animations.
- **Smart Order Preservation**: During normal usage, checked tasks temporarily slide to the end of your list to clean up the screen. However, Dailio remembers your custom *static layout order* so that when habits reset for the next day, they reappear in your exact preferred sequence.

### 4. Interactive Calendar Heatmap
- A comprehensive monthly overview illustrating completion consistency.
- **Dynamic Coding Grid**:
  - **🟩 Green**: 100% completion (all daily tasks accomplished).
  - **🟨 Amber**: Met your custom daily done/to-do objective ratio (e.g., 70% complete).
  - **🟥 Red**: Incomplete day falling below target goals.
  - **⬜ Grey/Translucent**: Days outside the current month boundaries or marked absent.
- **Absent Toggle**: Mark specific days as vacation or sick days to gracefully pause tracking and preserve your long-term streak consistency.
- **Correct Calendar Boundaries**: The calendar accounts for precise day offsets (weeks start on Monday) and accurately colors past-month boundary dates from any active calendar viewport.

### 5. Detailed Analytics & Charts
- Beautiful, clear trend lines representing completion ratios.
- Quick stats showcasing your streaks, completion percentages, and overall ratio improvements.

---

## 🏗️ Technical Architecture

Dailio uses a highly modular and extensible architecture:

```
src/
├── providers/
│   ├── AppProvider.tsx            # Context unifying Auth & Data layers
│   ├── FirebaseAuthProvider.ts    # Firebase Authentication connector
│   ├── FirestoreDataProvider.ts   # Remote database Firestore backend
│   ├── LocalAuthProvider.ts       # Offline localStorage auth simulator
│   └── LocalDataProvider.ts       # Offline localStorage persistence
├── pages/
│   ├── Today.tsx                  # Dashboard with reordering, checking & modals
│   ├── Calendar.tsx               # Grid of completion heatmaps & past edits
│   ├── Statistics.tsx             # Interactive charts & habit metrics
│   └── Settings.tsx               # Categories, ratio thresholds & reset controls
├── components/
│   ├── Layout.tsx                 # Navigation bar and global responsive structure
│   └── Modal.tsx                  # Focus-locked dialogs with custom blurred overlays
├── utils/
│   ├── dateUtils.ts               # Date calculation utilities (daily/weekly keys)
│   └── habitLogic.ts              # Core state formulas for completion metrics
└── types.ts                       # Strong TypeScript schemas for habits & period logs
```

### Dual-Layer Storage Support
Dailio is architected to operate in two environments:
1. **Cloud Mode**: Dynamically connects to **Firebase Auth** and **Firestore** to provide cross-device synchronization and secure real-time data persistence.
2. **Offline Mode**: Gracefully falls back to high-speed **Local Storage** if cloud credentials are not active, offering a private, local-only developer environment.

---

## 🚀 Getting Started

### 📦 Prerequisites
- Node.js (version 18 or higher is recommended)
- npm or yarn

### ⚙️ Installation & Running
1. Clone or extract the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Boot the local development server:
   ```bash
   npm run dev
   ```
   *The dev server will spin up on port 3000.*

4. Build for production:
   ```bash
   npm run build
   ```
   *The static build files will output in the `/dist` directory.*

---

## 🛠️ Built With
- **Vite** — High-speed bundler & dev runner.
- **React** — Declarative UI composition.
- **Tailwind CSS** — Modern, utility-first UI styling.
- **Lucide React** — Minimalist stroke vector icons.
- **Motion** — High-fidelity layout and transition animations.
