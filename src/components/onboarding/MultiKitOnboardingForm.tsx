"use client";

import * as React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, Circle, Clock, AlertCircle } from "lucide-react";
import { isFeatureEnabled } from "@/lib/feature-flags";
import UserInfoStep from "./UserInfoStep";
import ChildInfoStep from "./ChildInfoStep";
import ConsentStep from "./ConsentStep";
import QuestionnaireStep from "./QuestionnaireStep";
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

  // Navigation functions
  const goToNextKit = () => {
    if (activeKitIndex < kits.length - 1) {
      setActiveKitIndex(activeKitIndex + 1);
    }
  };

  const goToPreviousKit = () => {
    if (activeKitIndex > 0) {
      setActiveKitIndex(activeKitIndex - 1);
    }
  };

  const goToKit = (kitIndex: number) => {
    if (kitIndex >= 0 && kitIndex < kits.length) {
      setActiveKitIndex(kitIndex);
    }
  };

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

  // Add completion celebration state
  const [celebratingKit, setCelebratingKit] = React.useState<string | null>(null);

  // Enhanced kit completion tracking with validation
  const validateKitCompletion = (kitIndex: number): { isValid: boolean; missingFields: string[] } => {
    const childData = childrenData[kitIndex];
    if (!childData) {
      return { isValid: false, missingFields: ['Kit data not found'] };
    }

    const missingFields: string[] = [];

    // Validate child info
    if (!childData.childInfo) {
      missingFields.push('Child Information');
    } else {
      const childInfo = childData.childInfo;
      if (childInfo.isNotYetBorn) {
        if (!childInfo.dueDate) missingFields.push('Due Date');
        if (!childInfo.relationshipToChild) missingFields.push('Relationship to Child');
      } else {
        if (!childInfo.firstName) missingFields.push('Child First Name');
        if (!childInfo.lastName) missingFields.push('Child Last Name');
        if (!childInfo.dob) missingFields.push('Date of Birth');
        if (!childInfo.ethnicity || childInfo.ethnicity.length === 0) missingFields.push('Ethnicity');
        if (!childInfo.relationshipToChild) missingFields.push('Relationship to Child');
      }
    }

    // Validate consent
    if (!childData.consentAccepted) {
      missingFields.push('Consent Acceptance');
    }

    // Validate questionnaire
    if (childData.questionnaire.question1 === undefined) missingFields.push('Question 1');
    if (childData.questionnaire.question2 === undefined) missingFields.push('Question 2');
    if (childData.questionnaire.question3 === undefined) missingFields.push('Question 3');

    return {
      isValid: missingFields.length === 0,
      missingFields
    };
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
    
    if (!childData) return { status: 'error', message: 'Kit data not found' };
    
    if (validation.isValid) {
      return { status: 'completed', message: 'All sections completed' };
    }
    
    return {
      status: 'incomplete',
      message: `Missing: ${validation.missingFields.join(', ')}`,
      missingFields: validation.missingFields
    };
  };

  // Enhanced progress calculation with better granularity
  const getKitProgress = (kitIndex: number) => {
    const childData = childrenData[kitIndex];
    if (!childData) return 0;
    
    let completedSteps = 0;
    const totalSteps = 3; // Child Info, Consent, Questionnaire
    
    // Child Info completion (more granular)
    if (childData.childInfo) {
      const childInfo = childData.childInfo;
      if (childInfo.isNotYetBorn) {
        if (childInfo.dueDate && childInfo.relationshipToChild) completedSteps++;
      } else {
        if (childInfo.firstName && childInfo.lastName && childInfo.dob && 
            childInfo.ethnicity && childInfo.ethnicity.length > 0 && childInfo.relationshipToChild) {
          completedSteps++;
        }
      }
    }
    
    // Consent completion
    if (childData.consentAccepted) completedSteps++;
    
    // Questionnaire completion
    if (childData.questionnaire.question1 !== undefined && 
        childData.questionnaire.question2 !== undefined && 
        childData.questionnaire.question3 !== undefined) {
      completedSteps++;
    }
    
    return Math.round((completedSteps / totalSteps) * 100);
  };

  // Enhanced completion tracking with celebration
  const handleKitCompletion = (kitIndex: number) => {
    const kitId = kits[kitIndex].id;
    setCelebratingKit(kitId);
    
    // Clear celebration after animation
    setTimeout(() => {
      setCelebratingKit(null);
    }, 3000);
  };

  // Enhanced state update functions with validation and celebration
  const handleChildInfoSubmit = (kitIndex: number, values: ChildInfo) => {
    setChildrenData(prev => prev.map((childData, index) => 
      index === kitIndex 
        ? { ...childData, childInfo: values }
        : childData
    ));
    
    // Validate and update completion status immediately
    const newChildrenData = childrenData.map((childData, index) => 
      index === kitIndex 
        ? { ...childData, childInfo: values }
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
  };

  const handleConsentSubmit = (kitIndex: number, consentAccepted: boolean, consentData: any) => {
    setChildrenData(prev => prev.map((childData, index) => 
      index === kitIndex 
        ? { ...childData, consentAccepted, consentData }
        : childData
    ));
    
    // Update completion status
    const newChildrenData = childrenData.map((childData, index) => 
      index === kitIndex 
        ? { ...childData, consentAccepted, consentData }
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
  };

  const handleQuestionnaireSubmit = (kitIndex: number, questionnaire: any) => {
    setChildrenData(prev => prev.map((childData, index) => 
      index === kitIndex 
        ? { ...childData, questionnaire }
        : childData
    ));
    
    // Update completion status
    const newChildrenData = childrenData.map((childData, index) => 
      index === kitIndex 
        ? { ...childData, questionnaire }
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
  };

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

    const incompleteKits = childrenData.filter((_, index) => !isKitCompleted(index));
    if (incompleteKits.length > 0) {
      setSaveError(`Please complete all kits before submitting. ${incompleteKits.length} kit(s) remaining.`);
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
            
            {/* Enhanced Progress Bar with Labels */}
            <div className="mt-6">
              <div className="flex justify-between text-xs text-muted-foreground mb-2">
                <span>0%</span>
                <span>{Math.round((completedKits.size / kits.length) * 100)}%</span>
                <span>100%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${(completedKits.size / kits.length) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Enhanced Kit Navigation with Better Visual Design */}
          <div className="mb-8">
            {/* Keyboard Navigation Hint */}
            <div className="mb-4 p-3 bg-muted/30 rounded-lg border border-muted">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium">💡 Navigation Tips:</span>
                <span>Use ← → arrow keys to navigate between kits</span>
                <span>•</span>
                <span>Press 1-6 to jump to specific kits</span>
                <span>•</span>
                <span>Click tabs or use Previous/Next buttons</span>
              </div>
            </div>

            <Tabs value={activeKitIndex.toString()} onValueChange={(value) => setActiveKitIndex(parseInt(value))}>
              {/* Enhanced Tabs List with Better Spacing and Visual Indicators */}
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 p-1 bg-muted/50 rounded-xl">
                {kits.map((kit, index) => (
                  <TabsTrigger
                    key={kit.id}
                    value={index.toString()}
                    className="flex flex-col items-center gap-2 p-3 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200 rounded-lg relative"
                  >
                    <div className="flex items-center gap-2">
                      {getKitStatusIcon(index)}
                      <span className="hidden sm:inline font-medium">Kit {kit.kitNumber}</span>
                      <span className="sm:hidden font-medium">{kit.kitNumber}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {kit.kitType}
                    </div>
                    {/* Individual Kit Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                      <div
                        className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${getKitProgress(index)}%` }}
                      ></div>
                    </div>
                    {/* Progress Percentage */}
                    <div className="text-xs font-medium text-blue-600">
                      {getKitProgress(index)}%
                    </div>
                    {/* Keyboard shortcut hint */}
                    <div className="absolute top-1 right-1 text-xs text-muted-foreground font-mono">
                      {index + 1}
                    </div>
                  </TabsTrigger>
                ))}
              </TabsList>

              {/* Enhanced Kit Content Panels with Better Visual Structure */}
              {kits.map((kit, index) => (
                <TabsContent key={kit.id} value={index.toString()} className="mt-8">
                  {/* Completion Celebration Overlay */}
                  {celebratingKit === kit.id && (
                    <div className="fixed inset-0 bg-green-500/20 backdrop-blur-sm z-50 flex items-center justify-center">
                      <div className="bg-white rounded-2xl p-8 shadow-2xl border-4 border-green-400 animate-pulse">
                        <div className="text-center">
                          <div className="text-6xl mb-4">🎉</div>
                          <h3 className="text-2xl font-bold text-green-800 mb-2">
                            Kit {kit.kitNumber} Completed!
                          </h3>
                          <p className="text-green-600">
                            Great job! Moving to the next kit in a moment...
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <Card className="border-2 shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-muted/30 to-muted/50 border-b">
                      <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                              <span className="text-white font-bold text-lg">{kit.kitNumber}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xl sm:text-2xl font-bold text-foreground">
                                Kit {kit.kitNumber} of {kits.length}
                              </span>
                              <span className="text-lg font-semibold text-blue-600">
                                {kit.kitType} Kit
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge 
                            variant={getKitStatusVariant(index)}
                            className="px-3 py-1 text-sm font-medium"
                          >
                            {getKitStatusText(index)}
                          </Badge>
                          <div className="text-sm text-muted-foreground">
                            {getKitProgress(index)}% Complete
                          </div>
                        </div>
                      </CardTitle>
                      
                      {/* Enhanced Kit Navigation Controls */}
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-muted">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={goToPreviousKit}
                            disabled={activeKitIndex === 0}
                            className="flex items-center gap-2"
                          >
                            ← Previous Kit
                          </Button>
                          <span className="text-sm text-muted-foreground">
                            {activeKitIndex > 0 ? `Kit ${kits[activeKitIndex - 1].kitNumber}` : 'No previous kit'}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            {activeKitIndex < kits.length - 1 ? `Kit ${kits[activeKitIndex + 1].kitNumber}` : 'No next kit'}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={goToNextKit}
                            disabled={activeKitIndex === kits.length - 1}
                            className="flex items-center gap-2"
                          >
                            Next Kit →
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-8">
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
                          onNext={(values: ChildInfo) => handleChildInfoSubmit(index, values)}
                          onBack={() => {}}
                          user={user}
                          userInfo={userInfo}
                          order={order}
                          selectedKitId={kit.id}
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
                          onNext={(consentData: any) => handleConsentSubmit(index, true, consentData)}
                          onBack={() => {}}
                          childInfo={childrenData[index]?.childInfo || null}
                          userInfo={userInfo}
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
                          onNext={() => {}}
                          saving={false}
                          saveError={null}
                          onBack={() => {}}
                          order={order}
                          selectedKitId={kit.id}
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
                    </CardContent>
                  </Card>
                </TabsContent>
              ))}
            </Tabs>
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
    </div>
  );
}
