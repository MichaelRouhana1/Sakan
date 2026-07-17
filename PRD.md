# Product Requirement Document (PRD)

## Project Name: Sakan Lebanon (Working Title) — Version 1.0

### 1. Document Overview & Objective

The goal is to build a lightweight, highly localized classifieds directory mobile application that connects residential renters and student renters with landlords, dorm operators, and real estate brokers in Lebanon.

The app serves strictly as a matchmaking bridge. The platform does not handle lease agreements, secure security deposits, process rental payments, or mediate tenant disputes.

- **Monetization:** Pay-per-post for commercial entities/brokers (after an initial free listing allowance) and a premium "boost" credit tier for all property posters.
    
- **Target Audience:** General renters and university students in Lebanon (free access); residential landlords, dorm owners, and real estate brokers (paid access).
    

### 2. User Personas & Roles

To maintain product simplicity at launch, users must select a single, mutually exclusive role during registration.

- **Renter (General & Student):** Browses, filters, and saves listings for free. Can toggle between standard city searches and student-centric university location views. Connects directly with posters via phone or WhatsApp.
    
- **Landlord / Poster:** Purchases posting credits, creates property listings, selects target audiences, and manages active/expired posts via a personal dashboard.
    

### 3. Core Feature Requirements

#### 3.1 User Authentication & Onboarding

- **Sign-Up/Login Method:** Mobile phone number verification via WhatsApp OTP (preferred due to standard SMS carrier delivery failures in Lebanon) or standard SMS OTP as a fallback.
    
- **Role Gate:** Immediately after phone verification, the user must select: "I am looking for a place" OR "I am listing a place." This choice dictates their entire navigation experience.
    
- **Landlord Tech-Illiteracy Support:** To accommodate older or less tech-savvy landlords, the system must support a "WhatsApp Bridge" where posters can submit details manually via WhatsApp, allowing the admin team to create and manage accounts via the backend panel.
    

#### 3.2 The Renter Experience (The Buyer Side)

- **Dual Search Architecture:** The home screen features a prominent, easy-to-use toggle at the top of the interface:
    
    - **Standard Mode (Default):** A location selector based on Lebanese districts and cities (e.g., Achrafieh, Mar Mikhael, Jounieh, Tripoli, Saida). Results default to sorting by newest or lowest price.
        
    - **University Hub Mode:** A student-centric mode where the user selects a specific university campus (e.g., AUB, LAU Jbeil, USJ Huvelin, LU Fanar). The feed instantly reorganizes to display listings ordered by closest linear distance to that specific campus gate.
        
- **Lebanese Utility Badges:** Every listing card must visually display status badges for critical Lebanese infrastructure metrics:
    
    - **Electricity:** Solar Power ☀️ | 24/7 Generator (Ishtirak Included) ⚡ | Scheduled Cuts 🔌.
        
    - **Water:** 24/7 State/Well Water 💧 | Tank Delivery Required 🚛.
        
    - **Internet:** Wi-Fi Included 🌐 | Router UPS Backup Enabled 🔋 (stays on during outages).
        
    - **Building Infrastructure:** 24/7 Working Elevator 🛗.
        
- **Direct Connect Button:** A prominent action button on every listing detail page. Tapping it triggers a deep-link directly into a native WhatsApp chat with the poster containing a pre-filled template message: _"Hi, I saw your listing for the [Property Type] in [Area] on [App Name]. Is it still available?"_
    
- **Listing Integrity Systems:**
    
    - A prominent **"Report Listing"** button on every post allowing users to flag "Fake", "Inaccurate Utilities", or "Already Rented" properties.
        
    - An automated system to flag or restrict accounts that receive high volumes of user reports (aimed at spammy brokers or phantom listings).
        

#### 3.3 The Landlord / Poster Experience (The Seller Side)

