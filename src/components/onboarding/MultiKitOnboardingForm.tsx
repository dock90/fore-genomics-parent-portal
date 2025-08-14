"use client";

import * as React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { CheckCircle, Circle, Clock, AlertCircle } from "lucide-react";
import { isFeatureEnabled } from "@/lib/feature-flags";
import UserInfoStep from "./UserInfoStep";
import ChildInfoStep from "./ChildInfoStep";
import ConsentStep from "./ConsentStep";
import QuestionnaireStep from "./QuestionnaireStep";
import KitPanel from "./KitPanel";
import { useState } from "react";

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
  React.useEffect(() => {
    if (isKitCompleted(activeKitIndex) && activeKitIndex < kits.length - 1) {
      // Find next incomplete kit
      const nextIncompleteIndex = childrenData.findIndex((_, index) => 
        index > activeKitIndex && !isKitCompleted(index)
      );
      
      if (nextIncompleteIndex !== -1) {
        // Auto-advance after a short delay to show completion feedback
        const timer = setTimeout(() => {
          setActiveKitIndex(nextIncompleteIndex);
        }, 2000); // Increased delay for better user experience
        
        return () => clearTimeout(timer);
      }
    }
  }, [completedKits, activeKitIndex, kits.length, childrenData]);

  // Enhanced completion status tracking with celebration
  const [celebratingKit, setCelebratingKit] = React.useState<string | null>(null);
  const [completionHistory, setCompletionHistory] = React.useState<Map<string, {
    completedAt: Date;
    completedBy: string;
    sections: string[];
    validationScore: number;
    kitIndex: number;
  }>>(new Map());

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

  // Real-time validation for a specific kit section
  const validateKitSectionRealTime = (kitIndex: number, section: 'childInfo' | 'consent' | 'questionnaire') => {
    const validation = validateKitSection(kitIndex, section);
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
  const handleChildInfoSubmit = (kitIndex: number, values: ChildInfo) => {
    setChildrenData(prev => prev.map((childData, index) => 
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
    ));
    
    // Validate the updated section in real-time
    validateKitSectionRealTime(kitIndex, 'childInfo');
    
    // Update completion status
    const newChildrenData = childrenData.map((childData, index) => 
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
    
    // Update completed kits set
    const newCompletedKits = new Set<string>();
    newChildrenData.forEach((childData, index) => {
      if (validateKitCompletion(index).isValid) {
        newCompletedKits.add(childData.kitId);
        // Trigger celebration for newly completed kits
        if (!completedKits.has(childData.kitId)) {
          handleKitCompletion(index);
        }
      }
    });
    setCompletedKits(newCompletedKits);
    
    // Persist data to localStorage for this kit
    persistKitData(kitIndex, 'childInfo', values);
  };

  const handleConsentSubmit = (kitIndex: number, consentAccepted: boolean, consentData: any) => {
    setChildrenData(prev => prev.map((childData, index) => 
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
    ));
    
    // Validate the updated section in real-time
    validateKitSectionRealTime(kitIndex, 'consent');
    
    // Update completion status
    const newChildrenData = childrenData.map((childData, index) => 
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
    
    const newCompletedKits = new Set<string>();
    newChildrenData.forEach((childData, index) => {
      if (validateKitCompletion(index).isValid) {
        newCompletedKits.add(childData.kitId);
        // Trigger celebration for newly completed kits
        if (!completedKits.has(childData.kitId)) {
          handleKitCompletion(index);
        }
      }
    });
    setCompletedKits(newCompletedKits);
    
    // Persist data to localStorage for this kit
    persistKitData(kitIndex, 'consent', { consentAccepted, consentData });
  };

  const handleQuestionnaireSubmit = (kitIndex: number, questionnaire: any) => {
    setChildrenData(prev => prev.map((childData, index) => 
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
    ));
    
    // Validate the updated section in real-time
    validateKitSectionRealTime(kitIndex, 'questionnaire');
    
    // Update completion status
    const newChildrenData = childrenData.map((childData, index) => 
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
    
    const newCompletedKits = new Set<string>();
    newChildrenData.forEach((childData, index) => {
      if (validateKitCompletion(index).isValid) {
        newCompletedKits.add(childData.kitId);
        // Trigger celebration for newly completed kits
        if (!completedKits.has(childData.kitId)) {
          handleKitCompletion(index);
        }
      }
    });
    setCompletedKits(newCompletedKits);
    
    // Persist data to localStorage for this kit
    persistKitData(kitIndex, 'questionnaire', questionnaire);
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

      setCompletionHistory(loadedCompletions);
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
      if (index !== kitIndex && validateKitCompletion(index).isValid) {
        newCompletedKits.add(childData.kitId);
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
      if (validateKitCompletion(index).isValid) {
        newCompletedKits.add(childData.kitId);
      }
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
      const hasDirtyForms = childrenData.some(childData => childData.isDirty);
      if (hasDirtyForms) {
        autoSaveFormData();
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [autoSaveFormData, childrenData]);

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
    loadAllPersistedData();
  }, []);

  // Initialize children data array based on kits
  React.useEffect(() => {
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
    setChildrenData(initialChildrenData);
  }, [kits]);

  // Fetch existing user data on component mount
  React.useEffect(() => {
    const fetchExistingData = async () => {
      if (!user?.email) return;

      try {
        const url = invitationData?.orderId
          ? `/api/user/current?orderId=${invitationData.orderId}`
          : "/api/user/current";

        const response = await fetch(url);
        if (response.ok) {
          const userData = await response.json();
          setExistingUserData(userData);
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

  // Create array of forms for easy access
  const allChildForms = [childForm1, childForm2, childForm3, childForm4, childForm5, childForm6];

  // User info form
  const userForm = useForm<UserInfo>({
    resolver: zodResolver(userInfoSchema),
    defaultValues: {
      firstName: existingUserData?.user?.profile?.firstName || user?.firstName || "",
      lastName: existingUserData?.user?.profile?.lastName || user?.lastName || "",
      address: existingUserData?.user?.profile?.address || "",
      city: existingUserData?.user?.profile?.city || "",
      state: existingUserData?.user?.profile?.state || "",
      zipCode: existingUserData?.user?.profile?.zipCode || "",
      phone: existingUserData?.user?.profile?.phone || "",
    },
  });

  // Update form defaults when existingUserData changes
  React.useEffect(() => {
    if (existingUserData) {
      userForm.reset({
        firstName: existingUserData.user?.profile?.firstName || user?.firstName || "",
        lastName: existingUserData.user?.profile?.lastName || user?.lastName || "",
        address: existingUserData.user?.profile?.address || "",
        city: existingUserData.user?.profile?.city || "",
        state: existingUserData.user?.profile?.state || "",
        zipCode: existingUserData.user?.profile?.zipCode || "",
        phone: existingUserData.user?.profile?.phone || "",
      });

      // Reset child forms with updated data
      childForms.forEach((formConfig, index) => {
        if (allChildForms[index]) {
          allChildForms[index].reset(formConfig.defaultValues);
        }
      });
    }
  }, [existingUserData, user, userForm, childForms, allChildForms]);

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

    setSaving(true);
    setSaveError(null);

    try {
      // Submit each kit's data
      for (const childData of childrenData) {
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
      }

      // Clear all persisted data on successful submission
      kits.forEach((_, index) => {
        clearPersistedKitData(index);
      });

      // Redirect to dashboard on success
      router.push("/dashboard");
    } catch (err: any) {
      setSaveError(err.message || "Unknown error occurred");
    } finally {
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
    <div className="container-mobile container-tablet container-desktop">
      <div className="mobile-padding mobile-spacing">
        <div className="max-w-7xl mx-auto">
          {/* Enhanced Header with Better Visual Hierarchy */}
          <div className="mb-8 sm:mb-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-2">
                  Multi-Kit Onboarding
                </h1>
                <p className="text-muted-foreground text-sm sm:text-base">
                  Complete onboarding for all {kits.length} kit{kits.length > 1 ? 's' : ''}
                </p>
              </div>
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
              <div className="flex justify-between text-xs text-muted-foreground mb-2">
                <span>0%</span>
                <span className="font-medium text-blue-600">
                  {Math.round((completedKits.size / kits.length) * 100)}% Complete
                </span>
                <span>100%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner">
                <div
                  className="bg-gradient-to-r from-blue-500 via-blue-600 to-green-500 h-4 rounded-full transition-all duration-700 ease-out relative overflow-hidden"
                  style={{ width: `${(completedKits.size / kits.length) * 100}%` }}
                >
                  {/* Animated shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                </div>
              </div>
              {/* Progress milestones */}
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>Start</span>
                <span>In Progress</span>
                <span>Complete</span>
              </div>
            </div>
          </div>

                      {/* Enhanced Tab Navigation with Smooth Transitions */}
            <div className="mb-8">
              {/* Quick Navigation Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Kit Progress & Navigation</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Completed
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    In Progress
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4 text-gray-400" />
                    Pending
                  </span>
                </div>
              </div>
              
              {/* Enhanced Tab Navigation with Smooth Transitions */}
              <div className="relative">
                {/* Active Tab Indicator with Smooth Movement */}
                <div 
                  className="absolute top-0 left-0 h-full bg-blue-100 border-2 border-blue-500 rounded-lg transition-all duration-500 ease-out shadow-lg"
                  style={{
                    width: `${100 / kits.length}%`,
                    transform: `translateX(${activeKitIndex * (100 / kits.length)}%)`,
                  }}
                />
                
                {/* Tab Buttons */}
                <div className="flex gap-1 relative z-10">
                  {kits.map((kit, index) => {
                    const isCompleted = isKitCompleted(index);
                    const isActive = activeKitIndex === index;
                    const progress = getKitProgress(index);
                    const hasErrors = getValidationErrorCount(index) > 0;
                    
                    return (
                      <button
                        key={kit.id}
                        onClick={() => goToKit(index)}
                        className={`
                          flex-1 group relative flex flex-col items-center gap-2 px-3 py-4 rounded-lg border-2 transition-all duration-300 ease-out
                          ${isCompleted 
                            ? 'border-green-500 bg-green-50 hover:bg-green-100 text-green-700 shadow-md hover:shadow-lg transform hover:-translate-y-1' 
                            : isActive 
                              ? 'border-blue-500 bg-blue-50 hover:bg-blue-100 text-blue-700 shadow-md hover:shadow-lg transform hover:-translate-y-1' 
                              : 'border-gray-300 bg-white hover:bg-gray-50 text-gray-600 hover:shadow-md transform hover:-translate-y-1'
                          }
                          ${hasErrors ? 'ring-2 ring-red-300 ring-offset-2' : ''}
                          ${isActive ? 'scale-105 z-20' : 'scale-100'}
                        `}
                      >
                        {/* Kit Number Badge with Enhanced Animation */}
                        <div className={`
                          w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300
                          ${isCompleted 
                            ? 'bg-green-500 text-white shadow-lg' 
                            : isActive 
                              ? 'bg-blue-500 text-white shadow-lg' 
                              : 'bg-gray-300 text-gray-600'
                          }
                          ${isActive ? 'scale-110' : 'scale-100'}
                        `}>
                          {kit.kitNumber}
                        </div>
                        
                        {/* Kit Type with Smooth Typography */}
                        <span className="font-medium text-sm transition-all duration-300">
                          {kit.kitType}
                        </span>
                        
                        {/* Status Icon with Enhanced Animation */}
                        <div className="flex items-center gap-1 transition-all duration-300">
                          {isCompleted ? (
                            <CheckCircle className="w-5 h-5 text-green-600 animate-pulse" />
                          ) : isActive ? (
                            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Clock className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                        
                        {/* Progress Indicator with Smooth Animation */}
                        {!isCompleted && (
                          <div className="flex flex-col items-center gap-1 w-full">
                            <div className="text-xs opacity-75 font-medium">
                              {progress}%
                            </div>
                            {/* Enhanced Progress Bar */}
                            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-500 ease-out"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        )}
                        
                        {/* Completion Score Badge for Completed Kits */}
                        {isCompleted && (
                          <div className="flex flex-col items-center gap-1">
                            <div className="text-sm font-bold text-green-700">
                              {getKitCompletionDetails(index).score}%
                            </div>
                            <div className="w-12 h-1.5 bg-green-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-green-500 rounded-full transition-all duration-500"
                                style={{ width: `${getKitCompletionDetails(index).score}%` }}
                              />
                            </div>
                          </div>
                        )}
                        
                        {/* Error Badge with Enhanced Visibility */}
                        {hasErrors && (
                          <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold animate-pulse shadow-lg">
                            !
                          </div>
                        )}
                        
                        {/* Completion History Badge */}
                        {isKitRecentlyCompleted(kit.id) && (
                          <div className="absolute -top-2 -left-2 w-6 h-6 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center font-bold animate-bounce shadow-lg">
                            ⏰
                          </div>
                        )}
                        
                        {/* Enhanced Hover Tooltip */}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 px-4 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap z-30 shadow-xl">
                          {isCompleted 
                            ? `Kit ${kit.kitNumber} completed successfully (${getKitCompletionDetails(index).score}%)` 
                            : isActive 
                              ? `Currently working on Kit ${kit.kitNumber}` 
                              : `Kit ${kit.kitNumber} pending - ${progress}% complete`
                          }
                          {hasErrors && ` - ${getValidationErrorCount(index)} validation error${getValidationErrorCount(index) !== 1 ? 's' : ''}`}
                          {isKitRecentlyCompleted(kit.id) && ` - Recently completed`}
                          
                          {/* Navigation Hint */}
                          <div className="mt-2 pt-2 border-t border-gray-700 text-gray-300">
                            Click to activate • Use ← → keys to navigate
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                            </div>
              
              {/* Enhanced Navigation Controls */}
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                {/* Navigation Arrows */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToPreviousKit}
                    disabled={activeKitIndex === 0}
                    className="flex items-center gap-2 transition-all duration-200 hover:scale-105"
                  >
                    <span className="text-lg">←</span>
                    Previous Kit
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToNextKit}
                    disabled={activeKitIndex === kits.length - 1}
                    className="flex items-center gap-2 transition-all duration-200 hover:scale-105"
                  >
                    Next Kit
                    <span className="text-lg">→</span>
                  </Button>
                </div>
                
                {/* Quick Jump Navigation */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 font-medium">Quick Jump:</span>
                  <div className="flex gap-1">
                    {kits.map((kit, index) => (
                      <button
                        key={kit.id}
                        onClick={() => goToKit(index)}
                        className={`
                          w-8 h-8 rounded-full text-xs font-bold transition-all duration-200
                          ${activeKitIndex === index
                            ? 'bg-blue-500 text-white shadow-lg scale-110'
                            : 'bg-gray-200 text-gray-600 hover:bg-gray-300 hover:scale-105'
                          }
                          ${isKitCompleted(index) ? 'ring-2 ring-green-300' : ''}
                        `}
                        title={`Go to Kit ${kit.kitNumber}`}
                      >
                        {kit.kitNumber}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Current Kit Status */}
                <div className="text-center">
                  <div className="text-sm text-gray-600">
                    Currently viewing: <span className="font-semibold text-blue-600">Kit {kits[activeKitIndex]?.kitNumber}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {activeKitIndex + 1} of {kits.length} kits
                  </div>
                </div>
              </div>
              
              {/* Progress Summary */}
              <div className="mt-4 text-center sm:text-left">
              {completedKits.size === kits.length ? (
                /* All Kits Completed Celebration */
                <div className="inline-flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl shadow-lg animate-pulse">
                  <div className="text-3xl">🎉</div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-800">
                      All {kits.length} Kit{kits.length > 1 ? 's' : ''} Completed!
                    </div>
                    <div className="text-sm text-green-600">
                      Ready to submit your onboarding data
                    </div>
                  </div>
                  <div className="text-3xl">🎉</div>
                </div>
              ) : (
                /* Progress Status */
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-blue-700">
                    {completedKits.size} of {kits.length} kit{completedKits.size !== 1 ? 's' : ''} completed
                  </span>
                  <span className="text-xs text-blue-600">
                    ({Math.round((completedKits.size / kits.length) * 100)}% overall progress)
                  </span>
                </div>
              )}
            </div>
            
            {/* NEW: Enhanced Completion Status Summary */}
            <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
              <h4 className="text-sm font-semibold text-blue-900 mb-3">Completion Statistics</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Overall Progress */}
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {Math.round((completedKits.size / kits.length) * 100)}%
                  </div>
                  <div className="text-xs text-blue-600">Overall Progress</div>
                </div>
                
                {/* Completed Kits */}
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {completedKits.size}
                  </div>
                  <div className="text-xs text-green-600">Kits Completed</div>
                </div>
                
                {/* Average Score */}
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {completedKits.size > 0 
                      ? Math.round(
                          Array.from(completionHistory.values())
                            .map(h => h.validationScore)
                            .reduce((sum, score) => sum + score, 0) / completedKits.size
                        )
                      : 0
                    }%
                  </div>
                  <div className="text-xs text-purple-600">Average Score</div>
                </div>
                
                {/* Recent Completions */}
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {Array.from(completionHistory.entries())
                      .filter(([kitId]) => isKitRecentlyCompleted(kitId))
                      .length}
                  </div>
                  <div className="text-xs text-orange-600">Recent (24h)</div>
                </div>
              </div>
              
              {/* Completion Timeline */}
              {completionHistory.size > 0 && (
                <div className="mt-4 pt-3 border-t border-blue-200">
                  <h5 className="text-xs font-medium text-blue-800 mb-2">Recent Completions</h5>
                  <div className="space-y-2">
                    {Array.from(completionHistory.entries())
                      .sort(([,a], [,b]) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
                      .slice(0, 3)
                      .map(([kitId, history]) => {
                        const kit = kits.find(k => k.id === kitId);
                        return (
                          <div key={kitId} className="flex items-center justify-between text-xs bg-white/50 rounded px-2 py-1">
                            <span className="text-blue-700">
                              Kit {kit?.kitNumber || 'Unknown'} - {history.validationScore}%
                            </span>
                            <span className="text-blue-600">
                              {new Date(history.completedAt).toLocaleDateString()}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
            
            {/* Detailed Completion Status */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {kits.map((kit, index) => {
                const isCompleted = isKitCompleted(index);
                const progress = getKitProgress(index);
                const completionDetails = getKitCompletionDetails(index);
                const hasErrors = getValidationErrorCount(index) > 0;
                const completionHistory = getKitCompletionHistory(kit.id);
                const isRecentlyCompleted = isKitRecentlyCompleted(kit.id);
                
                return (
                  <div 
                    key={kit.id}
                    className={`
                      p-3 rounded-lg border text-sm transition-all duration-200 cursor-pointer hover:shadow-md relative
                      ${isCompleted 
                        ? 'border-green-200 bg-green-50 text-green-800' 
                        : hasErrors 
                          ? 'border-red-200 bg-red-50 text-red-800' 
                          : 'border-gray-200 bg-gray-50 text-gray-700'
                      }
                    `}
                    onClick={() => goToKit(index)}
                  >
                    {/* Recently Completed Badge */}
                    {isRecentlyCompleted && (
                      <div className="absolute -top-2 -left-2 w-6 h-6 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                        ⏰
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Kit {kit.kitNumber}</span>
                      <div className="flex items-center gap-1">
                        {isCompleted && <CheckCircle className="h-4 w-4 text-green-600" />}
                        {hasErrors && <AlertCircle className="h-4 w-4 text-red-600" />}
                      </div>
                    </div>
                    <div className="text-xs opacity-75 mb-2">{kit.kitType}</div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span>Progress:</span>
                        <span className="font-medium">{progress}%</span>
                      </div>
                      <div className="text-xs opacity-75">
                        {completionDetails.message}
                      </div>
                      
                      {/* Enhanced completion details */}
                      {isCompleted && (
                        <div className="mt-2 pt-2 border-t border-green-200">
                          <div className="flex items-center justify-between text-xs">
                            <span>Completion Score:</span>
                            <span className="font-bold text-green-700">{completionDetails.score}%</span>
                          </div>
                          {completionHistory && (
                            <div className="text-xs opacity-75 mt-1">
                              Completed: {new Date(completionHistory.completedAt).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Section breakdown for incomplete kits */}
                      {!isCompleted && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <div className="space-y-1 text-xs">
                            <div className="flex items-center justify-between">
                              <span>Child Info:</span>
                              <span>{validateKitSection(index, 'childInfo').sectionScore}%</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>Consent:</span>
                              <span>{validateKitSection(index, 'consent').sectionScore}%</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>Questionnaire:</span>
                              <span>{validateKitSection(index, 'questionnaire').sectionScore}%</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
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
                className="text-purple-600 border-purple-300 hover:bg-purple-50"
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
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                Reset All Kits
              </Button>
            </div>
          </div>

          {/* Enhanced Keyboard Navigation Hint */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 text-sm text-blue-800">
              <div className="flex items-center gap-2">
                <span className="text-lg">💡</span>
                <span className="font-semibold">Navigation Tips:</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1">
                  <kbd className="px-2 py-1 bg-blue-100 border border-blue-300 rounded text-xs font-mono">←</kbd>
                  <kbd className="px-2 py-1 bg-blue-100 border border-blue-300 rounded text-xs font-mono">→</kbd>
                  <span>Navigate between kits</span>
                </span>
                <span className="text-blue-600">•</span>
                <span className="flex items-center gap-1">
                  <kbd className="px-2 py-1 bg-blue-100 border border-blue-300 rounded text-xs font-mono">1</kbd>
                  <span>-</span>
                  <kbd className="px-2 py-1 bg-blue-100 border border-blue-300 rounded text-xs font-mono">6</kbd>
                  <span>Jump to specific kits</span>
                </span>
                <span className="text-blue-600">•</span>
                <span>Click tab headers or use navigation buttons below</span>
              </div>
            </div>
          </div>

          {/* Data Persistence Status */}
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-green-700">
              <span className="font-medium">💾 Auto-Save Enabled:</span>
              <span>Your form data is automatically saved every 30 seconds</span>
              <span>•</span>
              <span>Data persists across browser sessions (up to 24 hours)</span>
              <span>•</span>
              <span>Use reset buttons to clear individual sections or entire kits</span>
            </div>
          </div>

          {/* Validation Summary */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-blue-900">Form Validation Status</h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => validateAllKits()}
                  className="text-blue-700 border-blue-300 hover:bg-blue-100"
                >
                  Validate All Kits
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportFormData}
                  className="text-green-700 border-green-300 hover:bg-green-100"
                  title="Export form data for backup/debugging"
                >
                  Export Data
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {kits.map((kit, index) => {
                const validation = getKitValidation(index);
                const completion = getKitProgress(index);
                const completionDetails = getKitCompletionDetails(index);
                const hasErrors = getValidationErrorCount(index) > 0;
                const isCompleted = isKitCompleted(index);
                const completionHistory = getKitCompletionHistory(kit.id);
                
                return (
                  <div 
                    key={kit.id}
                    className={`
                      p-4 rounded-lg border transition-all duration-200
                      ${isCompleted 
                        ? 'border-green-200 bg-green-50' 
                        : hasErrors 
                          ? 'border-red-200 bg-red-50' 
                          : 'border-gray-200 bg-gray-50'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-gray-900">Kit {kit.kitNumber}</h4>
                      <div className="flex items-center gap-2">
                        {isCompleted && <CheckCircle className="h-4 w-4 text-green-600" />}
                        {hasErrors && <AlertCircle className="h-4 w-4 text-red-600" />}
                        {!isCompleted && !hasErrors && <Clock className="h-4 w-4 text-gray-400" />}
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      {/* Kit Type */}
                      <div className="text-sm">
                        <span className="text-gray-600">Type:</span>
                        <span className="ml-2 font-medium">{kit.kitType}</span>
                      </div>
                      
                      {/* Overall Progress */}
                      <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-600">Overall Progress:</span>
                          <span className="font-medium">{completion}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-500 ${
                              isCompleted ? 'bg-green-500' : hasErrors ? 'bg-red-500' : 'bg-blue-500'
                            }`}
                            style={{ width: `${completion}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      {/* Section Breakdown */}
                      <div className="space-y-2">
                        <div className="text-xs font-medium text-gray-700">Section Progress:</div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span>Child Info:</span>
                            <span className="font-medium">{validateKitSection(index, 'childInfo').sectionScore}%</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span>Consent:</span>
                            <span className="font-medium">{validateKitSection(index, 'consent').sectionScore}%</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span>Questionnaire:</span>
                            <span className="font-medium">{validateKitSection(index, 'questionnaire').sectionScore}%</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Validation Status */}
                      <div className="pt-2 border-t border-gray-200">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-600">Validation:</span>
                          <span className={`font-medium ${
                            validation.isValid ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {validation.isValid ? 'Valid' : 'Invalid'}
                          </span>
                        </div>
                        {!validation.isValid && (
                          <div className="text-xs text-red-600 mt-1">
                            {validation.errors.length} error{validation.errors.length !== 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                      
                      {/* Completion Details */}
                      {isCompleted && completionHistory && (
                        <div className="pt-2 border-t border-green-200">
                          <div className="text-xs text-green-700">
                            <div className="font-medium">Completed Successfully</div>
                            <div className="opacity-75">
                              {new Date(completionHistory.completedAt).toLocaleDateString()} at{' '}
                              {new Date(completionHistory.completedAt).toLocaleTimeString()}
                            </div>
                            <div className="opacity-75">
                              Score: {completionDetails.score}%
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Action Buttons */}
                      <div className="pt-2 border-t border-gray-200">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => goToKit(index)}
                            className="text-xs px-2 py-1 h-7"
                          >
                            {isCompleted ? 'Review' : 'Continue'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => validateKitRealTime(index)}
                            className="text-xs px-2 py-1 h-7"
                          >
                            Validate
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
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
                <div className="fixed inset-0 bg-green-500/20 backdrop-blur-sm z-50 flex items-center justify-center">
                  <div className="bg-white rounded-2xl p-8 shadow-2xl border-4 border-green-400 animate-pulse">
                    <div className="text-center">
                      <div className="text-6xl mb-4 animate-bounce">🎉</div>
                      <h3 className="text-2xl font-bold text-green-800 mb-2">
                        Kit {kit.kitNumber} Completed!
                      </h3>
                      <p className="text-green-600 mb-4">
                        Great job! Moving to the next kit in a moment...
                      </p>
                      
                      {/* Enhanced completion details */}
                      <div className="bg-green-50 rounded-lg p-4 mb-4 border border-green-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-green-700">Completion Score:</span>
                          <span className="text-lg font-bold text-green-800">
                            {getKitCompletionDetails(index).score}%
                          </span>
                        </div>
                        <div className="w-full bg-green-200 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${getKitCompletionDetails(index).score}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      {/* Completion timestamp */}
                      <div className="text-xs text-green-600">
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
                {/* User Info Section (only show on first kit) */}
                {index === 0 && (
                  <div className="border-2 border-blue-200 rounded-xl p-6 bg-blue-50/50">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-sm">1</span>
                      </div>
                      <h3 className="text-xl font-semibold text-blue-900">Parent Information</h3>
                    </div>
                    <UserInfoStep
                      form={{ ...userForm, US_STATES }}
                      user={user}
                      onNext={handleUserInfoSubmit}
                      invitationData={invitationData}
                    />
                  </div>
                )}

                {/* Child Info Section */}
                <div className="border-2 border-green-200 rounded-xl p-6 bg-green-50/50">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">{index === 0 ? '2' : '1'}</span>
                    </div>
                    <h3 className="text-xl font-semibold text-green-900">Child Information</h3>
                    {/* Show completion status for this section */}
                    {childrenData[index]?.childInfo && (
                      <Badge variant="default" className="ml-auto">
                        ✓ Completed
                      </Badge>
                    )}
                  </div>
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

                {/* Consent Section */}
                <div className="border-2 border-purple-200 rounded-xl p-6 bg-purple-50/50">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">{index === 0 ? '3' : '2'}</span>
                    </div>
                    <h3 className="text-xl font-semibold text-purple-900">Consent Form</h3>
                    {/* Show completion status for this section */}
                    {childrenData[index]?.consentAccepted && (
                      <Badge variant="default" className="ml-auto">
                        ✓ Completed
                      </Badge>
                    )}
                  </div>
                  <ConsentStep
                    consentAccepted={childrenData[index]?.consentAccepted || false}
                    setConsentAccepted={(accepted: boolean) => handleConsentSubmit(index, accepted, null)}
                    childInfo={childrenData[index]?.childInfo || null}
                    userInfo={userInfo}
                    kitContext={{
                      kitNumber: kit.kitNumber,
                      totalKits: kits.length,
                      kitType: kit.kitType
                    }}
                    isActive={activeKitIndex === index}
                  />
                </div>

                {/* Questionnaire Section */}
                <div className="border-2 border-orange-200 rounded-xl p-6 bg-orange-50/50">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">{index === 0 ? '4' : '3'}</span>
                    </div>
                    <h3 className="text-xl font-semibold text-orange-900">Questionnaire</h3>
                    {/* Show completion status for this section */}
                    {childrenData[index]?.questionnaire.question1 !== undefined && 
                     childrenData[index]?.questionnaire.question2 !== undefined && 
                     childrenData[index]?.questionnaire.question3 !== undefined && (
                      <Badge variant="default" className="ml-auto">
                        ✓ Completed
                      </Badge>
                    )}
                  </div>
                  <QuestionnaireStep
                    questionnaire={childrenData[index]?.questionnaire || {
                      question1: undefined,
                      question1Details: "",
                      question2: undefined,
                      question2Details: "",
                      question3: undefined,
                      question3Details: "",
                    }}
                    setQuestionnaire={(questionnaire: any) => handleQuestionnaireSubmit(index, questionnaire)}
                    order={order}
                    selectedKitId={kit.id}
                    kitContext={`Kit ${kit.kitNumber} of ${kits.length}: ${kit.kitType}`}
                    isLastKit={index === kits.length - 1}
                    onComplete={() => {}}
                  />
                </div>

                {/* Kit Completion Summary */}
                <div className="border-2 border-gray-200 rounded-xl p-4 bg-gray-50/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-xs">📊</span>
                      </div>
                      <span className="font-medium text-gray-900">Kit Progress Summary</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">
                        {getKitProgress(index)}% Complete
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {getKitCompletionDetails(index).message}
                      </div>
                    </div>
                  </div>
                </div>
              </KitPanel>
                </div>
              </div>
          ))}
        </div>

        {/* Enhanced Complete Onboarding Button */}
        <div className="flex justify-center mt-10">
          <Button
            onClick={handleCompleteOnboarding}
            disabled={saving || completedKits.size !== kits.length}
            size="lg"
            className="px-10 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
          >
            {saving ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Saving...
              </div>
            ) : (
              `Complete All ${kits.length} Kit${kits.length > 1 ? 's' : ''}`
            )}
          </Button>
        </div>

        {/* Enhanced Error Display */}
        {saveError && (
          <div className="mt-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl">
            <div className="flex items-center gap-3 text-red-800">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium">{saveError}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
