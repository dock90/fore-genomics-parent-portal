// Step identifiers for the onboarding flow
export type StepId =
	| 'welcome'
	| 'user-name'
	| 'user-address'
	| 'user-phone'
	| 'communication-preference'
	| 'kit-selection'
	| 'child-status'
	| 'child-name'
	| 'child-dob'
	| 'child-sex'
	| 'child-ethnicity'
	| 'child-relationship'
	| 'parent-invitation'
	| 'consent-intro'
	| 'consent-services'
	| 'consent-testing'
	| 'consent-telehealth'
	| 'consent-signature'
	| 'questionnaire-milestones'
	| 'questionnaire-family-history'
	| 'questionnaire-hospitalization'
	| 'kit-complete'
	| 'confirmation'
	| 'share-prompt';

// Section groupings for progress indicator
export type SectionId =
	| 'about-you'
	| 'about-child'
	| 'consent'
	| 'health-history'
	| 'complete';

export interface Section {
	id: SectionId;
	label: string;
	icon: string;
}

export const SECTIONS: Section[] = [
	{ id: 'about-you', label: 'About You', icon: '👤' },
	{ id: 'about-child', label: 'About Your Child', icon: '👶' },
	{ id: 'consent', label: 'Consent', icon: '📋' },
	{ id: 'health-history', label: 'Health History', icon: '🏥' },
	{ id: 'complete', label: 'Complete', icon: '✓' },
];

// Educational content that can be shown alongside steps
export interface EducationalContent {
	title: string;
	body: string;
	learnMoreLink?: string;
	icon?: string;
}

// Props passed to every step component
export interface StepProps {
	onNext: (data?: Partial<OnboardingState>) => void;
	onBack: () => void;
	state: OnboardingState;
	isAnimating: boolean;
}

// Configuration for each step
export interface StepConfig {
	id: StepId;
	component: React.ComponentType<StepProps>;
	section: SectionId;
	title: string;
	subtitle?: string;
	canSkip?: boolean;
	condition?: (state: OnboardingState) => boolean;
	educationalContent?: EducationalContent;
}

// Address data structure
export interface AddressData {
	street: string;
	street2?: string;
	city: string;
	state: string;
	zipCode: string;
}

// Consent data structure
export interface ConsentData {
	part1Accepted: boolean;
	part1Scrolled: boolean;
	part2Accepted: boolean;
	part2Scrolled: boolean;
	part3Accepted: boolean;
	part3Scrolled: boolean;
	consentAll: boolean;
	signature: string | null;
	signatureDate: string;
	signerName: string;
	childName: string;
	childDOB: string;
}

// Questionnaire data structure
export type YesNoNotSure = boolean | 'not-sure' | null;

export interface QuestionnaireData {
	milestonesOnTime: YesNoNotSure;
	milestonesDetails: string;
	familyHistoryExists: YesNoNotSure;
	familyHistoryDetails: string;
	hospitalizationHistory: YesNoNotSure;
	hospitalizationDetails: string;
}

// Kit data for multi-kit orders
export interface KitData {
	id: string;
	kitNumber: number;
	kitType: string;
	isComplete: boolean;
	isUnborn?: boolean; // True if this kit is for an unborn child (has due date, no DOB)
}

// Invited parent data
export interface InvitedParentData {
	name: string;
	email: string;
}

// Communication preference options
export type CommunicationPreference = 'EMAIL' | 'SMS' | 'BOTH';

// Main onboarding state
export interface OnboardingState {
	// User info
	email: string;
	firstName: string;
	lastName: string;
	address: AddressData;
	phone: string;
	communicationPreference: CommunicationPreference;

	// Child info
	childIsUnborn: boolean;
	childFirstName: string;
	childLastName: string;
	childDob: string;
	childDueDate: string;
	childSex: 'Male' | 'Female' | null;
	childEthnicity: string[];
	childEthnicityOther: string;
	relationshipToChild: 'MOTHER' | 'FATHER' | 'GUARDIAN' | 'OTHER' | null;

