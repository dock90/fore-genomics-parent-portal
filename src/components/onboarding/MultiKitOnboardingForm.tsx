"use client";

import * as React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { CheckCircle, Circle, Clock, AlertCircle, User } from "lucide-react";
import { isFeatureEnabled } from "@/lib/feature-flags";
import UserInfoStep from "./UserInfoStep";
import ChildInfoStep from "./ChildInfoStep";
import ConsentStep from "./ConsentStep";
import QuestionnaireStep from "./QuestionnaireStep";
import KitPanel from "./KitPanel";
import { useState } from "react";
import ConfirmationStep from "./ConfirmationStep";

// Reuse existing schemas from OnboardingWizard
const userInfoSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  address: z.string().min(1, "Street address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zipCode: z.string().min(1, "ZIP code is required"),
  phone: z.string().min(1, "Phone number is required"),
});

const childInfoSchema = z
  .object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    dob: z
      .string()
      .optional()
      .refine(
        (val) => {
          if (!val) return true;
          const dob = new Date(val);
          const today = new Date();
          today.setHours(23, 59, 59, 999);
          return dob <= today;
        },
        {
          message: "Date of birth cannot be in the future",
        }
      ),
    dueDate: z
      .string()
      .optional()
      .refine(
        (val) => {
          if (!val) return true;
          const dueDate = new Date(val);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return dueDate >= today;
        },
        {
          message: "Due date must be in the future",
        }
      ),
    isNotYetBorn: z.boolean().optional(),
    sex: z.enum(["Male", "Female"]).optional(),
    ethnicity: z.array(z.string()).optional(),
    ethnicityOther: z.string().optional(),
    // In multikit flow, hide "OTHER" relationship type
    relationshipToChild: z.enum(["MOTHER", "FATHER", "GUARDIAN"]).optional(),
  })
  .refine(
    (data) => {
      // In multikit flow, always require all fields for born children
      return !!(
        data.firstName &&
        data.lastName &&
        data.dob &&
        data.ethnicity &&
        data.ethnicity.length > 0 &&
        data.relationshipToChild
      );
    },
    {
      message: "Please fill in all required fields",
      path: ["firstName"],
    }
  );

type UserInfo = z.infer<typeof userInfoSchema>;
type ChildInfo = z.infer<typeof childInfoSchema>;

interface Kit {
  id: string;
  kitNumber: number;
  kitType: string;
  status: string;
  childId: string | null;
  consentId: string | null;
  questionnaireId: string | null;
}

interface ChildData {
  kitId: string;
  childInfo: ChildInfo | null;
  consentAccepted: boolean;
  consentData: any;
  questionnaire: any;
  // Add validation state tracking
  validationErrors: {
    childInfo: string[];
    consent: string[];
    questionnaire: string[];
  };
  isDirty: boolean; // Track if form has been modified
}

interface MultiKitOnboardingFormProps {
  user: any;
  invitationData?: any;
  order: any;
  kits: Kit[];
}

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
];