- **Simple Post Creation Form:** A single-page step-by-step form requiring:
    
    - **Target Audience Toggle:** `[ ] Open to anyone` / `[ ] Students Only (Dorm/Shared Student Space)`
        
    - **Listing Type:** (Entire Apartment, Studio, Private Room, Shared Dorm Bed)
        
    - **Monthly Rent:** (Strictly enforced numerical input field, explicitly labeled in Fresh USD)
        
    - **Lebanese Utility Checklist:** (Checkboxes mapping directly to the Renter search badges)
        
    - **Map Pin Drop / Landmark Selector:** Landlords drop a pin to automatically capture Latitude/Longitude for university proximity indexing. To avoid map disorganization or GPS confusion, landlords can alternative choose/verify their location via pre-set landmark neighborhood dropdowns (e.g., "Near Sasine Square").
        
    - **Photo Uploads:** (Minimum 1, Maximum 8 compressed images).
        
- **Listing Management Dashboard:** A screen showing the poster their active listings, total view counts, remaining days until automatic expiration, and any pending draft posts saved during the payment drop-off window.
    
- **Verification Protection Policy:** When checking premium infrastructure boxes (like 24/7 Solar), posters are shown an explicit in-app legal disclaimer: _"Inaccurate utility claims will result in your post being permanently removed without a refund."_
    

### 4. Monetization & Payment Workflows

#### 4.1 The Credit/Token System

The backend tracks a simple balance integer for every Poster account called "Credits."

- **1 Post Credit** = Allows 1 standard listing to go live on the platform for exactly 30 days.
    
- **1 Boost Credit** = Pins an active listing to the top of its respective City or University Hub search feed for 7 consecutive days.
    
- **Note:** New accounts receive 1 free Post Credit upon registration to stimulate initial database supply (limited strictly to 1 free post per unique phone number to prevent broker spam).
    

#### 4.2 Local Cash Payment Integration

Because online payment gateways experience high friction and low adoption for local business operations in Lebanon, the app will deploy a hybrid manual-to-digital system to process monetization:

**1.Landlord Initiates Purchase:**In-App.

Poster selects a credit bundle (e.g., "$15 for 5 Credits" or "$10 Starter Bundle") inside their account dashboard and taps "Pay via Whish/OMT."

**2.Reference Generation:**In-App.

The app generates a unique Transaction Reference ID, saves the transaction as "Pending Payment", and displays a "Send to WhatsApp Support" call-to-action button.

**3.Cash Transfer & Verification:**Physical to WhatsApp.

The poster sends the cash amount via any physical Whish Money or OMT branch to the platform's official business wallet, then sends a photo of the receipt alongside their unique Reference ID to the app's support chat. Automated WhatsApp reminders are sent if a pending transaction drops off before completion.

**4.Credit Allocation:**Backend Admin Panel.

The administrator verifies the incoming cash transfer via their Whish/OMT corporate terminal and clicks "Approve" in the backend admin console, instantly allocating the digital credits to the poster's account.

### 5. Technical Requirements & Edge Cases

#### 5.1 Listing Expiration & Data Maintenance

To prevent user frustration from stale, already-rented listings left on the platform:

- All active posts carry a hard **30-day expiration timer**.
    
- At day 25, the poster receives an automated push notification / WhatsApp message: _"Is your property still available? Tap to renew for another 30 days."_
    
- If unrenewed by day 30, the listing automatically switches to an "Archived" state and is hidden from all public search feeds.
    

#### 5.2 Distance Calculations

- The system will maintain a static, pre-populated database table storing the exact Latitude and Longitude coordinates of major Lebanese university campus gates.
    
- When a user activates the University Hub mode, the backend calculates the Haversine distance between the landlord's dropped pin and the chosen campus coordinates, returning the distance in meters or kilometers.
    

### 6. Out of Scope (Version 1.0)

The following features are strictly excluded from the initial release to maximize speed-to-market and lower initial development costs:

- In-app roommate matching or social discovery notice boards.
    
- In-app messaging/chat infrastructure (delegated entirely to native phone calls and WhatsApp).
    
- Direct online credit card processing or international payment gateway integrations.
