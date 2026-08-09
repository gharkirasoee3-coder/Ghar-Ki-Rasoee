# GHAR KI RASOEE - Frontend Implementation Checklist

Derived from `prd.md` (Features) and `design.md` (Visual Style).

## 1. Project Setup (Foundation)

- [ ] **Initialize Project**
  - [ ] Create Vite + React + TypeScript project.
  - [ ] Install dependencies: `tailwindcss`, `firebase`, `react-router-dom`, `lucide-react` (icons), `framer-motion` (animations), `@stripe/react-stripe-js`.
- [ ] **Design System Configuration (from `design.md`)**
  - [ ] Configure Tailwind Theme:
    - [ ] Primary Color: `#CB202D` (Zomato Red).
    - [ ] Background: `#FFFFFF` (White), `#F8F8F8` (Off-white accents).
    - [ ] Text: `#1C1C1C` (Charcoal), `#696969` (Dim Gray).
    - [ ] Font: Inter (Regular & Semi-bold).
    - [ ] Border Radius: `12px` - `16px`.
  - [ ] Create global CSS for "Glassmorphism" utilities.

## 2. Authentication (PRD 4.1)

- [ ] **Auth Context & Protected Routes**
  - [ ] Implement `AuthContext` with Firebase.
  - [ ] Create `ProtectedRoute` component.
- [ ] **Login / Register Pages**
  - [ ] Layout: Split screen (Food image + Form).
  - [ ] Phone/Email Sign-in form.
  - [ ] Auto-redirect to Dashboard/Home on success.

## 3. Home Page (The Hook) (Design 3.1 - 3.3)

- [ ] **Hero Section**
  - [ ] Full-width immersive background image (Home-style food).
  - [ ] Glassmorphism Search Bar / CTA ("Order Now").
  - [ ] Value Prop Text: "Find the best food & drinks in [City]".
- [ ] **"Inspiration" Section (Menu Preview)**
  - [ ] Horizontal scrolling circles/tiles for distinct items (e.g., "Thali", "Paratha").
  - [ ] Use high-quality macro images.
- [ ] **"Collections" (Plans Overview)**
  - [ ] Vertical cards for Plans: Basic ($150), Standard ($190), Premium ($220).
  - [ ] Gradient overlay for text readability.

## 4. Menu Page (PRD 4.2)

- [ ] **Tab Navigation**
  - [ ] Tabs: Monthly Menu | Weekly Menu | One-Time.
- [ ] **Menu Grid**
  - [ ] **Day Cards**: Display Sabzi/Roti options for Mon-Sat.
  - [ ] **Visual Style**: 4:3 Aspect ratio images, shadow hover effect (Design 3.4).
  - [ ] **Smart Filters**: Pill filters for "Vegetarian", "Sweet included", etc.

## 5. Order & Cart Flow (PRD 4.3)

- [ ] **Item Details Modal**
  - [ ] "Quick View" on card click.
  - [ ] Customization Options: Extra Roti (+$0.60), Extra Sweet (+$3).
- [ ] **Cart Sidenav / Page**
  - [ ] Breakdown of selected plan + extras.
  - [ ] Tax verification.
- [ ] **Checkout Page (PRD 4.6)**
  - [ ] Form: Delivery Address & Phone.
  - [ ] Payment Options: Stripe (Card), Interac (Manual), COD.
  - [ ] **Stripe Elements** integration for secure card entry.

## 6. User Dashboard (PRD 4.7)

- [ ] **Overview Tab**
  - [ ] "Active Order" card with Status Tracking (Confirmed -> Cooking -> Out -> Delivered).
- [ ] **Subscription Management**
  - [ ] Toggle switch for **Pause / Resume**.
  - [ ] Calendar view showing remaining days.
- [ ] **Order History**
  - [ ] List of past transactions with status badges (Green/Red).

## 7. Admin Panel (PRD 4.8)

_Note: Simplified layout, focused on utility._

- [ ] **Orders Dashboard**
  - [ ] Table view of daily orders.
  - [ ] **Status Updater**: Dropdown to change order status (Triggers DB update).
- [ ] **Menu Manager**
  - [ ] Form to update Sabzi/Rotis for specific dates.
- [ ] **Subscription View**
  - [ ] List of active subscribers with End Dates.

## 8. Integrations & Logic

- [ ] **API Service Layer**
  - [ ] Connect Frontend to Backend endpoints (`/api/orders`, `/api/menu`, etc.).
- [ ] **Real-time Updates**
  - [ ] Listen to Firestore changes for Order Status updates.
