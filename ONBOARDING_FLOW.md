# Fore Genomics Parent Portal - Onboarding Flow Overview

## Entry Points

1. **Standard Onboarding** (`/onboarding`) - For new users with an order
2. **Parent Invitation Onboarding** (`/onboarding/parent-invitation`) - For parents invited by someone else (e.g., grandparent bought a test for their grandchild)

## User Roles

- **PARENT** - The biological parent/guardian providing consent
- **PURCHASER** - Someone who bought the kit for someone else's child

---

## Step-by-Step Flow

### Step 1: User Information (`UserInfoStep`)

**Purpose:** Collect parent/guardian contact information for shipping

**Fields:**

| Field          | Type     | Required | Notes                           |
| -------------- | -------- | -------- | ------------------------------- |
| Email          | Text     | Yes      | Pre-filled from auth, read-only |
| First Name     | Text     | Yes      |                                 |
| Last Name      | Text     | Yes      |                                 |
| Street Address | Text     | Yes      |                                 |
| Address Line 2 | Text     | No       | Optional                        |
| City           | Text     | Yes      |                                 |
| State          | Dropdown | Yes      | US states only (50 states)      |
| ZIP Code       | Text     | Yes      |                                 |
| Phone Number   | Phone    | Yes      | US phone input with formatting  |

---

### Step 1.5: Kit Selection (`KitSelectionStep`)

**Purpose:** For multi-kit orders, select which kit to complete onboarding for

**Only shows when:** Order has multiple kits with pending onboarding

---

### Step 2: Child Information (`ChildInfoStep`)

**Purpose:** Collect child's demographic information

**Conditional Logic:**

- If "Child is not yet born" is checked → Different form fields shown
- If "Relationship to Child" = "Other" → Triggers parent invitation flow

**Fields (Born Child):**

| Field                 | Type         | Required    | Options                                                                                         |
| --------------------- | ------------ | ----------- | ----------------------------------------------------------------------------------------------- |
| Child is not yet born | Checkbox     | No          | Toggles form mode                                                                               |
| Child's First Name    | Text         | Yes         |                                                                                                 |
| Child's Last Name     | Text         | Yes         |                                                                                                 |
| Date of Birth         | Date         | Yes         | Cannot be in future                                                                             |
| Sex                   | Radio        | No          | Male / Female                                                                                   |
| Ethnicity             | Multi-Select | Yes         | Hispanic/Latino, White, Black/African American, Asian, Native American, Pacific Islander, Other |
| Ethnicity (Other)     | Text         | Conditional | Shows if "Other" selected                                                                       |
| Relationship to Child | Dropdown     | Yes         | Mother, Father, Guardian, Other                                                                 |

**Fields (Unborn Child):**

| Field    | Type | Required                |
| -------- | ---- | ----------------------- |
| Due Date | Date | Yes (must be in future) |

**Special Flows:**

1. **Parent Invitation Flow:** If relationship = "Other", shows form to invite the actual parent/guardian:
   - Parent/Guardian's Full Name (required)
   - Parent/Guardian's Email Address (required)

2. **Unborn Child Flow:** If checkbox is selected, skips consent & questionnaire, goes to special confirmation

---

### Step 3: Consent (`ConsentStep`)

**Purpose:** Legal consent for genetic testing

**Consent Document Structure:**

#### PART 1: Informed Consent to Fore Genomics Services (~10 clauses)

- Must scroll to bottom to enable checkbox
- Covers:
  - Definition of Fore Genomics and Collaborators
  - Electronic delivery of agreements and data
  - Facsimile/electronic signatures
  - Permission to contact designated persons
  - Genetic counseling and DNA storage services
  - Data handling in accordance with form selections
  - Genome data storage policies
  - No express/implied warranty on results
  - Liability waiver and indemnification
  - California law governance, JAMS arbitration, class action waiver

#### PART 2: Informed Consent for Genetic Testing

- Must scroll to bottom to enable checkbox
- Covers:
  - What whole genome sequencing (WGS) is
  - How testing is performed (buccal swab sample)
  - Benefits and possible results:
    - Positive results (diagnosis, predisposition, family implications)
    - Negative results (reduced but not eliminated risk)
    - Uncertain significance results
    - Family relationship discoveries
  - Secondary (incidental) findings per ACMG guidelines
  - Risks and limitations of testing
  - How results are delivered
  - Who to speak to about results
  - Data and sample handling
  - Privacy and de-identification practices

#### PART 3: Informed Consent for Telehealth Services

- Must scroll to bottom to enable checkbox
- Covers:
  - Telehealth service description (AMG Medical Group, DNA Ally)
  - Types of electronic transmissions
  - Expected benefits
  - Service limitations (not for emergencies)
  - Security measures (HIPAA compliance)
  - Possible risks
  - Patient acknowledgments (25 items)
  - State-specific notices: Iowa, Idaho, Indiana, Kentucky, Maine, Oklahoma, Texas, Vermont

**Signature Section Fields:**

| Field                 | Type          | Required | Notes                                                               |
| --------------------- | ------------- | -------- | ------------------------------------------------------------------- |
| Name                  | Text          | Yes      | Pre-filled from user info, read-only                                |
| Date                  | Date          | Yes      | Defaults to today                                                   |
| Relationship to Child | Text          | Yes      | Pre-filled from child info, read-only                               |
| Child's Full Name     | Text          | Yes      | Pre-filled from child info, read-only                               |
| Child's Date of Birth | Date          | Yes      | Pre-filled from child info, read-only                               |
| Agreement Checkbox    | Checkbox      | Yes      | "I agree to the terms and conditions specified in Parts 1, 2 and 3" |
| Electronic Signature  | Signature Pad | Yes      | Canvas-based drawing                                                |

