# Multi-Kit Onboarding Refactor Implementation Plan

## Overview
Refactor the current complex multi-kit onboarding flow to implement a multi-panel form pattern where each kit's onboarding forms are grouped together, providing better context and progress tracking than a traditional wizard.

## Current State Analysis

### Problems with Existing Implementation
1. **Complex State Management**: Conditional step logic, kit selection state, multiple navigation paths
2. **Data Model Confusion**: Unclear relationships between Child, Kit, Consent, and Questionnaire
3. **User Experience Fragmentation**: Users must complete onboarding multiple times with repetitive steps
4. **Inconsistent Flow**: Variable step counts and navigation patterns

### Current Data Relationships
- **Order** → **Multiple Kits** (1:many)
- **Kit** → **Child** (1:1) 
- **Kit** → **Consent** (1:1)
- **Kit** → **Questionnaire** (1:1)

## New Design Requirements

### Business Rules
1. **Kit count = Child count** (1:1 relationship)
2. **Parents add all children upfront** (matching kit count)
3. **Parents choose which child gets which kit** (important for different kit types)
4. **Parent completes onboarding for each child/kit** (consent + questionnaire)
5. **No editing after completion** (data integrity)

### User Flow
1. **Parent Information** (once)
2. **Multi-Kit Form**: All kits displayed with grouped forms
   - **Kit 1 Panel**: Child info + Consent + Questionnaire (all visible)
   - **Kit 2 Panel**: Child info + Consent + Questionnaire (all visible)
   - **Kit 3 Panel**: Child info + Consent + Questionnaire (all visible)
3. **Complete All Kits**

### Progress Display
- **Kit Progress**: Visual tabs/sections showing [Kit 1 ✓] [Kit 2 🔄] [Kit 3 ⏳]
- **Kit Context**: "Kit X of Y: [Kit Type]" header for each panel
- **Child Association**: "Child: [Name]" displayed within each kit panel
- **Overall Progress**: "X of Y kits completed" indicator

## Implementation Plan

### Phase 1: Core Architecture Refactor

#### 1.1 Create MultiKitOnboardingForm.tsx
- **New component for multi-kit orders**
  - Replace complex wizard logic with panel-based form
  - Group all kit forms together on one page
  - Implement tab/section navigation between kits

- **State structure for multi-panel approach**
  ```typescript
  const [kits, setKits] = React.useState<Kit[]>([]);
  const [activeKitIndex, setActiveKitIndex] = React.useState(0);
  const [childrenData, setChildrenData] = React.useState<ChildData[]>([]);
  const [completedKits, setCompletedKits] = React.useState<Set<string>>(new Set());
  ```

- **No step calculation needed**
  - Single page with multiple panels
  - Visual progress indicators instead of step numbers

#### 1.2 Update Step Components
- **ChildInfoStep**: Adapt for panel display, add kit context
- **ConsentStep**: Adapt for panel display, kit-specific consent handling
- **QuestionnaireStep**: Adapt for panel display, kit-specific questionnaire handling
- **Create KitPanel component**: Wrapper for each kit's forms

### Phase 2: Kit Panel Management

#### 2.1 Kit Navigation
- **Tab/section navigation**: Click between kit panels
- **Visual progress indicators**: Show completion status per kit
- **Flexible completion order**: Complete kits in any order

#### 2.2 Data Persistence
- **Store child data per kit** as forms are filled out
- **Real-time validation** within each kit panel
- **Submit all data together** when completing onboarding

### Phase 3: Progress Tracking & UI

#### 3.1 Kit Progress Indicators
- **Visual tabs/sections**: [Kit 1 ✓] [Kit 2 🔄] [Kit 3 ⏳]
- **Completion status**: Show checkmarks for completed kits
- **Overall progress**: "X of Y kits completed" summary

#### 3.2 Panel Headers
- **Kit context**: "Kit 1 of 3: BASE Kit"
- **Child association**: "Child: [Name]" when child info is entered
- **Form sections**: Grouped Child Info, Consent, and Questionnaire forms

## Technical Implementation Details