export default function MultiKitOnboardingForm({
  user,
  invitationData,
  order,
  kits,
}: MultiKitOnboardingFormProps) {
  console.log('MultiKitOnboardingForm mounted with kits:', kits);
  const router = useRouter();
  
  // State management for multi-panel approach
  const [kitsData, setKitsData] = React.useState<Kit[]>(kits);
  const [activeKitIndex, setActiveKitIndex] = React.useState(-1);
  const [childrenData, setChildrenData] = React.useState<ChildData[]>([]);
  const [completedKits, setCompletedKits] = React.useState<Set<string>>(new Set());
  const [userInfo, setUserInfo] = React.useState<UserInfo | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [existingUserData, setExistingUserData] = useState<any>(null);
  const [expandedKits, setExpandedKits] = useState<Set<string>>(new Set());
  
  console.log('MultiKitOnboardingForm state - kits:', kits, 'kitsData:', kitsData, 'childrenData.length:', childrenData.length);
  
  // Add validation state management
  const [validationStates, setValidationStates] = React.useState<Map<string, {
    isValid: boolean;
    errors: string[];
    lastValidated: Date;
  }>>(new Map());

  // Navigation functions
  const goToNextKit = () => {
    // Prevent navigation until parent information is completed
    if (!userInfo) {
      return;
    }
    
    if (activeKitIndex === -1) {
      // If no kit is selected, go to the first kit
      activateKit(0);
    } else if (activeKitIndex < kits.length - 1) {
      activateKit(activeKitIndex + 1);
    }
  };

  const goToPreviousKit = () => {
    // Prevent navigation until parent information is completed
    if (!userInfo) {
      return;
    }
    
    if (activeKitIndex > 0) {
      activateKit(activeKitIndex - 1);
    } else if (activeKitIndex === 0) {
      // If at first kit, deselect all kits
      setActiveKitIndex(-1);
    }
  };

  const goToKit = (kitIndex: number) => {
    // Prevent navigation until parent information is completed
    if (!userInfo) {
      return;
    }
    
    if (kitIndex >= 0 && kitIndex < kits.length) {
      activateKit(kitIndex);
    }
  };

  // Kit panel management functions
  const toggleKitExpanded = (kitId: string) => {
    // Prevent kit interaction until parent information is completed
    if (!userInfo) {
      return;
    }
    
    setExpandedKits(prev => {
      const newSet = new Set(prev);
      if (newSet.has(kitId)) {
        newSet.delete(kitId);
      } else {
        newSet.add(kitId);
      }
      return newSet;
    });
  };

  // Enhanced kit activation with form state synchronization
  const activateKit = (kitIndex: number) => {
    // Prevent kit activation until parent information is completed
    if (!userInfo) {
      return;
    }
    
    setActiveKitIndex(kitIndex);
    
    // Synchronize form state when switching to a kit
    const childData = childrenData[kitIndex];
    if (childData && allChildForms[kitIndex]) {
      // Sync child info form if data exists, otherwise reset to defaults
      if (childData.childInfo) {
        allChildForms[kitIndex].reset(childData.childInfo);
      } else {
        // Reset to default values if no child info exists
        const defaultValues = {
          firstName: "",
          lastName: "",
          dob: "",
          dueDate: "",
          isNotYetBorn: false,
          sex: undefined,
          ethnicity: [],
          ethnicityOther: "",
          relationshipToChild: undefined,
        };
        allChildForms[kitIndex].reset(defaultValues);
      }
      
      // Trigger validation to ensure consistency
      validateKitRealTime(kitIndex);
    }
  };

  const isKitExpanded = (kitId: string) => expandedKits.has(kitId);

  // Keyboard navigation support
  React.useEffect(() => {
    if (!isMountedRef.current) return;
    
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return; // Don't handle navigation when typing in form fields
      }

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          goToPreviousKit();
          break;
        case 'ArrowRight':
          event.preventDefault();
          goToNextKit();
          break;
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
          event.preventDefault();
          const kitIndex = parseInt(event.key) - 1;
          if (kitIndex < kits.length) {
            goToKit(kitIndex);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeKitIndex, kits.length]);

  // Auto-advance to next incomplete kit when current kit is completed
  const autoAdvanceRef = React.useRef(false);
  
  React.useEffect(() => {
    // Prevent infinite loops by checking if we're already auto-advancing or unmounted
    if (autoAdvanceRef.current || !isMountedRef.current) return;
    
    if (activeKitIndex >= 0 && isKitCompleted(activeKitIndex) && activeKitIndex < kits.length - 1) {
      // Find next incomplete kit
      const nextIncompleteIndex = childrenData.findIndex((_, index) => 
        index > activeKitIndex && !isKitCompleted(index)
      );
      
      if (nextIncompleteIndex !== -1) {
        // Set flag to prevent multiple auto-advances
        autoAdvanceRef.current = true;
        
        // Auto-advance after a short delay to show completion feedback
        const timer = setTimeout(() => {
          if (isMountedRef.current) {
            setActiveKitIndex(nextIncompleteIndex);
            // Reset flag after state update
            setTimeout(() => {
              if (isMountedRef.current) {
                autoAdvanceRef.current = false;
              }
            }, 100);
          }
        }, 2000); // Increased delay for better user experience
        
        return () => clearTimeout(timer);
      }
    }
  }, [completedKits, kits.length, childrenData, activeKitIndex]); // Added activeKitIndex back to dependencies

  // Auto-focus on first kit when parent information is completed
  React.useEffect(() => {
    if (userInfo && activeKitIndex === -1 && kits.length > 0) {
      setActiveKitIndex(0);
    }
  }, [userInfo, activeKitIndex, kits.length]);

  // Enhanced completion status tracking with celebration
  const [celebratingKit, setCelebratingKit] = React.useState<string | null>(null);
  const [completionHistory, setCompletionHistory] = React.useState<Map<string, {
    completedAt: Date;
    completedBy: string;
    sections: string[];
    validationScore: number;
    kitIndex: number;
  }>>(new Map());

  // Enhanced UI state management
  const [loadingStates, setLoadingStates] = React.useState<Map<string, boolean>>(new Map());
  const [errorStates, setErrorStates] = React.useState<Map<string, string | null>>(new Map());
  const [successStates, setSuccessStates] = React.useState<Map<string, boolean>>(new Map());
  const [globalLoading, setGlobalLoading] = React.useState(false);
  const [globalError, setGlobalError] = React.useState<string | null>(null);
  const [globalSuccess, setGlobalSuccess] = React.useState<string | null>(null);
  const [onboardingComplete, setOnboardingComplete] = React.useState(false);
  
  // Prevent infinite loops with mounted ref
  const isMountedRef = React.useRef(true);
  
  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      isMountedRef.current = false;
      // Clear all persisted data on unmount (optional - you might want to keep it)
      // clearAllPersistedData();
    };
  }, []);

  // Enhanced kit completion tracking with validation
  const validateKitCompletion = (kitIndex: number): { isValid: boolean; missingFields: string[]; completionScore: number } => {
    const childData = childrenData[kitIndex];
    if (!childData) {
      return { isValid: false, missingFields: ['Kit data not found'], completionScore: 0 };
    }

    const missingFields: string[] = [];
    let completionScore = 0;
    const totalPossibleScore = 100;

    // Validate child info (40 points)
    if (!childData.childInfo) {
      missingFields.push('Child Information');
    } else {
      const childInfo = childData.childInfo;
      let childInfoScore = 0;
      
      // In multikit flow, always treat as born child (no unborn child support)
      if (childInfo.firstName) childInfoScore += 8;
      if (childInfo.lastName) childInfoScore += 8;
      if (childInfo.dob) childInfoScore += 8;
      if (childInfo.ethnicity && childInfo.ethnicity.length > 0) childInfoScore += 8;
      if (childInfo.relationshipToChild) childInfoScore += 8;
      
      completionScore += (childInfoScore / 40) * 40;
    }

    // Validate consent (30 points)
    if (!childData.consentAccepted) {
      missingFields.push('Consent Acceptance');
    } else {
      completionScore += 30;
    }

    // Validate questionnaire (30 points)
    let questionnaireScore = 0;
    
    // Debug: Log questionnaire values to see what's happening
    console.log(`Kit ${kitIndex} questionnaire values:`, {
      question1: childData.questionnaire.question1,
      question2: childData.questionnaire.question2,
      question3: childData.questionnaire.question3,
      question1Type: typeof childData.questionnaire.question1,
      question2Type: typeof childData.questionnaire.question2,
      question3Type: typeof childData.questionnaire.question3
    });
    
    // Only give points if the question has a boolean value (true/false)
    if (typeof childData.questionnaire.question1 === 'boolean') questionnaireScore += 10;
    if (typeof childData.questionnaire.question2 === 'boolean') questionnaireScore += 10;
    if (typeof childData.questionnaire.question3 === 'boolean') questionnaireScore += 10;
    
    completionScore += questionnaireScore;

    console.log(`Kit ${kitIndex} completion score:`, completionScore, 'questionnaire score:', questionnaireScore);

    return {
      isValid: missingFields.length === 0,
      missingFields,
      completionScore: Math.round(completionScore)
    };
  };

  // UI state management helper functions
  const setKitLoading = (kitId: string, loading: boolean) => {
    setLoadingStates(prev => new Map(prev).set(kitId, loading));
  };

  const setKitError = (kitId: string, error: string | null) => {
    setErrorStates(prev => new Map(prev).set(kitId, error));
    // Clear success state when error occurs
    if (error) {
      setSuccessStates(prev => new Map(prev).set(kitId, false));
    }
  };

  const setKitSuccess = (kitId: string, success: boolean) => {
    setSuccessStates(prev => new Map(prev).set(kitId, success));
    // Clear error state when success occurs
    if (success) {
      setErrorStates(prev => new Map(prev).set(kitId, null));
    }
  };

  const clearKitUIStates = (kitId: string) => {
    setLoadingStates(prev => {
      const newMap = new Map(prev);
      newMap.delete(kitId);
      return newMap;
    });
    setErrorStates(prev => {
      const newMap = new Map(prev);
      newMap.delete(kitId);
      return newMap;
    });
    setSuccessStates(prev => {
      const newMap = new Map(prev);
      newMap.delete(kitId);
      return newMap;
    });
  };

  const showGlobalError = (message: string) => {
    setGlobalError(message);
    setTimeout(() => setGlobalError(null), 8000); // Auto-hide after 8 seconds
  };

  // Enhanced real-time validation with detailed error tracking
  const validateKitSection = (kitIndex: number, section: 'childInfo' | 'consent' | 'questionnaire'): {
    isValid: boolean;
    errors: string[];
    details: any;
    sectionScore: number;
  } => {
    const childData = childrenData[kitIndex];
    if (!childData) {
      return { isValid: false, errors: ['Kit data not found'], details: null, sectionScore: 0 };
    }

    const errors: string[] = [];
    let details: any = {};
    let sectionScore = 0;

    switch (section) {
      case 'childInfo':
        if (!childData.childInfo) {
          errors.push('Child information is required');
        } else {
          const childInfo = childData.childInfo;
          // In multikit flow, always treat as born child (no unborn child support)
          if (!childInfo.firstName?.trim()) errors.push('Child first name is required');
          if (!childInfo.lastName?.trim()) errors.push('Child last name is required');
          if (!childInfo.dob) errors.push('Date of birth is required');
          if (!childInfo.ethnicity || childInfo.ethnicity.length === 0) errors.push('Ethnicity selection is required');
          if (!childInfo.relationshipToChild) errors.push('Relationship to child is required');
          if (childInfo.dob) {
            const dob = new Date(childInfo.dob);
            const today = new Date();
            if (dob > today) errors.push('Date of birth cannot be in the future');
          }
          
          // Calculate section score based on completed fields
          let completedFields = 0;
          const totalFields = 6; // firstName, lastName, dob, ethnicity, relationshipToChild, sex
          if (childInfo.firstName?.trim()) completedFields++;
          if (childInfo.lastName?.trim()) completedFields++;
          if (childInfo.dob) completedFields++;
          if (childInfo.ethnicity && childInfo.ethnicity.length > 0) completedFields++;
          if (childInfo.relationshipToChild) completedFields++;
          if (childInfo.sex) completedFields++;
          
          sectionScore = Math.round((completedFields / totalFields) * 100);
        }
        details = childData.childInfo;
        break;

      case 'consent':
        // Use the helper function for consent validation
        const consentValidation = validateKitSectionWithData(kitIndex, 'consent', childData);
        errors.push(...consentValidation.errors);
        sectionScore = consentValidation.sectionScore;
        details = consentValidation.details;
        break;

      case 'questionnaire':
        if (childData.questionnaire.question1 === undefined) errors.push('Question 1 must be answered');
        if (childData.questionnaire.question2 === undefined) errors.push('Question 2 must be answered');
        if (childData.questionnaire.question3 === undefined) errors.push('Question 3 must be answered');
        
        // Calculate section score based on answered questions
        let answeredQuestions = 0;
        const totalQuestions = 3;
        if (childData.questionnaire.question1 !== undefined) answeredQuestions++;
        if (childData.questionnaire.question2 !== undefined) answeredQuestions++;
        if (childData.questionnaire.question3 !== undefined) answeredQuestions++;
        
        sectionScore = Math.round((answeredQuestions / totalQuestions) * 100);
        details = childData.questionnaire;
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
      details,
      sectionScore
    };
  };

  // Real-time validation for a specific kit section
  const validateKitSectionRealTime = (kitIndex: number, section: 'childInfo' | 'consent' | 'questionnaire') => {
    console.log('validateKitSectionRealTime called for kit', kitIndex, 'section', section);
    
    // Get the current childrenData state to ensure we're validating the latest data
    const currentChildData = childrenData[kitIndex];
    console.log('Current child data for validation:', currentChildData);
    
    // Use the current state for validation instead of the closure-captured state
    const validation = validateKitSectionWithData(kitIndex, section, currentChildData);
    console.log('Validation result:', validation);
    
    const kitId = kits[kitIndex].id;
    
    // Update validation state
    setValidationStates(prev => {
      const newMap = new Map(prev);
      newMap.set(`${kitId}-${section}`, {
        isValid: validation.isValid,
        errors: validation.errors,
        lastValidated: new Date()
      });
      return newMap;
    });

    // Update childrenData with validation errors
    setChildrenData(prev => prev.map((childData, index) => 
      index === kitIndex 
        ? {
            ...childData,
            validationErrors: {
              ...childData.validationErrors,
              [section]: validation.errors
            }
          }
        : childData
    ));

    return validation;
  };

  // Helper function to validate a kit section with provided data
  const validateKitSectionWithData = (kitIndex: number, section: 'childInfo' | 'consent' | 'questionnaire', childData: any) => {
    console.log(`validateKitSectionWithData called for kit ${kitIndex}, section ${section}:`, childData);
    
    if (!childData) {
      return { isValid: false, errors: ['Kit data not found'], details: null, sectionScore: 0 };
    }

    const errors: string[] = [];
    let details: any = {};
    let sectionScore = 0;

    switch (section) {
      case 'childInfo':
        console.log('Helper function validating childInfo section:', {
          hasChildInfo: !!childData.childInfo,
          childInfo: childData.childInfo
        });
        
        if (!childData.childInfo) {
          errors.push('Child information is required');
        } else {
          const childInfo = childData.childInfo;
          // In multikit flow, always treat as born child (no unborn child support)
          if (!childInfo.firstName?.trim()) errors.push('Child first name is required');
          if (!childInfo.lastName?.trim()) errors.push('Child last name is required');
          if (!childInfo.dob) errors.push('Date of birth is required');
          if (!childInfo.ethnicity || childInfo.ethnicity.length === 0) errors.push('Ethnicity selection is required');
          if (!childData.childInfo.relationshipToChild) errors.push('Relationship to child is required');
          if (childInfo.dob) {
            const dob = new Date(childInfo.dob);
            const today = new Date();
            if (dob > today) errors.push('Date of birth cannot be in the future');
          }
          
          // Calculate section score based on completed fields
          let completedFields = 0;
          const totalFields = 6; // firstName, lastName, dob, ethnicity, relationshipToChild, sex
          if (childInfo.firstName?.trim()) completedFields++;
          if (childInfo.lastName?.trim()) completedFields++;
          if (childInfo.dob) completedFields++;
          if (childInfo.ethnicity && childInfo.ethnicity.length > 0) completedFields++;
          if (childInfo.relationshipToChild) completedFields++;
          if (childInfo.sex) completedFields++;
          
          sectionScore = Math.round((completedFields / totalFields) * 100);
        }
        details = childData.childInfo;
        break;

      case 'consent':
        // Debug: Log what's being validated
        console.log('Validating consent for kit:', {
          consentAccepted: childData.consentAccepted,
          consentData: childData.consentData,
          hasSignature: !!childData.consentData?.signature,
          hasSignatureDate: !!childData.consentData?.signatureDate,
          signature: childData.consentData?.signature,
          signatureDate: childData.consentData?.signatureDate
        });
        
        if (!childData.consentAccepted) {
          errors.push('Consent acceptance is required');
        } else {
          sectionScore += 50;
        }
        if (!childData.consentData?.signature) {
          errors.push('Digital signature is required');
        } else {
          sectionScore += 25;
        }
        if (!childData.consentData?.signatureDate) {
          errors.push('Signature date is required');
        } else {
          sectionScore += 25;
        }
        details = childData.consentData;
        break;

      case 'questionnaire':
        if (childData.questionnaire.question1 === undefined) errors.push('Question 1 must be answered');
        if (childData.questionnaire.question2 === undefined) errors.push('Question 2 must be answered');
        if (childData.questionnaire.question3 === undefined) errors.push('Question 3 must be answered');
        
        // Calculate section score based on answered questions
        let answeredQuestions = 0;
        const totalQuestions = 3;
        if (childData.questionnaire.question1 !== undefined) answeredQuestions++;
        if (childData.questionnaire.question2 !== undefined) answeredQuestions++;
        if (childData.questionnaire.question3 !== undefined) answeredQuestions++;
        
        sectionScore = Math.round((answeredQuestions / totalQuestions) * 100);
        details = childData.questionnaire;
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
      details,
      sectionScore
    };
  };

  // Real-time validation for a specific kit section with provided data (for immediate validation)
  const validateKitSectionRealTimeWithData = (kitIndex: number, section: 'childInfo' | 'consent' | 'questionnaire', data: ChildData[]) => {
    console.log('validateKitSectionRealTimeWithData called for kit', kitIndex, 'section', section);
    console.log('Provided data at validation time:', data);
    
    // Use the provided data instead of the current state
    const childData = data[kitIndex];
    if (!childData) {
      console.log('No child data found for kit', kitIndex);
      return { isValid: false, errors: ['Kit data not found'], details: null, sectionScore: 0 };
    }
    
    // Use the helper function for validation
    const validation = validateKitSectionWithData(kitIndex, section, childData);
    
    console.log('Validation result with provided data:', validation);
    
    const kitId = kits[kitIndex].id;
    
    // Update validation state
    setValidationStates(prev => {
      const newMap = new Map(prev);
      newMap.set(`${kitId}-${section}`, {
        isValid: validation.isValid,
        errors: validation.errors,
        lastValidated: new Date()
      });
      return newMap;
    });

    // Update childrenData with validation errors
    setChildrenData(prev => prev.map((childData, index) => 
      index === kitIndex 
        ? {
            ...childData,
            validationErrors: {
              ...childData.validationErrors,
              [section]: validation.errors
            }
          }
        : childData
    ));

    return validation;
  };

  // Validate entire kit in real-time
  const validateKitRealTime = (kitIndex: number) => {
    const childInfoValidation = validateKitSectionRealTime(kitIndex, 'childInfo');
    const consentValidation = validateKitSectionRealTime(kitIndex, 'consent');
    const questionnaireValidation = validateKitSectionRealTime(kitIndex, 'questionnaire');

    const isValid = childInfoValidation.isValid && consentValidation.isValid && questionnaireValidation.isValid;
    const allErrors = [
      ...childInfoValidation.errors.map(err => `Child Info: ${err}`),
      ...consentValidation.errors.map(err => `Consent: ${err}`),
      ...questionnaireValidation.errors.map(err => `Questionnaire: ${err}`)
    ];

    // Calculate overall kit score
    const overallScore = Math.round((
      childInfoValidation.sectionScore * 0.4 + // 40% weight
      consentValidation.sectionScore * 0.3 +   // 30% weight
      questionnaireValidation.sectionScore * 0.3 // 30% weight
    ));

    // Update validation state for the entire kit
    const kitId = kits[kitIndex].id;
    setValidationStates(prev => {
      const newMap = new Map(prev);
      newMap.set(kitId, {
        isValid,
        errors: allErrors,
        lastValidated: new Date()
      });
      return newMap;
    });

    return { isValid, errors: allErrors, overallScore };
  };

  // Validate entire kit with provided data (to avoid race conditions)
  const validateKitRealTimeWithData = (kitIndex: number, updatedChildData: any) => {
    // Use the provided data instead of reading from state
    const childInfoValidation = validateKitSectionWithData(kitIndex, 'childInfo', updatedChildData);
    const consentValidation = validateKitSectionWithData(kitIndex, 'consent', updatedChildData);
    const questionnaireValidation = validateKitSectionWithData(kitIndex, 'questionnaire', updatedChildData);

    const isValid = childInfoValidation.isValid && consentValidation.isValid && questionnaireValidation.isValid;
    const allErrors = [
      ...childInfoValidation.errors.map(err => `Child Info: ${err}`),
      ...consentValidation.errors.map(err => `Consent: ${err}`),
      ...questionnaireValidation.errors.map(err => `Questionnaire: ${err}`)
    ];

    // Calculate overall kit score
    const overallScore = Math.round((
      childInfoValidation.sectionScore * 0.4 + // 40% weight
      consentValidation.sectionScore * 0.3 +   // 30% weight
      questionnaireValidation.sectionScore * 0.3 // 30% weight
    ));

    // Update validation state for the entire kit
    const kitId = kits[kitIndex].id;
    setValidationStates(prev => {
      const newMap = new Map(prev);
      newMap.set(kitId, {
        isValid,
        errors: allErrors,
        lastValidated: new Date()
      });
      return newMap;
    });

    // Also update completion status if the kit is now valid
    if (isValid) {
      console.log(`Kit ${kitIndex} is now valid, updating completion status`);
      setCompletedKits(prev => {
        const newSet = new Set(prev);
        newSet.add(kitId);
        console.log('Updated completedKits set:', Array.from(newSet));
        return newSet;
      });
    }

    return { isValid, errors: allErrors, overallScore };
  };

  // Get validation state for a specific kit section
  const getKitSectionValidation = (kitIndex: number, section: 'childInfo' | 'consent' | 'questionnaire') => {
    const kitId = kits[kitIndex].id;
    return validationStates.get(`${kitId}-${section}`) || { isValid: true, errors: [], lastValidated: null };
  };

  // Get overall validation state for a kit
  const getKitValidation = (kitIndex: number) => {
    const kitId = kits[kitIndex].id;
    return validationStates.get(kitId) || { isValid: true, errors: [], lastValidated: null };
  };

  // Get validation error count for a specific kit
  const getValidationErrorCount = (kitIndex: number) => {
    const childData = childrenData[kitIndex];
    if (!childData?.validationErrors) return 0;
    return (
      childData.validationErrors.childInfo.length +
      childData.validationErrors.consent.length +
      childData.validationErrors.questionnaire.length
    );
  };

  // Validate all kits and provide overall status
  const validateAllKits = () => {
    const allValidations = kits.map((_, index) => validateKitRealTime(index));
    const allValid = allValidations.every(v => v.isValid);
    const allErrors = allValidations.flatMap(v => v.errors);
    
    return {
      isValid: allValid,
      errors: allErrors,
      kitValidations: allValidations,
      completedCount: completedKits.size,
      totalKits: kits.length
    };
  };

  // Get validation summary for the entire form
  const getFormValidationSummary = () => {
    const summary = {
      totalKits: kits.length,
      completedKits: completedKits.size,
      incompleteKits: kits.length - completedKits.size,
      hasErrors: false,
      errorSummary: [] as string[],
      kitStatuses: [] as Array<{
        kitIndex: number;
        kitId: string;
        isValid: boolean;
        errors: string[];
        completion: number;
        overallScore: number;
      }>
    };

    kits.forEach((kit, index) => {
      const validation = getKitValidation(index);
      const completion = getKitProgress(index);
      const completionDetails = validateKitCompletion(index);
      
      summary.kitStatuses.push({
        kitIndex: index,
        kitId: kit.id,
        isValid: validation.isValid,
        errors: validation.errors,
        completion,
        overallScore: completionDetails.completionScore
      });

      if (!validation.isValid) {
        summary.hasErrors = true;
        summary.errorSummary.push(`Kit ${index + 1}: ${validation.errors.join(', ')}`);
      }
    });

    return summary;
  };

  // Enhanced isKitCompleted function using validation
  const isKitCompleted = (kitIndex: number) => {
    const validation = validateKitCompletion(kitIndex);
    return validation.isValid;
  };

  // Get kit completion details for better feedback
  const getKitCompletionDetails = (kitIndex: number) => {
    const validation = validateKitCompletion(kitIndex);
    const childData = childrenData[kitIndex];
    
    if (!childData) return { status: 'error', message: 'Kit data not found', score: 0 };
    
    if (validation.isValid) {
      return { 
        status: 'completed', 
        message: 'All sections completed', 
        score: validation.completionScore 
      };
    }
    
    return {
      status: 'incomplete',
      message: `Missing: ${validation.missingFields.join(', ')}`,
      missingFields: validation.missingFields,
      score: validation.completionScore
    };
  };

  // Enhanced progress calculation with better granularity
  const getKitProgress = (kitIndex: number) => {
    const completionDetails = validateKitCompletion(kitIndex);
    return completionDetails.completionScore;
  };

  // Enhanced completion tracking with celebration and history
  const handleKitCompletion = (kitIndex: number) => {
    const kitId = kits[kitIndex].id;
    const kit = kits[kitIndex];
    const completionDetails = validateKitCompletion(kitIndex);
    
    // Set celebration state
    setCelebratingKit(kitId);
    
    // Record completion history
    const completionData = {
      completedAt: new Date(),
      completedBy: user?.email || 'Unknown',
      sections: ['childInfo', 'consent', 'questionnaire'],
      validationScore: completionDetails.completionScore,
      kitIndex
    };
    
    setCompletionHistory(prev => {
      const newMap = new Map(prev);
      newMap.set(kitId, completionData);
      return newMap;
    });
    
    // Persist completion state
    persistCompletionState(kitId, completionData);
    
    // Clear celebration after animation and advance to next incomplete kit
    setTimeout(() => {
      setCelebratingKit(null);
      
      // Find next incomplete kit and advance to it
      const nextIncompleteIndex = childrenData.findIndex((_, index) => 
        index > kitIndex && !isKitCompleted(index)
      );
      
      if (nextIncompleteIndex !== -1) {
        // Advance to the next incomplete kit
        setActiveKitIndex(nextIncompleteIndex);
        
        // Collapse the completed kit to reduce visual clutter
        setExpandedKits(prev => {
          const newSet = new Set(prev);
          newSet.delete(kitId); // Remove the completed kit
          newSet.add(kits[nextIncompleteIndex].id); // Add the next kit
          return newSet;
        });
        
        // Scroll the next kit into view smoothly
        setTimeout(() => {
          const nextKitElement = document.querySelector(`[data-kit-id="${kits[nextIncompleteIndex].id}"]`);
          if (nextKitElement) {
            nextKitElement.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'start',
              inline: 'nearest'
            });
          }
        }, 100);
      } else {
        // All kits are completed, collapse the last completed kit
        setExpandedKits(prev => {
          const newSet = new Set(prev);
          newSet.delete(kitId); // Remove the completed kit
          return newSet;
        });
        console.log('All kits completed!');
      }
    }, 3000);
  };

  // Get completion history for a specific kit
  const getKitCompletionHistory = (kitId: string) => {
    return completionHistory.get(kitId);
  };

  // Check if kit was recently completed (within last 24 hours)
  const isKitRecentlyCompleted = (kitId: string) => {
    const history = completionHistory.get(kitId);
    if (!history) return false;
    
    const now = new Date();
    const completedAt = new Date(history.completedAt);
    const hoursDiff = (now.getTime() - completedAt.getTime()) / (1000 * 60 * 60);
    
    return hoursDiff < 24;
  };

  // Enhanced state update functions with validation and celebration
  const handleChildInfoSubmit = async (kitIndex: number, values: ChildInfo) => {
    const kitId = kits[kitIndex].id;
    console.log('handleChildInfoSubmit called for kit', kitIndex, 'with values:', values);
    
    setKitLoading(kitId, true);
    setKitError(kitId, null);

    try {
      // Simulate API call delay for better UX
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Update state and immediately validate
      setChildrenData(prev => {
        const updatedData = prev.map((childData, index) => 
          index === kitIndex 
            ? { 
                ...childData, 
                childInfo: values,
                isDirty: true,
                validationErrors: {
                  ...childData.validationErrors,
                  childInfo: []
                }
              }
            : childData
        );
        
        // Update completed kits set immediately using the updated data
        const newCompletedKits = new Set<string>();
        updatedData.forEach((childData, index) => {
          // Use the same logic as validateKitCompletion to determine completion
          const hasChildInfo = !!childData.childInfo;
          const hasConsent = childData.consentAccepted;
          const hasQuestionnaire = childData.questionnaire.question1 !== undefined &&
                                   childData.questionnaire.question2 !== undefined &&
                                   childData.questionnaire.question3 !== undefined;
          
          const isCompleted = hasChildInfo && hasConsent && hasQuestionnaire;
          
          if (isCompleted) {
            newCompletedKits.add(childData.kitId);
            // Trigger celebration for newly completed kits
            if (!completedKits.has(childData.kitId)) {
              handleKitCompletion(index);
            }
          }
        });
        setCompletedKits(newCompletedKits);
        
        // Validate with the updated data immediately using the updated data
        setTimeout(() => {
          // Pass the updated data directly to avoid race conditions
          const currentChildData = updatedData[kitIndex];
          console.log('About to validate child info with data:', currentChildData);
          
          if (currentChildData) {
            const validation = validateKitSectionWithData(kitIndex, 'childInfo', currentChildData);
            console.log('Child info validation result:', validation);
            
            // Update validation state for this section
            const kitId = kits[kitIndex].id;
            setValidationStates(prev => {
              const newMap = new Map(prev);
              newMap.set(`${kitId}-childInfo`, {
                isValid: validation.isValid,
                errors: validation.errors,
                lastValidated: new Date()
              });
              return newMap;
            });
            
            // Also update the overall kit validation state
            const overallValidation = validateKitRealTimeWithData(kitIndex, currentChildData);
            console.log('Overall kit validation after child info update:', overallValidation);
          }
        }, 0);
        
        return updatedData;
      });
      
      // Persist data to localStorage for this kit
      persistKitData(kitIndex, 'childInfo', values);
      
      // Show success state
      setKitSuccess(kitId, true);
      setTimeout(() => setKitSuccess(kitId, false), 3000); // Hide success after 3 seconds
      
    } catch (error) {
      setKitError(kitId, 'Failed to save child information. Please try again.');
      showGlobalError('Failed to save child information. Please try again.');
    } finally {
      setKitLoading(kitId, false);
    }
  };

  const handleConsentSubmit = async (kitIndex: number, consentAccepted: boolean, consentData: any) => {
    const kitId = kits[kitIndex].id;
    setKitLoading(kitId, true);
    setKitError(kitId, null);

    try {
      // Simulate API call delay for better UX
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Update state and immediately validate with the new data
      setChildrenData(prev => {
        const updatedData = prev.map((childData, index) => 
          index === kitIndex 
            ? { 
                ...childData, 
                consentAccepted, 
                consentData,
                isDirty: true,
                validationErrors: {
                  ...childData.validationErrors,
                  consent: []
                }
              }
            : childData
        );
        
        // Debug: Log what's being stored
        console.log('Storing consent data for kit', kitIndex, ':', {
          consentAccepted,
          consentData,
          hasSignature: !!consentData?.signature,
          hasSignatureDate: !!consentData?.signatureDate
        });
        
        // Validate with the updated data immediately using the updated data
        setTimeout(() => {
          // Pass the updated data directly to avoid race conditions
          const currentChildData = updatedData[kitIndex];
          if (currentChildData) {
            const validation = validateKitSectionWithData(kitIndex, 'consent', currentChildData);
            console.log('Consent validation result:', validation);
            
            // Update validation state for this section
            const kitId = kits[kitIndex].id;
            setValidationStates(prev => {
              const newMap = new Map(prev);
              newMap.set(`${kitId}-consent`, {
                isValid: validation.isValid,
                errors: validation.errors,
                lastValidated: new Date()
              });
              return newMap;
            });
            
            // Also update the overall kit validation state
            const overallValidation = validateKitRealTimeWithData(kitIndex, currentChildData);
            console.log('Overall kit validation after consent update:', overallValidation);
          }
        }, 0);
        
        return updatedData;
      });
      
      // Update completion status after validation completes
      setTimeout(() => {
        const newCompletedKits = new Set<string>();
        childrenData.forEach((childData, index) => {
          // Use the same logic as validateKitCompletion to determine completion
          const hasChildInfo = !!childData.childInfo;
          const hasConsent = childData.consentAccepted;
          const hasQuestionnaire = childData.questionnaire.question1 !== undefined &&
                                   childData.questionnaire.question2 !== undefined &&
                                   childData.questionnaire.question3 !== undefined;
          
          const isCompleted = hasChildInfo && hasConsent && hasQuestionnaire;
          
          if (isCompleted) {
            newCompletedKits.add(childData.kitId);
            // Trigger celebration for newly completed kits
            if (!completedKits.has(childData.kitId)) {
              handleKitCompletion(index);
            }
          }
        });
        setCompletedKits(newCompletedKits);
      }, 100);
      
      // Persist data to localStorage for this kit
      persistKitData(kitIndex, 'consent', { consentAccepted, consentData });
      
      // Show success state
      setKitSuccess(kitId, true);
      setTimeout(() => setKitSuccess(kitId, false), 3000); // Hide success after 3 seconds
      
    } catch (error) {
      setKitError(kitId, 'Failed to save consent information. Please try again.');
      showGlobalError('Failed to save consent information. Please try again.');
    } finally {
      setKitLoading(kitId, false);
    }
  };

  const handleQuestionnaireSubmit = async (kitIndex: number, questionnaire: any) => {
    const kitId = kits[kitIndex].id;
    setKitLoading(kitId, true);
    setKitError(kitId, null);

    try {
      // Simulate API call delay for better UX
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Update state and immediately validate with the new data
      setChildrenData(prev => {
        const updatedData = prev.map((childData, index) => 
          index === kitIndex 
            ? { 
                ...childData, 
                questionnaire,
                isDirty: true,
                validationErrors: {
                  ...childData.validationErrors,
                  questionnaire: []
                }
              }
            : childData
        );
        
        // Validate with the updated data immediately using the updated data
        setTimeout(() => {
          // Pass the updated data directly to avoid race conditions
          const currentChildData = updatedData[kitIndex];
          if (currentChildData) {
            const validation = validateKitSectionWithData(kitIndex, 'questionnaire', currentChildData);
            console.log('Questionnaire validation result:', validation);
            
            // Update validation state for this section
            const kitId = kits[kitIndex].id;
            setValidationStates(prev => {
              const newMap = new Map(prev);
              newMap.set(`${kitId}-questionnaire`, {
                isValid: validation.isValid,
                errors: validation.errors,
                lastValidated: new Date()
              });
              return newMap;
            });
            
            // Also update the overall kit validation state
            const overallValidation = validateKitRealTimeWithData(kitIndex, currentChildData);
            console.log('Overall kit validation after questionnaire update:', overallValidation);
          }
        }, 0);
        
        return updatedData;
      });
      
      // Update completion status after validation completes
      setTimeout(() => {
        const newCompletedKits = new Set<string>();
        childrenData.forEach((childData, index) => {
          // Use the same logic as validateKitCompletion to determine completion
          const hasChildInfo = !!childData.childInfo;
          const hasConsent = childData.consentAccepted;
          const hasQuestionnaire = childData.questionnaire.question1 !== undefined &&
                                   childData.questionnaire.question2 !== undefined &&
                                   childData.questionnaire.question3 !== undefined;
          
          const isCompleted = hasChildInfo && hasConsent && hasQuestionnaire;
          
          if (isCompleted) {
            newCompletedKits.add(childData.kitId);
            // Trigger celebration for newly completed kits
            if (!completedKits.has(childData.kitId)) {
              handleKitCompletion(index);
            }
          }
        });
        setCompletedKits(newCompletedKits);
      }, 100);
      
      // Persist data to localStorage for this kit
      persistKitData(kitIndex, 'questionnaire', questionnaire);
      
      // Show success state
      setKitSuccess(kitId, true);
      setTimeout(() => setKitSuccess(kitId, false), 3000); // Hide success after 3 seconds
      
    } catch (error) {
      setKitError(kitId, 'Failed to save questionnaire. Please try again.');
      showGlobalError('Failed to save questionnaire. Please try again.');
    } finally {
      setKitLoading(kitId, false);
    }
  };

  // NEW: Data persistence per kit using localStorage
  const persistKitData = (kitIndex: number, section: 'childInfo' | 'consent' | 'questionnaire', data: any) => {
    try {
      if (!kits[kitIndex]) return;
      
      const kitId = kits[kitIndex].id;
      const storageKey = `kit_${kitId}_${section}`;
      localStorage.setItem(storageKey, JSON.stringify({
        data,
        timestamp: new Date().toISOString(),
        kitIndex,
        section
      }));
    } catch (error) {
      console.warn('Failed to persist kit data to localStorage:', error);
    }
  };

  // NEW: Persist user info to localStorage
  const persistUserInfo = (userInfo: UserInfo) => {
    try {
      const storageKey = 'user_info';
      const dataToStore = {
        data: userInfo,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem(storageKey, JSON.stringify(dataToStore));
      console.log('User info persisted to localStorage:', dataToStore);
    } catch (error) {
      console.warn('Failed to persist user info to localStorage:', error);
    }
  };

  // NEW: Load persisted user info from localStorage
  const loadPersistedUserInfo = (): UserInfo | null => {
    try {
      const storageKey = 'user_info';
      const stored = localStorage.getItem(storageKey);
      
      if (stored) {
        const parsed = JSON.parse(stored);
        // Only load data if it's from the same session (within last 24 hours)
        const storedTime = new Date(parsed.timestamp);
        const now = new Date();
        const hoursDiff = (now.getTime() - storedTime.getTime()) / (1000 * 60 * 60);
        
        console.log('Found stored user info, age:', hoursDiff.toFixed(2), 'hours');
        
        if (hoursDiff < 24) {
          console.log('User info loaded from localStorage:', parsed.data);
          return parsed.data;
        } else {
          console.log('User info too old, not loading');
        }
      } else {
        console.log('No stored user info found');
      }
    } catch (error) {
      console.warn('Failed to load persisted user info:', error);
    }
    return null;
  };

  // NEW: Load persisted data for a specific kit section
  const loadPersistedKitData = (kitIndex: number, section: 'childInfo' | 'consent' | 'questionnaire') => {
    try {
      if (!kits[kitIndex]) {
        console.log(`No kit found at index ${kitIndex}`);
        return null;
      }
      
      const kitId = kits[kitIndex].id;
      const storageKey = `kit_${kitId}_${section}`;
      console.log(`Looking for storage key: ${storageKey}`);
      
      const stored = localStorage.getItem(storageKey);
      
      if (stored) {
        const parsed = JSON.parse(stored);
        // Only load data if it's from the same session (within last 24 hours)
        const storedTime = new Date(parsed.timestamp);
        const now = new Date();
        const hoursDiff = (now.getTime() - storedTime.getTime()) / (1000 * 60 * 60);
        
        console.log(`Found stored data for ${section}, age: ${hoursDiff.toFixed(2)} hours`);
        
        if (hoursDiff < 24) {
          return parsed.data;
        } else {
          console.log(`Data too old (${hoursDiff.toFixed(2)} hours), not loading`);
        }
      } else {
        console.log(`No stored data found for ${section}`);
      }
    } catch (error) {
      console.warn('Failed to load persisted kit data:', error);
    }
    return null;
  };

  // NEW: Clear persisted data for a specific kit
  const clearPersistedKitData = (kitIndex: number) => {
    try {
      if (!kits[kitIndex]) return;
      
      const kitId = kits[kitIndex].id;
      const sections = ['childInfo', 'consent', 'questionnaire'];
      
      sections.forEach(section => {
        const storageKey = `kit_${kitId}_${section}`;
        localStorage.removeItem(storageKey);
      });
    } catch (error) {
      console.warn('Failed to clear persisted kit data:', error);
    }
  };

  // NEW: Enhanced completion state persistence
  const persistCompletionState = (kitId: string, completionData: {
    completedAt: Date;
    completedBy: string;
    sections: string[];
    validationScore: number;
    kitIndex: number;
  }) => {
    try {
      if (!kitId) return;
      
      const storageKey = `completion_${kitId}`;
      localStorage.setItem(storageKey, JSON.stringify({
        ...completionData,
        completedAt: completionData.completedAt.toISOString(),
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      console.warn('Failed to persist completion state:', error);
    }
  };

  // NEW: Load completion state from persistence
  const loadCompletionState = (kitId: string) => {
    try {
      if (!kitId) return null;
      
      const storageKey = `completion_${kitId}`;
      const stored = localStorage.getItem(storageKey);
      
      if (stored) {
        const parsed = JSON.parse(stored);
        // Only load if within last 7 days
        const storedTime = new Date(parsed.timestamp);
        const now = new Date();
        const daysDiff = (now.getTime() - storedTime.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysDiff < 7) {
          return {
            ...parsed,
            completedAt: new Date(parsed.completedAt)
          };
        }
      }
    } catch (error) {
      console.warn('Failed to load completion state:', error);
    }
    return null;
  };

  // NEW: Clear completion state
  const clearCompletionState = (kitId: string) => {
    try {
      if (!kitId) return;
      
      const storageKey = `completion_${kitId}`;
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.warn('Failed to clear completion state:', error);
    }
  };

  // NEW: Clear all persisted data (for cleanup)
  const clearAllPersistedData = () => {
    try {
      // Clear user info
      localStorage.removeItem('user_info');
      
      // Clear kit data
      kits.forEach((_, index) => {
        clearPersistedKitData(index);
      });
      
      // Clear completion states
      kits.forEach(kit => {
        clearCompletionState(kit.id);
      });
      
      console.log('All persisted data cleared');
    } catch (error) {
      console.warn('Failed to clear all persisted data:', error);
    }
  };







  // NEW: Load all completion states on component mount
  React.useEffect(() => {
    if (!isMountedRef.current) return;
    
    const loadAllCompletionStates = () => {
      const loadedCompletions = new Map<string, {
        completedAt: Date;
        completedBy: string;
        sections: string[];
        validationScore: number;
        kitIndex: number;
      }>();

      kits.forEach((kit, index) => {
        const completionState = loadCompletionState(kit.id);
        if (completionState) {
          loadedCompletions.set(kit.id, {
            ...completionState,
            kitIndex: index
          });
        }
      });

      if (isMountedRef.current) {
        setCompletionHistory(loadedCompletions);
      }
    };

    loadAllCompletionStates();
  }, [kits]);

  // NEW: Form state synchronization between panels
  const syncFormStateAcrossPanels = (kitIndex: number, section: 'childInfo' | 'consent' | 'questionnaire') => {
    const childData = childrenData[kitIndex];
    if (!childData) return;

    // Update the corresponding form instance
    switch (section) {
      case 'childInfo':
        if (allChildForms[kitIndex]) {
          if (childData.childInfo) {
            allChildForms[kitIndex].reset(childData.childInfo);
          } else {
            // Reset to default values if no child info
            const defaultValues = {
              firstName: "",
              lastName: "",
              dob: "",
              dueDate: "",
              isNotYetBorn: false,
              sex: undefined,
              ethnicity: [],
              ethnicityOther: "",
              relationshipToChild: undefined,
            };
            allChildForms[kitIndex].reset(defaultValues);
          }
        }
        break;
      case 'consent':
        // Consent is handled by state, no form reset needed
        break;
      case 'questionnaire':
        // Questionnaire is handled by state, no form reset needed
        break;
    }

    // Trigger validation across all panels to ensure consistency
    validateKitRealTime(kitIndex);
  };

  // NEW: Enhanced data validation before allowing completion
  const validateAllDataBeforeCompletion = () => {
    const validationResults = kits.map((_, index) => {
      const childData = childrenData[index];
      if (!childData) {
        return {
          kitIndex: index,
          isValid: false,
          errors: ['Kit data not found'],
          missingFields: ['All sections']
        };
      }

      const validation = validateKitCompletion(index);
      const sectionValidations = {
        childInfo: validateKitSection(index, 'childInfo'),
        consent: validateKitSection(index, 'consent'),
        questionnaire: validateKitSection(index, 'questionnaire')
      };

      return {
        kitIndex: index,
        isValid: validation.isValid,
        errors: validation.missingFields,
        missingFields: validation.missingFields,
        sectionValidations
      };
    });

    const allValid = validationResults.every(v => v.isValid);
    const invalidKits = validationResults.filter(v => !v.isValid);

    return {
      isValid: allValid,
      validationResults,
      invalidKits,
      summary: {
        totalKits: kits.length,
        validKits: validationResults.filter(v => v.isValid).length,
        invalidKits: invalidKits.length,
        totalErrors: invalidKits.reduce((sum, kit) => sum + kit.errors.length, 0)
      }
    };
  };



  // NEW: Load all persisted data on component mount
  const loadAllPersistedData = () => {
    if (kits.length === 0) return;
    
    console.log('loadAllPersistedData called with kits:', kits);
    
    const loadedData = kits.map((kit, index) => {
      const childInfo = loadPersistedKitData(index, 'childInfo');
      const consent = loadPersistedKitData(index, 'consent');
      const questionnaire = loadPersistedKitData(index, 'questionnaire');

      console.log(`Kit ${index} (${kit.id}) loaded data:`, {
        childInfo,
        consent,
        questionnaire
      });

      return {
        kitId: kit.id,
        childInfo,
        consentAccepted: consent?.consentAccepted || false,
        consentData: consent?.consentData || null,
        questionnaire: questionnaire || {
          question1: undefined,
          question1Details: "",
          question2: undefined,
          question2Details: "",
          question3: undefined,
          question3Details: "",
        },
        validationErrors: {
          childInfo: [],
          consent: [],
          questionnaire: [],
        },
        isDirty: false,
      };
    });

    console.log('Setting childrenData to:', loadedData);
    setChildrenData(loadedData);

    // Update completion status based on loaded data
    const newCompletedKits = new Set<string>();
    loadedData.forEach((childData, index) => {
      // Use the same logic as validateKitCompletion to determine completion
      const hasChildInfo = !!childData.childInfo;
      const hasConsent = childData.consentAccepted;
      const hasQuestionnaire = childData.questionnaire.question1 !== undefined &&
                               childData.questionnaire.question2 !== undefined &&
                               childData.questionnaire.question3 !== undefined;
      
      const isCompleted = hasChildInfo && hasConsent && hasQuestionnaire;
      
      console.log(`Kit ${index} completion check:`, {
        hasChildInfo: !!childData.childInfo,
        consentAccepted: childData.consentAccepted,
        question1: childData.questionnaire.question1,
        question2: childData.questionnaire.question2,
        question3: childData.questionnaire.question3,
        isCompleted
      });
      
      if (isCompleted) {
        newCompletedKits.add(childData.kitId);
        console.log(`Added kit ${childData.kitId} to completed set`);
      }
    });
    
    console.log('Final completedKits set from loadAllPersistedData:', Array.from(newCompletedKits));
    
    // Test the completion logic for each kit
    loadedData.forEach((childData, index) => {
      const hasChildInfo = !!childData.childInfo;
      const hasConsent = childData.consentAccepted;
      const hasQuestionnaire = childData.questionnaire.question1 !== undefined &&
                               childData.questionnaire.question2 !== undefined &&
                               childData.questionnaire.question3 !== undefined;
      
      console.log(`Kit ${index} completion test:`, {
        hasChildInfo,
        hasConsent,
        hasQuestionnaire,
        isCompleted: hasChildInfo && hasConsent && hasQuestionnaire
      });
    });
    
    setCompletedKits(newCompletedKits);
  };

  // NEW: Auto-save functionality for form data
  const autoSaveFormData = React.useCallback(() => {
    childrenData.forEach((childData, index) => {
      if (childData.isDirty) {
        if (childData.childInfo) {
          persistKitData(index, 'childInfo', childData.childInfo);
        }
        if (childData.consentAccepted) {
          persistKitData(index, 'consent', { consentAccepted: childData.consentAccepted, consentData: childData.consentData });
        }
        if (childData.questionnaire.question1 !== undefined) {
          persistKitData(index, 'questionnaire', childData.questionnaire);
        }
      }
    });
  }, [childrenData]);

  // Auto-save every 30 seconds when forms are dirty
  React.useEffect(() => {
    const interval = setInterval(() => {
      if (isMountedRef.current) {
        const hasDirtyForms = childrenData.some(childData => childData.isDirty);
        if (hasDirtyForms) {
          autoSaveFormData();
        }
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [autoSaveFormData]); // Removed childrenData dependency to prevent infinite loops

  // Validate all kits when childrenData changes (after loading persisted data)
  React.useEffect(() => {
    if (!isMountedRef.current || childrenData.length === 0) return;
    
    console.log('childrenData changed, validating all kits');
    console.log('Current childrenData:', childrenData);
    
    // Validate all kits to update their completion status
    kits.forEach((_, index) => {
      const childData = childrenData[index];
      if (childData) {
        console.log(`Validating kit ${index} with data:`, childData);
        const overallValidation = validateKitRealTimeWithData(index, childData);
        console.log(`Kit ${index} validation result:`, overallValidation);
      }
    });
  }, [childrenData.length]); // Only run when the length changes (after initial load)

  // Debug completedKits changes
  React.useEffect(() => {
    console.log('completedKits changed:', Array.from(completedKits));
  }, [completedKits]);

  // Debug childrenData changes
  React.useEffect(() => {
    console.log('childrenData changed:', childrenData);
  }, [childrenData]);

  // Debug completedKits changes
  React.useEffect(() => {
    console.log('completedKits changed:', Array.from(completedKits));
  }, [completedKits]);

  // Export current form data for debugging/backup
  const exportFormData = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      userInfo,
      kitsData: childrenData,
      validationSummary: getFormValidationSummary(),
      completionStatus: {
        completedKits: Array.from(completedKits),
        totalKits: kits.length,
        completionPercentage: Math.round((completedKits.size / kits.length) * 100)
      }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `multi-kit-onboarding-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Watch for changes in kits prop
  React.useEffect(() => {
    console.log('Kits prop changed:', kits);
    if (kits.length > 0) {
      setKitsData(kits);
    }
  }, [kits]);

  // Watch for changes in kitsData state
  React.useEffect(() => {
    console.log('kitsData state changed:', kitsData);
  }, [kitsData]);

  // Load persisted data on component mount (after kits are available)
  React.useEffect(() => {
    if (!isMountedRef.current || kits.length === 0) return;
    
    console.log('Loading persisted data for kits:', kits);
    loadAllPersistedData();
  }, [kits.length]); // Only run when kits are available

  // Load persisted user info on component mount
  React.useEffect(() => {
    if (!isMountedRef.current) return;
    
    const persistedUserInfo = loadPersistedUserInfo();
    if (persistedUserInfo) {
      console.log('Setting userInfo from persisted data:', persistedUserInfo);
      setUserInfo(persistedUserInfo);
    }
  }, []); // Only run once on mount



  // Initialize children data array based on kits (only if no data has been loaded)
  React.useEffect(() => {
    if (!isMountedRef.current || childrenData.length > 0) return;
    
    console.log('Initializing children data array with kits:', kits);
    
    const initialChildrenData = kits.map((kit) => ({
      kitId: kit.id,
      childInfo: null,
      consentAccepted: false,
      consentData: null,
      questionnaire: {
        question1: undefined,
        question1Details: "",
        question2: undefined,
        question2Details: "",
        question3: undefined,
        question3Details: "",
      },
      // Initialize validation errors and isDirty
      validationErrors: {
        childInfo: [],
        consent: [],
        questionnaire: [],
      },
      isDirty: false,
    }));
    
    console.log('Setting initial children data:', initialChildrenData);
    
    if (isMountedRef.current) {
      setChildrenData(initialChildrenData);
    }
  }, [kits, childrenData.length]); // Only run if no data has been loaded yet

  // Fetch existing user data on component mount
  React.useEffect(() => {
    if (!isMountedRef.current) return;
    
    console.log("Component mounted, user:", user);
    console.log("invitationData:", invitationData);
    
    const fetchExistingData = async () => {
      if (!user?.email) return;

      try {
        const url = invitationData?.orderId
          ? `/api/user/current?orderId=${invitationData.orderId}`
          : "/api/user/current";

        console.log("Fetching existing user data from:", url);
        const response = await fetch(url);
        console.log("Response status:", response.status);
        
        if (response.ok) {
          const userData = await response.json();
          console.log("Fetched user data:", userData);
          if (isMountedRef.current) {
            setExistingUserData(userData);
          }
        } else {
          console.log("Failed to fetch user data, status:", response.status);
        }
      } catch (error) {
        console.error("Error fetching existing user data:", error);
      }
    };

    fetchExistingData();
  }, [user, invitationData]);

  // Create forms for each kit - using a different approach to avoid hooks in loops
  const childForms = React.useMemo(() => {
    // Create forms array with proper hook calls
    const forms = kits.map((kit, index) => {
      const existingChild = existingUserData?.children?.find((child: any) => 
        child.kitId === kit.id
      );
      
      // Return form configuration instead of calling useForm here
      return {
        kitId: kit.id,
        defaultValues: {
          firstName: existingChild?.firstName || "",
          lastName: existingChild?.lastName || "",
          dob: existingChild?.dob || "",
          dueDate: existingChild?.dueDate || "",
          isNotYetBorn: !!existingChild?.dueDate,
          sex: existingChild?.sex || undefined,
          ethnicity: existingChild?.ethnicities || [],
          ethnicityOther: "",
          relationshipToChild: undefined,
        }
      };
    });
    return forms;
  }, [kits, existingUserData]);

  // Create individual form instances using the configuration
  const childForm1 = useForm<ChildInfo>({
    resolver: zodResolver(childInfoSchema),
    defaultValues: childForms[0]?.defaultValues || {
      firstName: "",
      lastName: "",
      dob: "",
      dueDate: "",
      isNotYetBorn: false,
      sex: undefined,
      ethnicity: [],
      ethnicityOther: "",
      relationshipToChild: undefined,
    },
  });

  const childForm2 = useForm<ChildInfo>({
    resolver: zodResolver(childInfoSchema),
    defaultValues: childForms[1]?.defaultValues || {
      firstName: "",
      lastName: "",
      dob: "",
      dueDate: "",
      isNotYetBorn: false,
      sex: undefined,
      ethnicity: [],
      ethnicityOther: "",
      relationshipToChild: undefined,
    },
  });

  const childForm3 = useForm<ChildInfo>({
    resolver: zodResolver(childInfoSchema),
    defaultValues: childForms[2]?.defaultValues || {
      firstName: "",
      lastName: "",
      dob: "",
      dueDate: "",
      isNotYetBorn: false,
      sex: undefined,
      ethnicity: [],
      ethnicityOther: "",
      relationshipToChild: undefined,
    },
  });

  const childForm4 = useForm<ChildInfo>({
    resolver: zodResolver(childInfoSchema),
    defaultValues: childForms[3]?.defaultValues || {
      firstName: "",
      lastName: "",
      dob: "",
      dueDate: "",
      isNotYetBorn: false,
      sex: undefined,
      ethnicity: [],
      ethnicityOther: "",
      relationshipToChild: undefined,
    },
  });

  const childForm5 = useForm<ChildInfo>({
    resolver: zodResolver(childInfoSchema),
    defaultValues: childForms[4]?.defaultValues || {
      firstName: "",
      lastName: "",
      dob: "",
      dueDate: "",
      isNotYetBorn: false,
      sex: undefined,
      ethnicity: [],
      ethnicityOther: "",
      relationshipToChild: undefined,
    },
  });

  const childForm6 = useForm<ChildInfo>({
    resolver: zodResolver(childInfoSchema),
    defaultValues: childForms[5]?.defaultValues || {
      firstName: "",
      lastName: "",
      dob: "",
      dueDate: "",
      isNotYetBorn: false,
      sex: undefined,
      ethnicity: [],
      relationshipToChild: undefined,
    },
  });

  // Create array of forms for easy access (memoized to prevent infinite loops)
  const allChildForms = React.useMemo(() => [
    childForm1, childForm2, childForm3, childForm4, childForm5, childForm6
  ], [childForm1, childForm2, childForm3, childForm4, childForm5, childForm6]);

  // Initialize forms with proper default values when childrenData changes
  React.useEffect(() => {
    if (!isMountedRef.current || childrenData.length === 0) return;
    
    // Initialize all forms with proper default values
    allChildForms.forEach((form, index) => {
      if (form && childrenData[index]) {
        const childData = childrenData[index];
        if (childData.childInfo) {
          // If there's existing child info, use it
          form.reset(childData.childInfo);
        } else {
          // Otherwise, reset to default values
          const defaultValues = {
            firstName: "",
            lastName: "",
            dob: "",
            dueDate: "",
            isNotYetBorn: false,
            sex: undefined,
            ethnicity: [],
            ethnicityOther: "",
            relationshipToChild: undefined,
          };
          form.reset(defaultValues);
        }
      }
    });
  }, [childrenData.length, allChildForms]); // Only run when childrenData length changes or forms change

  // User info form
  const userForm = useForm<UserInfo>({
    resolver: zodResolver(userInfoSchema),
    defaultValues: {
      firstName: user?.profile?.firstName || "",
      lastName: user?.profile?.lastName || "",
      address: user?.profile?.address || "",
      city: user?.profile?.city || "",
      state: user?.profile?.state || "",
      zipCode: user?.profile?.zipCode || "",
      phone: user?.profile?.phone || "",
    },
  });

  // Update form when userInfo changes
  React.useEffect(() => {
    if (userInfo && userForm) {
      console.log('Updating userForm with userInfo:', userInfo);
      console.log('Form values before reset:', userForm.getValues());
      
      // Add a small delay to ensure form is fully ready
      setTimeout(() => {
        if (userForm && userInfo) {
          console.log('Resetting form with userInfo after delay:', userInfo);
          userForm.reset(userInfo);
          console.log('Form values after reset:', userForm.getValues());
        }
      }, 100);
    }
  }, [userInfo, userForm]);



  // Note: We're now using user.profile directly instead of fetching existingUserData

  // Handle user info submission
  const handleUserInfoSubmit = (values: UserInfo) => {
    setUserInfo(values);
    // Persist user info to localStorage
    persistUserInfo(values);
    // Auto-focus on the first kit when parent information is completed
    if (activeKitIndex === -1 && kits.length > 0) {
      setActiveKitIndex(0);
      // Auto-expand the first kit for immediate interaction
      setExpandedKits(prev => new Set(prev).add(kits[0].id));
    }
  };

  // Handle final submission of all kits
  const handleCompleteOnboarding = async () => {
    if (!userInfo) {
      setSaveError("Please complete user information first");
      return;
    }

    // Enhanced validation before allowing completion
    const validationResult = validateAllDataBeforeCompletion();
    if (!validationResult.isValid) {
      const errorMessage = `Please fix the following issues before submitting:\n${validationResult.invalidKits.map(kit => 
        `Kit ${kit.kitIndex + 1}: ${kit.errors.join(', ')}`
      ).join('\n')}`;
      setSaveError(errorMessage);
      return;
    }

    setGlobalLoading(true);
    setGlobalError(null);
    setGlobalSuccess(null);
    setSaving(true);
    setSaveError(null);

    try {
      // Submit each kit's data with progress tracking
      for (let i = 0; i < childrenData.length; i++) {
        const childData = childrenData[i];
        const kitId = childData.kitId;
        
        // Show progress for each kit
        setKitLoading(kitId, true);
        
        const emailToUse = invitationData?.parentEmail || user?.email;
        
        const requestBody = {
          userEmail: emailToUse,
          userInfo,
          childInfo: childData.childInfo,
          consentAccepted: childData.consentAccepted,
          consentData: childData.consentData,
          questionnaire: childData.questionnaire,
          kitId: childData.kitId,
        };

        const res = await fetch("/api/onboarding/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        if (!res.ok) {
          throw new Error(`Failed to save onboarding data for kit ${childData.kitId}`);
        }

        // Show success for each completed kit
        setKitLoading(kitId, false);
        setKitSuccess(kitId, true);
        
        // Small delay to show progress
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Clear all persisted data on successful submission
      kits.forEach((_, index) => {
        clearPersistedKitData(index);
      });
      
      // Clear persisted user info
      try {
        localStorage.removeItem('user_info');
        console.log('User info cleared from localStorage');
      } catch (error) {
        console.warn('Failed to clear persisted user info:', error);
      }

      // Set onboarding as complete to show confirmation step
      setOnboardingComplete(true);
      
    } catch (err: any) {
      const errorMessage = err.message || "Unknown error occurred";
      setSaveError(errorMessage);
      showGlobalError(errorMessage);
      
      // Clear loading states for all kits
      kits.forEach(kit => {
        setKitLoading(kit.id, false);
      });
    } finally {
      setGlobalLoading(false);
      setSaving(false);
    }
  };

  // Get kit status icon
  const getKitStatusIcon = (kitIndex: number) => {
    if (isKitCompleted(kitIndex)) {
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    }
    if (activeKitIndex === kitIndex) {
      return <Circle className="w-5 h-5 text-blue-600 fill-blue-600" />;
    }
    return <Clock className="w-5 h-5 text-gray-400" />;
  };

  // Get kit status text
  const getKitStatusText = (kitIndex: number) => {
    if (isKitCompleted(kitIndex)) {
      return "Completed";
    }
    if (activeKitIndex === kitIndex) {
      return "In Progress";
    }
    return "Pending";
  };

  // Get kit status color variant
  const getKitStatusVariant = (kitIndex: number) => {
    if (isKitCompleted(kitIndex)) {
      return "default";
    }
    if (activeKitIndex === kitIndex) {
      return "secondary";
    }
    return "outline";
  };

  if (!user) {
    return <div>Loading user data...</div>;
  }

  return (
    <div className="relative">
      {/* Global Loading Overlay */}
      {globalLoading && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 shadow-2xl border border-gray-200">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Processing Onboarding
              </h3>
              <p className="text-gray-600 mb-4">
                Please wait while we save your information...
              </p>
              <div className="text-sm text-blue-600">
                This may take a few moments
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Enhanced Header with Better Visual Hierarchy - Only show when onboarding is not complete */}
      {!onboardingComplete && (
        <div className="mb-8 sm:mb-10">
          
          {/* Enhanced Progress Bar with Labels and Visual Feedback */}
          <div className="mt-6">
            <div className="flex justify-between text-xs text-gray-600 mb-2">
              <span>0%</span>
              <span className="font-medium text-blue-600">
                {Math.round((completedKits.size / kits.length) * 100)}% Complete
              </span>
              <span>100%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner">
              <div
                className="bg-blue-600 h-4 rounded-full transition-all duration-700 ease-out relative overflow-hidden"
                style={{ width: `${(completedKits.size / kits.length) * 100}%` }}
              >
                {/* Animated shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
              </div>
            </div>
            {/* Progress milestones */}
            <div className="flex justify-between mt-2 text-xs text-gray-600">
              <span>Start</span>
              <span>In Progress</span>
              <span>Complete</span>
            </div>
          </div>
        </div>
      )}

      {/* Global UI States - Loading, Error, Success Messages */}
      {globalLoading && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-3 text-blue-800">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="font-medium">Processing your onboarding data...</span>
          </div>
        </div>
      )}

      {globalError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-3 text-red-800">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium">{globalError}</span>
          </div>
        </div>
      )}

      {globalSuccess && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-3 text-blue-800">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium">{globalSuccess}</span>
          </div>
        </div>
      )}

      {/* Show Confirmation Step when onboarding is complete */}
      {onboardingComplete && (
        <div className="mt-8">
          <ConfirmationStep 
            onDashboard={() => router.push("/dashboard")}
          />
        </div>
      )}

        {/* Only show main form content when onboarding is not complete */}
        {!onboardingComplete && (
          <>
            <div className="mb-8">
            {/* Quick Actions */}
            
      </div>

      {/* Global Parent Information Section - Applies to All Kits */}
      <div className="mb-8 border border-gray-200 rounded-lg p-6 bg-white shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full flex items-center justify-center">
            <User />
          </div>
          <h3 className="text-xl font-semibold text-gray-900">Parent Information</h3>
          <div className="ml-auto flex items-center gap-2">
            {/* Show completion status for this section */}
            {userInfo && (
              <Badge variant="default" className="text-xs">
                ✓ Completed
              </Badge>
            )}
            {/* Show loading state */}
            {globalLoading && (
              <div className="flex items-center gap-1 text-xs text-blue-600">
                <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                Saving...
              </div>
            )}
            {/* Show success state */}
            {globalSuccess && (
              <Badge 
                variant="default" 
                className="text-xs bg-blue-600 animate-pulse"
              >
                ✓ Saved
              </Badge>
            )}
          </div>
        </div>
        
        {/* Error message display */}
        {globalError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{globalError}</span>
            </div>
          </div>
        )}
        
        <UserInfoStep
          form={{ ...userForm, US_STATES }}
          user={user}
          onNext={handleUserInfoSubmit}
          isCompleted={!!userInfo}
          invitationData={invitationData}
        />
      </div>

      {/* Completion Celebration Overlay - Top Level */}
      {celebratingKit && (
        <div className="fixed top-0 left-0 right-0 bottom-0 bg-blue-500/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 shadow-2xl border-4 border-blue-400 animate-pulse max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="text-center">
              <div className="text-6xl mb-4 animate-bounce">🎉</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Kit {kits.find(k => k.id === celebratingKit)?.kitNumber} Completed!
              </h3>
              <p className="text-gray-600 mb-4">
                {(() => {
                  const kitIndex = kits.findIndex(k => k.id === celebratingKit);
                  const isLastKit = kitIndex === kits.length - 1;
                  return isLastKit 
                    ? "Congratulations! You've completed all kits for this order!"
                    : "Great job! You'll be automatically moved to the next kit in a moment...";
                })()}
              </p>
              
              {/* Enhanced completion details */}
              <div className="bg-blue-50 rounded-lg p-4 mb-4 border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Completion Score:</span>
                  <span className="text-lg font-bold text-blue-800">
                    {(() => {
                      const kitIndex = kits.findIndex(k => k.id === celebratingKit);
                      return kitIndex >= 0 ? getKitCompletionDetails(kitIndex).score : 100;
                    })()}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-1000 ease-out"
                    style={{ 
                      width: `${(() => {
                        const kitIndex = kits.findIndex(k => k.id === celebratingKit);
                        return kitIndex >= 0 ? getKitCompletionDetails(kitIndex).score : 100;
                      })()}%` 
                    }}
                  ></div>
                </div>
              </div>
              
              {/* Completion timestamp */}
              <div className="text-xs text-gray-500">
                Completed at {new Date().toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Kit Panels with Smooth Transitions */}
      {kits.map((kit, index) => (
        <div 
          key={kit.id}
          data-kit-id={kit.id}
          className={`
            transition-all duration-500 ease-out
            ${activeKitIndex === index 
              ? 'opacity-100 scale-100 translate-y-0 z-20' 
              : 'opacity-100 scale-95 translate-y-2 z-10'
            }
          `}
        >
          {/* Enhanced KitPanel with Smooth Transitions */}
          <div
            className={`
              transition-all duration-500 ease-out transform relative
              ${!userInfo 
                ? 'opacity-40 scale-95 translate-y-2 cursor-not-allowed' 
                : 'opacity-100 scale-100 translate-y-0'
              }
            `}
          >
            
            <KitPanel
              key={kit.id}
              kit={kit}
              kitIndex={index}
              totalKits={kits.length}
              isActive={activeKitIndex === index}
              isCompleted={isKitCompleted(index)}
              isExpanded={isKitExpanded(kit.id)}
              isDisabled={!userInfo}
              onToggleExpanded={() => toggleKitExpanded(kit.id)}
              onActivate={() => activateKit(index)}
              childrenData={childrenData[index]}
              validationState={getKitValidation(index)}
              onValidate={() => validateKitRealTime(index)}
              
            >
            {/* Child Info Section */}
            <div className="border border-gray-200 rounded-lg p-6 bg-white shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">1</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Child Information</h3>
                <div className="ml-auto flex items-center gap-2">
                  {/* Show completion status for this section */}
                  {childrenData[index]?.childInfo && (
                    <Badge variant="default" className="text-xs">
                      ✓ Completed
                    </Badge>
                  )}
                  {/* Show loading state */}
                  {loadingStates.get(kit.id) && (
                    <div className="flex items-center gap-1 text-xs text-blue-600">
                      <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      Saving...
                    </div>
                  )}
                  {/* Show success state */}
                  {successStates.get(kit.id) && (
                    <Badge 
                      variant="default" 
                      className="text-xs bg-blue-600 animate-pulse"
                    >
                      ✓ Saved
                    </Badge>
                  )}
                </div>
              </div>
              
              {/* Error message display */}
              {errorStates.get(kit.id) && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 text-red-700 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{errorStates.get(kit.id)}</span>
                  </div>
                </div>
              )}
              
              <ChildInfoStep
                form={allChildForms[index]}
                user={user}
                userInfo={userInfo}
                order={order}
                selectedKitId={kit.id}
                kitContext={{
                  kitNumber: kit.kitNumber,
                  totalKits: kits.length,
                  kitType: kit.kitType,
                  childName: childrenData[index]?.childInfo?.firstName
                }}
                onSave={(values: ChildInfo) => handleChildInfoSubmit(index, values)}

                isCompleted={!!childrenData[index]?.childInfo}
                isReadOnly={!!childrenData[index]?.childInfo}
              />
            </div>

            {/* Gap between sections */}
            <div className="h-6"></div>

            {/* Consent Section - Show collapsed header if not ready, full form if ready */}
            <div className={`border rounded-lg p-6 transition-all duration-200 ${
              childrenData[index]?.childInfo 
                ? 'border-gray-200 bg-white shadow-sm' 
                : 'border-gray-100 bg-gray-50'
            }`}>
              {childrenData[index]?.childInfo ? (
                // Full consent form when child info is completed
                <>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">2</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Consent Form</h3>
                <div className="ml-auto flex items-center gap-2">
                  {/* Show completion status for this section */}
                  {childrenData[index]?.consentAccepted && (
                    <Badge variant="default" className="text-xs">
                      ✓ Completed
                    </Badge>
                  )}
                  {/* Show loading state */}
                  {loadingStates.get(kit.id) && (
                    <div className="flex items-center gap-1 text-xs text-blue-600">
                      <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      Saving...
                    </div>
                  )}
                  {/* Show success state */}
                  {successStates.get(kit.id) && (
                    <Badge variant="default" className="text-xs bg-blue-600">
                      ✓ Saved
                    </Badge>
                  )}
                </div>
              </div>
              
              {/* Error message display */}
              {errorStates.get(kit.id) && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 text-red-700 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{errorStates.get(kit.id)}</span>
                  </div>
                </div>
              )}
              
              <ConsentStep
                consentAccepted={childrenData[index]?.consentAccepted || false}
                setConsentAccepted={(accepted: boolean) => {
                  // Update consent status immediately for real-time validation
                  setChildrenData(prev => prev.map((childData, i) => 
                    i === index 
                      ? { 
                          ...childData, 
                          consentAccepted: accepted,
                          isDirty: true,
                          validationErrors: {
                            ...childData.validationErrors,
                            consent: []
                          }
                        }
                      : childData
                  ));
                }}
                onSaveConsent={(consentData) => {
                  // This will be called when the Save Consent button is clicked
                  handleConsentSubmit(index, true, consentData);
                }}
                onConsentDataChange={(consentData) => {
                  // This will be called when consent data changes (for real-time updates)
                  setChildrenData(prev => prev.map((childData, i) => 
                    i === index 
                      ? { 
                          ...childData, 
                          consentData: consentData,
                          isDirty: true
                        }
                      : childData
                  ));
                }}
                existingConsentData={childrenData[index]?.consentData || null}
                childInfo={childrenData[index]?.childInfo || null}
                userInfo={userInfo}
                kitContext={{
                  kitNumber: kit.kitNumber,
                  totalKits: kits.length,
                  kitType: kit.kitType
                }}
                isActive={activeKitIndex === index}
                saving={loadingStates.get(`${kit.id}-consent`) || false}
              />

                </>
              ) : (
                // Collapsed header when consent is not ready
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">2</span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-500">Consent Form</h3>
                </div>
              )}
            </div>

            {/* Gap between sections */}
            <div className="h-6"></div>

            {/* Questionnaire Section - Show collapsed header if not ready, full form if ready */}
            <div className={`border rounded-lg p-6 transition-all duration-200 ${
              childrenData[index]?.childInfo && childrenData[index]?.consentData
                ? 'border-gray-200 bg-white shadow-sm' 
                : 'border-gray-100 bg-gray-50'
            }`}>
              {childrenData[index]?.childInfo && childrenData[index]?.consentData ? (
                // Full questionnaire form when both child info and consent are completed
                <>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">3</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Questionnaire</h3>
                <div className="ml-auto flex items-center gap-2">
                  {/* Show completion status for this section */}
                  {childrenData[index]?.questionnaire.question1 !== undefined && 
                   childrenData[index]?.questionnaire.question2 !== undefined && 
                   childrenData[index]?.questionnaire.question3 !== undefined && (
                    <Badge variant="default" className="text-xs">
                      ✓ Completed
                    </Badge>
                  )}
                  {/* Show loading state */}
                  {loadingStates.get(kit.id) && (
                    <div className="flex items-center gap-1 text-xs text-blue-600">
                      <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      Saving...
                    </div>
                  )}
                  {/* Show success state */}
                  {successStates.get(kit.id) && (
                    <Badge 
                      variant="default" 
                      className="text-xs bg-blue-600 animate-pulse"
                    >
                      ✓ Saved
                    </Badge>
                  )}
                </div>
              </div>
              
              {/* Error message display */}
              {errorStates.get(kit.id) && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 text-red-700 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{errorStates.get(kit.id)}</span>
                  </div>
                </div>
              )}
              
              <QuestionnaireStep
                questionnaire={childrenData[index]?.questionnaire || {
                  question1: undefined,
                  question1Details: "",
                  question2: undefined,
                  question2Details: "",
                  question3: undefined,
                  question3Details: "",
                }}
                setQuestionnaire={(questionnaire: any) => {
                  console.log("setQuestionnaire called with:", questionnaire);
                  console.log("Updating kit index:", index);
                  
                  // Update state immediately for real-time UI updates
                  setChildrenData(prev => {
                    console.log("Previous childrenData:", prev);
                    const updated = prev.map((childData, i) => 
                      i === index 
                        ? { 
                            ...childData, 
                            questionnaire,
                            isDirty: true,
                            validationErrors: {
                              ...childData.validationErrors,
                              questionnaire: []
                            }
                          }
                        : childData
                    );
                    console.log("Updated childrenData:", updated);
                    return updated;
                  });
                  
                  // Also persist the data
                  persistKitData(index, 'questionnaire', questionnaire);
                }}
                order={order}
                selectedKitId={kit.id}
                kitContext={`Kit ${kit.kitNumber} of ${kits.length}: ${kit.kitType}`}
                isLastKit={index === kits.length - 1}
                onComplete={() => {}}
                onSaveAnswers={(questionnaire: any) => {
                  // This will be called when the Continue button is clicked
                  handleQuestionnaireSubmit(index, questionnaire);
                }}

              />
                </>
              ) : (
                // Collapsed header when questionnaire is not ready
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">3</span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-500">Questionnaire</h3>
                </div>
              )}
            </div>

            {/* Gap between sections */}
            <div className="h-6"></div>

            
          </KitPanel>
        </div>
      </div>
    ))}
    
    {/* Enhanced Complete Onboarding Button */}
    <div className="flex justify-center mt-10">
      {(() => { console.log('Button render - completedKits.size:', completedKits.size, 'kits.length:', kits.length, 'completedKits:', Array.from(completedKits)); return null; })()}
      <Button
        onClick={handleCompleteOnboarding}
        disabled={saving || completedKits.size !== kits.length || globalLoading}
        size="lg"
        className={`
          px-10 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200
          ${globalLoading ? 'opacity-75 cursor-not-allowed' : ''}
        `}
      >
        {saving || globalLoading ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            {globalLoading ? 'Processing...' : 'Saving...'}
          </div>
        ) : (
          "Complete Onboarding"
        )}
      </Button>
    </div>

    {/* Enhanced Error Display */}
    {saveError && (
      <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center gap-3 text-red-800">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="font-medium">{saveError}</span>
        </div>
        <div className="mt-2 text-sm text-red-700">
          Please review the errors above and try again. If the problem persists, contact support.
        </div>
      </div>
    )}
          </>
        )}
  </div>
);
}