---

### Step 4: Questionnaire (`QuestionnaireStep`)

**Purpose:** Collect medical history for genetic counseling context

**Title:** "Development & Family History Questionnaire"

**Questions:**

| #   | Question                                                       | Type         | Follow-up                          |
| --- | -------------------------------------------------------------- | ------------ | ---------------------------------- |
| 1   | Has your child met all major developmental milestones on time? | Yes/No Radio | If **No** → Text area for details  |
| 2   | Is there a family history of genetic conditions?               | Yes/No Radio | If **Yes** → Text area for details |
| 3   | Has your child ever been hospitalized?                         | Yes/No Radio | If **Yes** → Text area for details |

---

### Step 5: Confirmation (`ConfirmationStep`)

**Purpose:** Success message and next steps

**Content:**

- Success icon (green checkmark)
- Heading: "Onboarding Complete - Your Journey Begins"
- Description of dashboard access

**"What's Next?" section:**

- Review your profile to ensure details are correct
- Check the status of your order
- Once your report is ready, schedule your genetic counseling appointment

**Action:** "Go to My Dashboard" button

---

## Special Confirmation Flows

### Invitation Confirmation (`InvitationConfirmationStep`)

- Shown when purchaser invited another guardian to complete consent
- May prompt to continue onboarding if multiple kits remain in the order

### Unborn Child Confirmation (`UnbornChildConfirmationStep`)

- Shown when child is not yet born (only due date provided)
- Explains that onboarding will resume after birth
- Shows the due date and next steps
- Option to continue onboarding for other kits if applicable

---

## Multi-Kit Orders

For orders with multiple kits:

- Uses `MultiKitOnboardingForm` component
- Consolidates all kits into a single-page form experience
- User info captured once at the top
- Child info, consent, and questionnaire repeated per kit
- Streamlined flow reduces total steps

---

## Post-Onboarding Dashboard

**Three dashboard variants based on user state:**

1. **DashboardContent** - Standard parent view showing order status, child info, report access
2. **PurchaserDashboard** - For purchasers who bought kits for others, shows all orders and their statuses
3. **UnbornChildDashboard** - Shows pending status with due date countdown, waiting for birth to continue

---

## Order Status Flow

```
ORDER_RECEIVED → ONBOARDING_COMPLETED → PREPARING_ORDER → SHIPPED_TO_USER →
DELIVERED_AWAITING_RETURN → SHIPPED_TO_LAB → RECEIVED_IN_PROCESS →
COMPLETE_REPORT_DELIVERED
```

Special status: `COMPLETE_COUNSELING_REQUIRED` - Triggers counseling scheduling flow

---

## Technical Implementation Details

### Key Components

| Component                   | File Path                                                   |
| --------------------------- | ----------------------------------------------------------- |
| OnboardingWizard            | `src/components/OnboardingWizard.tsx`                       |
| UserInfoStep                | `src/components/onboarding/UserInfoStep.tsx`                |
| ChildInfoStep               | `src/components/onboarding/ChildInfoStep.tsx`               |
| ConsentStep                 | `src/components/onboarding/ConsentStep.tsx`                 |
| QuestionnaireStep           | `src/components/onboarding/QuestionnaireStep.tsx`           |
| ConfirmationStep            | `src/components/onboarding/ConfirmationStep.tsx`            |
| KitSelectionStep            | `src/components/onboarding/KitSelectionStep.tsx`            |
| MultiKitOnboardingForm      | `src/components/onboarding/MultiKitOnboardingForm.tsx`      |
| InvitationConfirmationStep  | `src/components/onboarding/InvitationConfirmationStep.tsx`  |
| UnbornChildConfirmationStep | `src/components/onboarding/UnbornChildConfirmationStep.tsx` |

### Form Validation

- Uses `react-hook-form` with `zod` schemas
- Real-time validation with watch() for button enablement
- Consent checkboxes require scroll-to-bottom before enabling

### Current Responsive Handling

- Tailwind breakpoints: `sm:` (640px+), `lg:` (1024px+)
- Custom CSS classes: `container-mobile`, `container-tablet`, `container-desktop`
- Utility classes: `mobile-padding`, `mobile-spacing`
- Font scaling: `text-sm sm:text-base`
- Button padding: `py-3 sm:py-4`

---

## Mobile Redesign Considerations

### Pain Points for Mobile UX

1. **Consent Step Complexity**
   - 3 long scrollable sections with scroll-to-enable checkboxes
   - Dense legal text difficult to read on small screens
   - Users must scroll each section completely

2. **Signature Pad**
   - Canvas-based drawing requires horizontal space
   - Small touch targets on mobile
   - Current width: 350px fixed

3. **Multi-Select Ethnicity**
   - Dropdown may be difficult to use on mobile
   - Multiple selections need clear visual feedback

4. **Date Pickers**
   - Native date inputs vary significantly by device/browser
   - May want custom mobile-optimized date selection

5. **Phone Number Input**
   - Uses `react-phone-number-input` component
   - Auto-formatting may conflict with mobile keyboards

6. **Long Forms**
   - User info has 8+ fields on single page
   - Child info can have 7+ fields
   - No progress save between steps (only on final submission)

### Recommended Mobile Improvements

1. Break long forms into smaller sub-steps
2. Use full-width signature pad on mobile
3. Replace scroll-to-enable with explicit "I have read" confirmation
4. Add progress persistence (save draft on each step)
5. Optimize touch targets (min 44px)
6. Consider native-feeling date/select inputs
7. Add clear step indicators and back navigation
8. Reduce cognitive load with progressive disclosure
