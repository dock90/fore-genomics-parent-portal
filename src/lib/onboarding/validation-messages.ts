import { toast } from 'sonner';

/**
 * Friendly validation messages for onboarding steps
 * These are designed to be helpful and encouraging, not scolding
 */

export const validationMessages = {
	// User info
	userName: {
		firstName: "We'd love to know your first name! 👋",
		lastName: "Your last name helps us personalize your experience",
		both: "We need your name to get started — it'll appear on shipping labels and reports",
	},
	userAddress: {
		street: "Where should we send your kit? We need a street address 📦",
		city: "Don't forget to add your city!",
		state: "Which state should we ship to?",
		zipCode: "We need your ZIP code to calculate shipping",
		incomplete: "Just a few more address details and we're good to go!",
	},
	userPhone: {
		required: "A phone number helps us reach you about important updates 📱",
		invalid: "Hmm, that doesn't look like a complete phone number",
	},

	// Child info
	childName: {
		firstName: "What's your little one's first name? 👶",
		lastName: "We'll also need your child's last name for the report",
		both: "We need your child's name — it'll appear on their genetic report",
	},
	childDob: {
		required: "When was your child born? This helps us provide accurate results 🎂",
		future: "That date is in the future — did you mean to select a due date?",
	},
	childDueDate: {
		required: "When is your baby due? We'll check back in after they arrive 🍼",
		past: "That date has already passed — is your baby already born?",
	},
	childSex: {
		required: "Biological sex helps us analyze certain genetic variants accurately 🧬",
	},
	childEthnicity: {
		required: "Ethnicity helps our counselors provide more accurate risk assessments 🌍",
		specifyOther: "You selected 'Other' — could you tell us more?",
	},
	childRelationship: {
		required: "What's your relationship to this child?",
	},

	// Parent invitation
	parentInvitation: {
		name: "What's the parent or guardian's name?",
		email: "We need their email to send the invitation ✉️",
		invalidEmail: "That email doesn't look quite right — double-check it?",
	},

	// Consent
	consent: {
		scrollRequired: "Please scroll through the entire document before continuing 📜",
		acceptRequired: "You'll need to accept this section to continue",
		signatureRequired: "Almost there! Just need your signature ✍️",
	},

	// Questionnaire
	questionnaire: {
		required: "This helps our genetic counselors understand your child's health context",
		detailsRequired: "Could you tell us a bit more about that?",
	},
};

/**
 * Show a friendly validation toast
 */
export function showValidationToast(message: string, description?: string) {
	toast.error(message, {
		description,
		duration: 4000,
		icon: '💭',
	});
}

/**
 * Show a success toast for completing a step
 */
export function showSuccessToast(message: string) {
	toast.success(message, {
		duration: 2000,
	});
}

/**
 * Show an info toast
 */
export function showInfoToast(message: string, description?: string) {
	toast.info(message, {
		description,
		duration: 3000,
	});
}

