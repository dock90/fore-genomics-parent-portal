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
    relationshipToChild: z.enum(["MOTHER", "FATHER", "GUARDIAN", "OTHER"]).optional(),
  })
  .refine(
    (data) => {
      if (data.isNotYetBorn) {
        return !!data.dueDate;
      }
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
  const router = useRouter();
  
  // State management for multi-panel approach
  const [kitsData, setKitsData] = React.useState<Kit[]>(kits);
  const [activeKitIndex, setActiveKitIndex] = React.useState(0);
  const [childrenData, setChildrenData] = React.useState<ChildData[]>([]);
  const [completedKits, setCompletedKits] = React.useState<Set<string>>(new Set());
  const [userInfo, setUserInfo] = React.useState<UserInfo | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [existingUserData, setExistingUserData] = useState<any>(null);
  const [expandedKits, setExpandedKits] = useState<Set<string>>(new Set([kits[0]?.id]));
  
  // Add validation state management
  const [validationStates, setValidationStates] = React.useState<Map<string, {
    isValid: boolean;
    errors: string[];
    lastValidated: Date;
  }>>(new Map());

  // Navigation functions
  const goToNextKit = () => {
    if (activeKitIndex < kits.length - 1) {
      activateKit(activeKitIndex + 1);
    }
  };

  const goToPreviousKit = () => {
    if (activeKitIndex > 0) {
      activateKit(activeKitIndex - 1);
    }
  };

  const goToKit = (kitIndex: number) => {
    if (kitIndex >= 0 && kitIndex < kits.length) {
      activateKit(kitIndex);
    }
  };

  // Kit panel management functions
  const toggleKitExpanded = (kitId: string) => {
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
    setActiveKitIndex(kitIndex);
    
    // Synchronize form state when switching to a kit
    const childData = childrenData[kitIndex];
    if (childData && allChildForms[kitIndex]) {
      // Sync child info form if data exists
      if (childData.childInfo) {
        allChildForms[kitIndex].reset(childData.childInfo);
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
    
    if (isKitCompleted(activeKitIndex) && activeKitIndex < kits.length - 1) {
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
  }, [completedKits, kits.length, childrenData]); // Removed activeKitIndex from dependencies

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
      
      if (childInfo.isNotYetBorn) {
        if (childInfo.dueDate) childInfoScore += 20;
        if (childInfo.relationshipToChild) childInfoScore += 20;
      } else {
        if (childInfo.firstName) childInfoScore += 8;
        if (childInfo.lastName) childInfoScore += 8;
        if (childInfo.dob) childInfoScore += 8;
        if (childInfo.ethnicity && childInfo.ethnicity.length > 0) childInfoScore += 8;
        if (childInfo.relationshipToChild) childInfoScore += 8;
      }
      
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
    if (childData.questionnaire.question1 !== undefined) questionnaireScore += 10;
    if (childData.questionnaire.question2 !== undefined) questionnaireScore += 10;
    if (childData.questionnaire.question3 !== undefined) questionnaireScore += 10;
    
    completionScore += questionnaireScore;

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

  const showGlobalSuccess = (message: string) => {
    setGlobalSuccess(message);
    setTimeout(() => setGlobalSuccess(null), 5000); // Auto-hide after 5 seconds
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
          if (childInfo.isNotYetBorn) {
            if (!childInfo.dueDate) errors.push('Due date is required for unborn children');
            if (!childInfo.relationshipToChild) errors.push('Relationship to child is required');
            if (childInfo.dueDate && childInfo.relationshipToChild) sectionScore = 100;
          } else {
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
          if (childInfo.isNotYetBorn) {
            if (!childInfo.dueDate) errors.push('Due date is required for unborn children');
            if (!childInfo.relationshipToChild) errors.push('Relationship to child is required');
            if (childInfo.dueDate && childInfo.relationshipToChild) sectionScore = 100;
          } else {
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
    
    // Clear celebration after animation
    setTimeout(() => {
      setCelebratingKit(null);
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

  // NEW: Load persisted data for a specific kit section
  const loadPersistedKitData = (kitIndex: number, section: 'childInfo' | 'consent' | 'questionnaire') => {
    try {
      const kitId = kits[kitIndex].id;
      const storageKey = `kit_${kitId}_${section}`;
      const stored = localStorage.getItem(storageKey);
      
      if (stored) {
        const parsed = JSON.parse(stored);
        // Only load data if it's from the same session (within last 24 hours)
        const storedTime = new Date(parsed.timestamp);
        const now = new Date();
        const hoursDiff = (now.getTime() - storedTime.getTime()) / (1000 * 60 * 60);
        
        if (hoursDiff < 24) {
          return parsed.data;
        }
      }
    } catch (error) {
      console.warn('Failed to load persisted kit data:', error);
    }
    return null;
  };

  // NEW: Clear persisted data for a specific kit
  const clearPersistedKitData = (kitIndex: number) => {
    try {
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
      const storageKey = `completion_${kitId}`;
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.warn('Failed to clear completion state:', error);
    }
  };

  // NEW: Reset kit completion status
  const resetKitCompletion = (kitIndex: number) => {
    const kitId = kits[kitIndex].id;
    
    // Remove from completed kits
    setCompletedKits(prev => {
      const newSet = new Set(prev);
      newSet.delete(kitId);
      return newSet;
    });
    
    // Clear completion history
    setCompletionHistory(prev => {
      const newMap = new Map(prev);
      newMap.delete(kitId);
      return newMap;
    });
    
    // Clear completion state from persistence
    clearCompletionState(kitId);
    
    // Reset form data for this kit
    setChildrenData(prev => prev.map((childData, index) => 
      index === kitIndex 
        ? {
            ...childData,
            childInfo: null,
            consentAccepted: false,
            consentData: {},
            questionnaire: {},
            validationErrors: {
              childInfo: [],
              consent: [],
              questionnaire: []
            },
            isDirty: false
          }
        : childData
    ));
    
    // Clear validation states
    setValidationStates(prev => {
      const newMap = new Map(prev);
      newMap.delete(kitId);
      newMap.delete(`${kitId}-childInfo`);
      newMap.delete(`${kitId}-consent`);
      newMap.delete(`${kitId}-questionnaire`);
      return newMap;
    });
    
    // Clear persisted data
    clearPersistedKitData(kitIndex);
    
    // Reset form instances if they exist
    if (allChildForms[kitIndex]) {
      allChildForms[kitIndex].reset({});
    }
  };

  // NEW: Reset specific section of a kit
  const resetKitSection = (kitIndex: number, section: 'childInfo' | 'consent' | 'questionnaire') => {
    const kitId = kits[kitIndex].id;
    
    // Reset section data
    setChildrenData(prev => prev.map((childData, index) => 
      index === kitIndex 
        ? {
            ...childData,
            [section === 'childInfo' ? 'childInfo' : section === 'consent' ? 'consentAccepted' : 'questionnaire']: 
              section === 'childInfo' ? null : section === 'consent' ? false : {},
            consentData: section === 'consent' ? {} : childData.consentData,
            validationErrors: {
              ...childData.validationErrors,
              [section]: []
            },
            isDirty: true
          }
        : childData
    ));
    
    // Clear section validation state
    setValidationStates(prev => {
      const newMap = new Map(prev);
      newMap.delete(`${kitId}-${section}`);
      return newMap;
    });
    
    // Clear persisted section data
    try {
      const storageKey = `kit_${kitId}_${section}`;
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.warn('Failed to clear persisted section data:', error);
    }
    
    // Reset form instance if it exists
    if (section === 'childInfo' && allChildForms[kitIndex]) {
      allChildForms[kitIndex].reset({});
    }
    
    // Re-validate kit to update completion status
    validateKitRealTime(kitIndex);
  };

  // NEW: Reset all kits
  const resetAllKits = () => {
    // Clear all completion states
    setCompletedKits(new Set());
    setCompletionHistory(new Map());
    setValidationStates(new Map());
    
    // Reset all children data
    setChildrenData(prev => prev.map(childData => ({
      ...childData,
      childInfo: null,
      consentAccepted: false,
      consentData: {},
      questionnaire: {},
      validationErrors: {
        childInfo: [],
        consent: [],
        questionnaire: []
      },
      isDirty: false
    })));
    
    // Clear all persisted data
    kits.forEach((_, index) => {
      clearPersistedKitData(index);
      clearCompletionState(kits[index].id);
    });
    
    // Reset all form instances
    allChildForms.forEach(form => {
      if (form) form.reset({});
    });
    
    // Reset active kit to first
    setActiveKitIndex(0);
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
        if (childData.childInfo && allChildForms[kitIndex]) {
          allChildForms[kitIndex].reset(childData.childInfo);
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

  // NEW: Form reset functionality for individual kits
  const resetKitForm = (kitIndex: number, section?: 'childInfo' | 'consent' | 'questionnaire') => {
    if (section) {
      // Reset specific section
      setChildrenData(prev => prev.map((childData, index) => 
        index === kitIndex 
          ? {
              ...childData,
              [section]: section === 'childInfo' ? null : 
                         section === 'consent' ? { consentAccepted: false, consentData: null } :
                         { question1: undefined, question1Details: "", question2: undefined, question2Details: "", question3: undefined, question3Details: "" },
              isDirty: false,
              validationErrors: {
                ...childData.validationErrors,
                [section]: []
              }
            }
          : childData
      ));

      // Reset corresponding form if it exists
      if (section === 'childInfo' && allChildForms[kitIndex]) {
        allChildForms[kitIndex].reset();
      }

      // Clear persisted data for this section
      clearPersistedKitData(kitIndex);
    } else {
      // Reset entire kit
      setChildrenData(prev => prev.map((childData, index) => 
        index === kitIndex 
          ? {
              ...childData,
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
              isDirty: false,
              validationErrors: {
                childInfo: [],
                consent: [],
                questionnaire: [],
              }
            }
          : childData
      ));

      // Reset all forms for this kit
      if (allChildForms[kitIndex]) {
        allChildForms[kitIndex].reset();
      }

      // Clear all persisted data for this kit
      clearPersistedKitData(kitIndex);
    }

    // Update completion status
    const newCompletedKits = new Set<string>();
    childrenData.forEach((childData, index) => {
      if (index !== kitIndex) {
        // Use the same logic as validateKitCompletion to determine completion
        const hasChildInfo = !!childData.childInfo;
        const hasConsent = childData.consentAccepted;
        const hasQuestionnaire = childData.questionnaire.question1 !== undefined &&
                                 childData.questionnaire.question2 !== undefined &&
                                 childData.questionnaire.question3 !== undefined;
        
        const isCompleted = hasChildInfo && hasConsent && hasQuestionnaire;
        
        if (isCompleted) {
          newCompletedKits.add(childData.kitId);
        }
      }
    });
    setCompletedKits(newCompletedKits);

    // Clear validation states for this kit
    const kitId = kits[kitIndex].id;
    setValidationStates(prev => {
      const newMap = new Map(prev);
      newMap.delete(kitId);
      newMap.delete(`${kitId}-childInfo`);
      newMap.delete(`${kitId}-consent`);
      newMap.delete(`${kitId}-questionnaire`);
      return newMap;
    });
  };

  // NEW: Load all persisted data on component mount
  const loadAllPersistedData = () => {
    const loadedData = kits.map((kit, index) => {
      const childInfo = loadPersistedKitData(index, 'childInfo');
      const consent = loadPersistedKitData(index, 'consent');
      const questionnaire = loadPersistedKitData(index, 'questionnaire');

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

  // Load persisted data on component mount
  React.useEffect(() => {
    if (!isMountedRef.current) return;
    loadAllPersistedData();
  }, []);

  // Initialize children data array based on kits
  React.useEffect(() => {
    if (!isMountedRef.current) return;
    
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
    if (isMountedRef.current) {
      setChildrenData(initialChildrenData);
    }
  }, [kits]); // Only depend on kits, not childrenData

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
    defaultValues: childForms[0]?.defaultValues || {},
  });

  const childForm2 = useForm<ChildInfo>({
    resolver: zodResolver(childInfoSchema),
    defaultValues: childForms[1]?.defaultValues || {},
  });

  const childForm3 = useForm<ChildInfo>({
    resolver: zodResolver(childInfoSchema),
    defaultValues: childForms[2]?.defaultValues || {},
  });

  const childForm4 = useForm<ChildInfo>({
    resolver: zodResolver(childInfoSchema),
    defaultValues: childForms[3]?.defaultValues || {},
  });

  const childForm5 = useForm<ChildInfo>({
    resolver: zodResolver(childInfoSchema),
    defaultValues: childForms[4]?.defaultValues || {},
  });

  const childForm6 = useForm<ChildInfo>({
    resolver: zodResolver(childInfoSchema),
    defaultValues: childForms[5]?.defaultValues || {},
  });

  // Create array of forms for easy access (memoized to prevent infinite loops)
  const allChildForms = React.useMemo(() => [
    childForm1, childForm2, childForm3, childForm4, childForm5, childForm6
  ], [childForm1, childForm2, childForm3, childForm4, childForm5, childForm6]);

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

  // Track reset state to force re-render of UserInfoStep
  const [resetKey, setResetKey] = React.useState(0);

  // Note: We're now using user.profile directly instead of fetching existingUserData

  // Handle user info submission
  const handleUserInfoSubmit = (values: UserInfo) => {
    setUserInfo(values);
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

      // Show global success message
      showGlobalSuccess(`Successfully completed onboarding for all ${kits.length} kit${kits.length > 1 ? 's' : ''}!`);
      
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
      
      {/* Enhanced Header with Better Visual Hierarchy */}
      <div className="mb-8 sm:mb-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col items-end gap-2">
            <div className="text-2xl sm:text-3xl font-bold text-blue-600">
              {completedKits.size} of {kits.length}
            </div>
            <div className="text-sm text-muted-foreground">
              kit{kits.length > 1 ? 's' : ''} completed
            </div>
          </div>
        </div>
        
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
            <div className="mt-4 flex flex-wrap gap-2 justify-center sm:justify-start">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const nextIncomplete = kits.findIndex((_, index) => !isKitCompleted(index));
              if (nextIncomplete !== -1) goToKit(nextIncomplete);
            }}
            disabled={completedKits.size === kits.length}
            className="text-blue-600 border-blue-300 hover:bg-blue-50"
          >
            Go to Next Incomplete Kit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => validateAllKits()}
            className="text-gray-600 border-gray-300 hover:bg-gray-50"
          >
            Validate All Kits
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (confirm('Are you sure you want to reset all kits? This will clear all form data and completion status.')) {
                resetAllKits();
              }
            }}
            className="text-gray-600 border-gray-300 hover:bg-gray-50"
          >
            Reset All Kits
          </Button>
        </div>
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
          key={resetKey}
          form={{ ...userForm, US_STATES }}
          user={user}
          onNext={handleUserInfoSubmit}
          onReset={() => {
            // Clear the completed state so user can modify information
            setUserInfo(null);
            // Reset user form to initial values
            userForm.reset();
            // Clear form errors and validation state
            userForm.clearErrors();
            // Increment reset key to force re-render
            setResetKey(prev => prev + 1);
            // Trigger form validation to update isValid state
            userForm.trigger();
          }}
          isCompleted={!!userInfo}
          invitationData={invitationData}
          resetKey={resetKey}
        />
      </div>

      {/* Enhanced Kit Panels with Smooth Transitions */}
      {kits.map((kit, index) => (
        <div 
          key={kit.id}
          className={`
            transition-all duration-500 ease-out
            ${activeKitIndex === index 
              ? 'opacity-100 scale-100 translate-y-0' 
              : 'opacity-60 scale-95 translate-y-2'
            }
            ${activeKitIndex === index ? 'z-20' : 'z-10'}
          `}
        >
          {/* Completion Celebration Overlay */}
          {celebratingKit === kit.id && (
            <div className="fixed inset-0 bg-blue-500/20 backdrop-blur-sm z-50 flex items-center justify-center">
              <div className="bg-white rounded-2xl p-8 shadow-2xl border-4 border-blue-400 animate-pulse">
                <div className="text-center">
                  <div className="text-6xl mb-4 animate-bounce">🎉</div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    Kit {kit.kitNumber} Completed!
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Great job! Moving to the next kit in a moment...
                  </p>
                  
                  {/* Enhanced completion details */}
                  <div className="bg-blue-50 rounded-lg p-4 mb-4 border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Completion Score:</span>
                      <span className="text-lg font-bold text-blue-800">
                        {getKitCompletionDetails(index).score}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${getKitCompletionDetails(index).score}%` }}
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

          {/* Enhanced KitPanel with Smooth Transitions */}
          <div
            className={`
              transition-all duration-500 ease-out transform
              ${activeKitIndex === index 
                ? 'opacity-100 scale-100 translate-y-0' 
                : 'opacity-60 scale-95 translate-y-2'
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
              onToggleExpanded={() => toggleKitExpanded(kit.id)}
              onActivate={() => activateKit(index)}
              childrenData={childrenData[index]}
              validationState={getKitValidation(index)}
              onValidate={() => validateKitRealTime(index)}
              onResetKit={() => resetKitCompletion(index)}
              onResetSection={(section) => resetKitSection(index, section)}
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
                isReadOnly={false}
              />
            </div>

            {/* Gap between sections */}
            <div className="h-6"></div>

            {/* Consent Section */}
            <div className="border border-gray-200 rounded-lg p-6 bg-white shadow-sm">
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
            </div>

            {/* Questionnaire Section */}
            <div className="border border-gray-200 rounded-lg p-6 bg-white shadow-sm">
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
                  // This will be called when the Save Answers button is clicked
                  handleQuestionnaireSubmit(index, questionnaire);
                }}
              />
            </div>

            {/* Kit Completion Summary */}
            <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-xs">📊</span>
                  </div>
                  <span className="font-medium text-gray-900">Kit Progress Summary</span>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">
                    {getKitProgress(index)}% Complete
                  </div>
                  <div className="text-xs text-gray-500">
                    {getKitCompletionDetails(index).message}
                  </div>
                </div>
              </div>
            </div>
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
          `Complete All ${kits.length} Kit${kits.length > 1 ? 's' : ''}`
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
