import type { StepConfig, StepId, OnboardingState, SectionId } from './types';

// Lazy load step components to enable code splitting
// These will be imported dynamically when needed
const stepComponents: Record<StepId, () => Promise<{ default: React.ComponentType<any> }>> = {
  'welcome': () => import('@/components/onboarding-v2/steps/WelcomeStep'),
  'user-name': () => import('@/components/onboarding-v2/steps/UserNameStep'),
  'user-address': () => import('@/components/onboarding-v2/steps/UserAddressStep'),
  'user-phone': () => import('@/components/onboarding-v2/steps/UserPhoneStep'),
  'kit-selection': () => import('@/components/onboarding-v2/steps/KitSelectionStep'),
  'child-status': () => import('@/components/onboarding-v2/steps/ChildStatusStep'),
  'child-name': () => import('@/components/onboarding-v2/steps/ChildNameStep'),
  'child-dob': () => import('@/components/onboarding-v2/steps/ChildDobStep'),
  'child-sex': () => import('@/components/onboarding-v2/steps/ChildSexStep'),
  'child-ethnicity': () => import('@/components/onboarding-v2/steps/ChildEthnicityStep'),
  'child-relationship': () => import('@/components/onboarding-v2/steps/ChildRelationshipStep'),
  'parent-invitation': () => import('@/components/onboarding-v2/steps/ParentInvitationStep'),
  'consent-intro': () => import('@/components/onboarding-v2/steps/ConsentIntroStep'),
  'consent-services': () => import('@/components/onboarding-v2/steps/ConsentServicesStep'),
  'consent-testing': () => import('@/components/onboarding-v2/steps/ConsentTestingStep'),
  'consent-telehealth': () => import('@/components/onboarding-v2/steps/ConsentTelehealthStep'),
  'consent-signature': () => import('@/components/onboarding-v2/steps/ConsentSignatureStep'),
  'questionnaire-milestones': () => import('@/components/onboarding-v2/steps/QuestionnaireMilestonesStep'),
  'questionnaire-family-history': () => import('@/components/onboarding-v2/steps/QuestionnaireFamilyHistoryStep'),
  'questionnaire-hospitalization': () => import('@/components/onboarding-v2/steps/QuestionnaireHospitalizationStep'),
  'confirmation': () => import('@/components/onboarding-v2/steps/ConfirmationStep'),
  'share-prompt': () => import('@/components/onboarding-v2/steps/SharePromptStep'),
};

