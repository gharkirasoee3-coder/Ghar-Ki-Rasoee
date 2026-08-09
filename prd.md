📄 PRODUCT REQUIREMENTS DOCUMENT (PRD)
🍱 GHAR KI RASOEE – Tiffin & Meal Subscription Platform
1. PRODUCT OVERVIEW
1.1 Product Name

GHAR KI RASOEE

1.2 Product Vision

To provide fresh, home-style Indian meals with predictable quality, transparent pricing, and reliable delivery, using a subscription-first digital platform for Indian households in Canada.

1.3 Problem Statement

Indian families, students, and working professionals in Canada face:

Inconsistent quality from cloud kitchens

Expensive restaurant food

No reliable long-term meal subscriptions

Poor communication on delivery & status

1.4 Solution

A web-based meal subscription platform offering:

One-time, weekly, and monthly plans

Fixed menus with controlled customization

Free delivery

Transparent pricing

WhatsApp + dashboard tracking

Admin-controlled operations

2. TARGET USERS & PERSONAS
2.1 Customer Personas
🎓 Student

Needs affordable daily food

Prefers monthly plans

Wants predictable meals

👩‍💼 Working Professional

Needs hassle-free lunch/dinner

Uses weekly plans

Values punctual delivery

👨‍👩‍👧 Family

Wants ghar-style food

Uses premium monthly plans

Prefers customization clarity

2.2 Internal Users
Role	Description
Admin	Full system control
Kitchen Staff	View daily orders
Delivery Staff (Future)	Delivery list access
3. SCOPE & GOALS
3.1 Business Goals

Serve 1000 active users in first phase

Achieve 70% subscription retention

Reduce manual coordination by 80%

Prepare system for franchise scaling

3.2 Product Goals

Simple ordering

Zero confusion pricing

Minimal customer support dependency

Operational efficiency

4. FUNCTIONAL REQUIREMENTS
4.1 USER AUTHENTICATION
Features

Login / Register

Firebase authentication

Persistent session

Acceptance Criteria

Users stay logged in across sessions

Backend user auto-created on first login

Role-based access applied

4.2 MENU MANAGEMENT
Features

Weekly & monthly menu display

Plans:

Basic ($150)

Standard ($190)

Premium ($220)

Day-wise sabzi

Rules

Menu visible publicly

Editable by admin

No off-menu selection

4.3 ORDER MANAGEMENT
Order Types
Type	Price
One-time	$13
Weekly	$60
Monthly	$150 / $190 / $220
Customization Rules

Allowed

Remove items

Extra roti ($0.60)

Extra sweet ($3)

Extra raita ($2)

Not Allowed

Off-menu demands without approval

Acceptance Criteria

System enforces pricing rules

UI prevents invalid selections

Backend validates all orders

4.4 SUBSCRIPTION MANAGEMENT
Features

Monthly & weekly subscriptions

Pause / resume

Auto daily order generation

Rules

Sunday optional/off

Monday–Saturday delivery

Auto end-date adjustment on pause

4.5 DELIVERY & TRACKING
Status Flow

Order Confirmed

Cooking

Out for Delivery

Delivered

Updates

Website dashboard

WhatsApp message

4.6 PAYMENT SYSTEM (CANADA)
Payment Methods

Stripe (Card – CAD)

Interac e-Transfer

Cash on Delivery

Rules

Prices tax-inclusive

Payment recorded per order

COD allowed

4.7 USER DASHBOARD
Features

Active order

Order history

Subscription status

Pause / resume

Profile management

4.8 ADMIN PANEL
Features

Orders overview

Status updates

Subscription management

Menu editing

User list

Daily delivery list

5. NON-FUNCTIONAL REQUIREMENTS
5.1 Performance

Page load < 2s

API response < 500ms

Handle 1000 concurrent users

5.2 Security

Firebase Auth

Role-based access

Secure Stripe integration

No client-side trust

5.3 Scalability

Horizontal backend scaling

Firestore indexed queries

Modular frontend

5.4 Availability

99.5% uptime

Graceful failure handling

6. TECH STACK (FINAL)
Frontend

Vite

React + TypeScript

Tailwind CSS

Firebase Auth

Stripe React SDK

Backend

Node.js

Express

Firebase Admin SDK

Stripe SDK

Database

Firebase Firestore

7. DATA MODELS (HIGH LEVEL)
User

id

name

phone

address

role

Order

orderId

userId

plan

price

status

deliveryDate

Subscription

startDate

endDate

active

paused

8. USER FLOWS
Customer Flow
Home → Menu → Order → Checkout → Dashboard → Tracking

Admin Flow
Login → Orders → Status Update → WhatsApp Notify

9. OUT-OF-SCOPE (PHASE 1)

❌ Mobile apps
❌ AI recommendations
❌ Delivery routing optimization
❌ Loyalty points

10. FUTURE ROADMAP
Phase 2

Mobile app

Automated WhatsApp

Referral system

Phase 3

Franchise support

Kitchen analytics

AI demand forecasting

11. SUCCESS METRICS (KPIs)
Metric	Target
Daily active users	300+
Subscription retention	70%
Failed orders	<1%
Support tickets	<5/day
12. RISKS & MITIGATION
Risk	Mitigation
Payment failures	Retry & COD
Delivery delays	Status transparency
Over-customization	Hard UI rules
Scaling issues	Firebase infra
13. APPROVAL & SIGN-OFF

Product Owner: GHAR KI RASOEE
Version: 1.0
Status: Ready for Development & Investment Review