### State Management
```typescript
interface ChildData {
  kitId: string;
  childInfo: ChildInfo;
  consentAccepted: boolean;
  consentData: any;
  questionnaire: any;
}

interface Kit {
  id: string;
  kitNumber: number;
  kitType: string;
  status: string;
  childId: string | null;
  consentId: string | null;
  questionnaireId: string | null;
}
```

### Panel Structure
```typescript
// Single page with multiple panels
// Panel 1: Kit 1 (Child Info + Consent + Questionnaire)
// Panel 2: Kit 2 (Child Info + Consent + Questionnaire)  
// Panel 3: Kit 3 (Child Info + Consent + Questionnaire)
// All forms visible within each panel
```

### API Integration
- **Maintain existing API endpoints**
- **Submit all kit data together** when completing onboarding
- **Track completion status** per kit for progress indicators
- **Real-time validation** within each kit panel

## Migration Strategy

### 1. Feature Flag Integration
- **Keep existing feature flag** `NEXT_PUBLIC_ENABLE_MULTI_KIT_ORDERS`
- **Implement new flow** when flag is enabled
- **Fallback to existing logic** when flag is disabled

### 2. Data Compatibility
- **Maintain existing database schema**
- **Preserve existing API contracts**
- **Ensure backward compatibility** for single-kit orders

### 3. Testing Approach
- **Unit tests** for new state management logic
- **Integration tests** for multi-kit flow
- **User acceptance testing** for new UX

## Success Criteria

### Functional Requirements
- [ ] Multi-panel form layout with all kit forms visible
- [ ] Clear kit context display throughout onboarding
- [ ] Visual progress tracking across multiple kits
- [ ] Data persistence per kit during form completion
- [ ] No editing of completed kit data
- [ ] Flexible completion order (kits can be completed in any order)

### User Experience Requirements
- [ ] Intuitive navigation between kit panels
- [ ] Clear understanding of current progress and completion status
- [ ] Reduced cognitive load compared to existing implementation
- [ ] Consistent form layout across all kit panels
- [ ] Visual feedback for completed vs. pending kits

### Technical Requirements
- [ ] Simplified state management
- [ ] Maintainable code structure
- [ ] Feature flag compatibility
- [ ] Backward compatibility for single-kit orders

## Risk Mitigation

### 1. Data Loss Prevention
- **Validate data integrity** at each step
- **Implement proper error handling** for API failures
- **Maintain rollback capability** to previous implementation

### 2. User Experience
- **Clear progress indicators** to prevent confusion
- **Consistent navigation patterns** across all steps
- **Proper error messaging** for validation failures

### 3. Performance
- **Optimize state updates** to prevent unnecessary re-renders
- **Efficient data fetching** for kit information
- **Minimize API calls** during onboarding flow

## Timeline Estimate

### Week 1: Core Architecture
- Create MultiKitOnboardingForm component
- Implement panel-based layout structure
- Basic kit navigation and state management

### Week 2: Form Integration
- Adapt existing step components for panel display
- Create KitPanel wrapper component
- Implement form validation within panels

### Week 3: Progress Tracking & UI
- Implement visual progress indicators
- Add kit completion status tracking
- Create tab/section navigation between kits

### Week 4: Testing & Polish
- Feature flag integration
- Testing and bug fixes
- Documentation updates

## Next Steps

1. **Review and approve** this implementation plan
2. **Begin Phase 1** with OnboardingWizard refactor
3. **Implement incrementally** with testing at each phase
4. **Validate user experience** with stakeholders
5. **Deploy with feature flag** for gradual rollout

## Questions for Clarification

1. **Panel Layout**: Should we use tabs, accordion sections, or a different UI pattern for kit navigation?
2. **Form Validation**: Should validation happen in real-time or only when submitting the entire form?
3. **Partial Completion**: How should we handle users who start but don't finish all kits?
4. **Kit Ordering**: Should we enforce any specific completion order, or allow complete flexibility?
5. **Mobile Experience**: How should the multi-panel layout adapt to mobile devices?

---

*This document should be updated as implementation progresses and new requirements or constraints are discovered.*