	// Parent invitation (conditional)
	invitedParent: InvitedParentData | null;

	// Consent
	consent: ConsentData;

	// Questionnaire
	questionnaire: QuestionnaireData;

	// Multi-kit support
	selectedKitId: string | null;
	kits: KitData[];
	hasMultipleKits: boolean;

	// Navigation meta
	currentStepIndex: number;
	completedSteps: StepId[];
	direction: 1 | -1; // 1 = forward, -1 = backward (for animations)

	// Order/User context
	orderId: string | null;
	userId: string | null;

	// Flow flags
	isInvitationFlow: boolean;
	isUnbornChildFlow: boolean;
}

// Initial state factory
export function createInitialState(
	overrides?: Partial<OnboardingState>
): OnboardingState {
	return {
		// User info
		email: '',
		firstName: '',
		lastName: '',
		address: {
			street: '',
			street2: '',
			city: '',
			state: '',
			zipCode: '',
		},
		phone: '',
		communicationPreference: 'EMAIL',

		// Child info
		childIsUnborn: false,
		childFirstName: '',
		childLastName: '',
		childDob: '',
		childDueDate: '',
		childSex: null,
		childEthnicity: [],
		childEthnicityOther: '',
		relationshipToChild: null,

		// Parent invitation
		invitedParent: null,

		// Consent
		consent: {
			part1Accepted: false,
			part1Scrolled: false,
			part2Accepted: false,
			part2Scrolled: false,
			part3Accepted: false,
			part3Scrolled: false,
			consentAll: false,
			signature: null,
			signatureDate: new Date().toISOString().split('T')[0],
			signerName: '',
			childName: '',
			childDOB: '',
		},

		// Questionnaire
		questionnaire: {
			milestonesOnTime: null,
			milestonesDetails: '',
			familyHistoryExists: null,
			familyHistoryDetails: '',
			hospitalizationHistory: null,
			hospitalizationDetails: '',
		},

		// Multi-kit
		selectedKitId: null,
		kits: [],
		hasMultipleKits: false,

		// Navigation
		currentStepIndex: 0,
		completedSteps: [],
		direction: 1,

		// Context
		orderId: null,
		userId: null,

		// Flow flags
		isInvitationFlow: false,
		isUnbornChildFlow: false,

		...overrides,
	};
}

// US States for address selection
export const US_STATES = [
	'AL',
	'AK',
	'AZ',
	'AR',
	'CA',
	'CO',
	'CT',
	'DE',
	'FL',
	'GA',
	'HI',
	'ID',
	'IL',
	'IN',
	'IA',
	'KS',
	'KY',
	'LA',
	'ME',
	'MD',
	'MA',
	'MI',
	'MN',
	'MS',
	'MO',
	'MT',
	'NE',
	'NV',
	'NH',
	'NJ',
	'NM',
	'NY',
	'NC',
	'ND',
	'OH',
	'OK',
	'OR',
	'PA',
	'RI',
	'SC',
	'SD',
	'TN',
	'TX',
	'UT',
	'VT',
	'VA',
	'WA',
	'WV',
	'WI',
	'WY',
] as const;

// Ethnicity options
export const ETHNICITY_OPTIONS = [
	{ label: 'African / African American', value: 'African / African American' },
	{ label: 'East Asian', value: 'East Asian' },
	{ label: 'South Asian', value: 'South Asian' },
	{ label: 'Southeast Asian', value: 'Southeast Asian' },
	{ label: 'Hispanic / Latino', value: 'Hispanic / Latino' },
	{ label: 'European', value: 'European' },
	{ label: 'Middle Eastern', value: 'Middle Eastern' },
	{ label: 'Ashkenazi Jewish', value: 'Ashkenazi Jewish' },
	{ label: 'Native American / Alaska Native', value: 'Native American / Alaska Native' },
	{ label: 'Other', value: 'Other' },
] as const;