// Full step configuration with conditions and metadata
export const STEP_CONFIGS: Omit<StepConfig, 'component'>[] = [
  // Welcome
  {
    id: 'welcome',
    section: 'about-you',
    title: 'Welcome',
    subtitle: 'Let\'s get started with your Fore Genomics journey',
  },

  // About You section
  {
    id: 'user-name',
    section: 'about-you',
    title: 'What\'s your name?',
    subtitle: 'We\'ll use this on shipping labels and reports',
    educationalContent: {
      title: 'Why we ask',
      body: 'Your name will appear on the shipping label for your kit and on official documents.',
      icon: '📦',
    },
  },
  {
    id: 'user-address',
    section: 'about-you',
    title: 'Where should we ship your kit?',
    subtitle: 'Your kit will arrive in 2-3 business days',
    educationalContent: {
      title: 'Fast shipping',
      body: 'We ship via USPS Priority Mail. You\'ll receive tracking information via email.',
      icon: '🚚',
    },
  },
  {
    id: 'user-phone',
    section: 'about-you',
    title: 'What\'s your phone number?',
    subtitle: 'We\'ll text you shipping updates and appointment reminders',
    educationalContent: {
      title: 'Stay informed',
      body: 'We\'ll only contact you about important updates regarding your order and appointments.',
      icon: '📱',
    },
  },

  // Kit Selection (conditional)
  {
    id: 'kit-selection',
    section: 'about-child',
    title: 'Select a kit to set up',
    subtitle: 'You have multiple kits to complete',
    condition: (state: OnboardingState) => state.hasMultipleKits && state.kits.length > 1,
  },

  // About Your Child section
  {
    id: 'child-status',
    section: 'about-child',
    title: 'Is your child already born?',
    subtitle: 'This helps us customize the next steps',
  },
  {
    id: 'child-name',
    section: 'about-child',
    title: 'What\'s your child\'s name?',
    condition: (state: OnboardingState) => !state.childIsUnborn,
    educationalContent: {
      title: 'For the report',
      body: 'Your child\'s name will appear on their genetic testing report.',
      icon: '📄',
    },
  },
  {
    id: 'child-dob',
    section: 'about-child',
    title: 'Date of birth or due date',
    // No condition - shows for both born and unborn, component handles the difference
  },
  {
    id: 'child-sex',
    section: 'about-child',
    title: 'What is your child\'s biological sex?',
    condition: (state: OnboardingState) => !state.childIsUnborn,
    educationalContent: {
      title: 'Why this matters',
      body: 'Biological sex affects how we analyze certain genetic variants, particularly those on sex chromosomes.',
      icon: '🧬',
    },
  },
  {
    id: 'child-ethnicity',
    section: 'about-child',
    title: 'What is your child\'s ethnicity?',
    subtitle: 'Select all that apply',
    condition: (state: OnboardingState) => !state.childIsUnborn,
    educationalContent: {
      title: 'Better analysis',
      body: 'Ethnicity helps our genetic counselors provide more accurate risk assessments for certain conditions that vary by population.',
      icon: '🌍',
    },
  },
  {
    id: 'child-relationship',
    section: 'about-child',
    title: 'What is your relationship to this child?',
    condition: (state: OnboardingState) => !state.childIsUnborn,
    educationalContent: {
      title: 'Legal requirement',
      body: 'Only a biological parent or legal guardian can provide consent for genetic testing of a minor.',
      icon: '⚖️',
    },
  },
  {
    id: 'parent-invitation',
    section: 'about-child',
    title: 'Invite a parent or guardian',
    subtitle: 'They\'ll need to complete the consent process',
    condition: (state: OnboardingState) =>
      !state.childIsUnborn && state.relationshipToChild === 'OTHER',
  },

  // Consent section
  {
    id: 'consent-intro',
    section: 'consent',
    title: 'Review & Sign Consent',
    subtitle: 'You\'ll review 3 important documents',
    condition: (state: OnboardingState) => !state.childIsUnborn && state.relationshipToChild !== 'OTHER',
  },
  {
    id: 'consent-services',
    section: 'consent',
    title: 'Part 1 of 3: Terms of Service',
    subtitle: 'How we handle your data and communicate with you',
    condition: (state: OnboardingState) => !state.childIsUnborn && state.relationshipToChild !== 'OTHER',
  },
  {
    id: 'consent-testing',
    section: 'consent',
    title: 'Part 2 of 3: Genetic Testing Consent',
    subtitle: 'What genetic testing involves and what results may reveal',
    condition: (state: OnboardingState) => !state.childIsUnborn && state.relationshipToChild !== 'OTHER',
  },
  {
    id: 'consent-telehealth',
    section: 'consent',
    title: 'Part 3 of 3: Telehealth Services',
    subtitle: 'Your video consultation with a genetic counselor',
    condition: (state: OnboardingState) => !state.childIsUnborn && state.relationshipToChild !== 'OTHER',
  },
  {
    id: 'consent-signature',
    section: 'consent',
    title: 'Sign Your Consent',
    subtitle: 'Almost there! Just your signature',
    condition: (state: OnboardingState) => !state.childIsUnborn && state.relationshipToChild !== 'OTHER',
  },

  // Health History section
  {
    id: 'questionnaire-milestones',
    section: 'health-history',
    title: 'Developmental Milestones',
    condition: (state: OnboardingState) => !state.childIsUnborn && state.relationshipToChild !== 'OTHER',
    educationalContent: {
      title: 'What are milestones?',
      body: 'Developmental milestones include sitting up, crawling, walking, and first words. Every child develops differently.',
      icon: '📈',
    },
  },
  {
    id: 'questionnaire-family-history',
    section: 'health-history',
    title: 'Family Health History',
    condition: (state: OnboardingState) => !state.childIsUnborn && state.relationshipToChild !== 'OTHER',
    educationalContent: {
      title: 'Why family history matters',
      body: 'Understanding your family\'s health history helps our counselors interpret results in context.',
      icon: '👨‍👩‍👧‍👦',
    },
  },
  {
    id: 'questionnaire-hospitalization',
    section: 'health-history',
    title: 'Medical History',
    condition: (state: OnboardingState) => !state.childIsUnborn && state.relationshipToChild !== 'OTHER',
    educationalContent: {
      title: 'Health context',
      body: 'Previous hospitalizations provide important context for understanding your child\'s health journey.',
      icon: '🏥',
    },
  },

  // Confirmation
  {
    id: 'confirmation',
    section: 'complete',
    title: 'You\'re All Set!',
  },

  // Share (optional)
  {
    id: 'share-prompt',
    section: 'complete',
    title: 'Share with Friends',
    canSkip: true,
  },
];

/**
 * Get the component loader for a step
 */
export function getStepComponentLoader(stepId: StepId) {
  return stepComponents[stepId];
}

/**
 * Get visible steps based on current state
 * Filters out steps whose conditions are not met
 */
export function getVisibleSteps(state: OnboardingState): typeof STEP_CONFIGS {
  return STEP_CONFIGS.filter((step) => {
    if (!step.condition) return true;
    return step.condition(state);
  });
}

/**
 * Get the current step config
 */
export function getCurrentStepConfig(state: OnboardingState): (typeof STEP_CONFIGS)[0] | undefined {
  const visibleSteps = getVisibleSteps(state);
  return visibleSteps[state.currentStepIndex];
}

/**
 * Get section progress information
 */
export function getSectionProgress(state: OnboardingState): {
  currentSection: SectionId;
  sectionIndex: number;
  totalSections: number;
  stepsInSection: number;
  currentStepInSection: number;
} {
  const visibleSteps = getVisibleSteps(state);
  const currentStep = visibleSteps[state.currentStepIndex];

  if (!currentStep) {
    return {
      currentSection: 'about-you',
      sectionIndex: 0,
      totalSections: 5,
      stepsInSection: 0,
      currentStepInSection: 0,
    };
  }

  const sections: SectionId[] = ['about-you', 'about-child', 'consent', 'health-history', 'complete'];
  const sectionIndex = sections.indexOf(currentStep.section);

  const stepsInSection = visibleSteps.filter(s => s.section === currentStep.section);
  const currentStepInSection = stepsInSection.findIndex(s => s.id === currentStep.id);

  return {
    currentSection: currentStep.section,
    sectionIndex,
    totalSections: sections.length,
    stepsInSection: stepsInSection.length,
    currentStepInSection: currentStepInSection + 1,
  };
}

/**
 * Calculate overall progress percentage
 */
export function getProgressPercentage(state: OnboardingState): number {
  const visibleSteps = getVisibleSteps(state);
  if (visibleSteps.length === 0) return 0;
  return Math.round((state.currentStepIndex / (visibleSteps.length - 1)) * 100);
}

