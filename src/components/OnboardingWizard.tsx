"use client";

import * as React from "react";
import { useUser } from "@clerk/nextjs";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import UserInfoStep from './onboarding/UserInfoStep';
import ChildInfoStep from './onboarding/ChildInfoStep';
import ConsentStep from './onboarding/ConsentStep';
import QuestionnaireStep from './onboarding/QuestionnaireStep';
import ConfirmationStep from './onboarding/ConfirmationStep';
import InvitationConfirmationStep from './onboarding/InvitationConfirmationStep';
import UnbornChildConfirmationStep from './onboarding/UnbornChildConfirmationStep';
import { KitSelectionStep } from './onboarding/KitSelectionStep';

const userInfoSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  address: z.string().min(1, "Street address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zipCode: z.string().min(1, "ZIP code is required"),
  phone: z.string().min(1, "Phone number is required"),
});

type UserInfo = z.infer<typeof userInfoSchema>;

const childInfoSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  dob: z.string().optional(),
  dueDate: z.string().optional().refine((val) => {
    if (!val) return true; // Allow empty for optional field
    const dueDate = new Date(val);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day for comparison
    return dueDate >= today;
  }, {
    message: "Due date must be in the future"
  }),
  isNotYetBorn: z.boolean().optional(),
  sex: z.enum(["Male", "Female"]).optional(),
  ethnicity: z.array(z.string()).optional(),
  ethnicityOther: z.string().optional(),
  relationshipToChild: z.enum(["Parent", "Guardian", "Other"]).optional(),
});

type ChildInfo = z.infer<typeof childInfoSchema>;

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"
];

function OnboardingWizard({ invitationData }: { invitationData?: any }) {
  const { user } = useUser();
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [userInfo, setUserInfo] = React.useState<UserInfo | null>(null);
  const [childInfo, setChildInfo] = React.useState<ChildInfo | null>(null);
  const [consentAccepted, setConsentAccepted] = React.useState(false);
  const [consentData, setConsentData] = React.useState<any>(null);
  const [isInvitationFlow, setIsInvitationFlow] = React.useState(false);
  const [isUnbornChildFlow, setIsUnbornChildFlow] = React.useState(false);
  const [questionnaire, setQuestionnaire] = React.useState({
    question1: undefined,
    question1Details: '',
    question2: undefined,
    question2Details: '',
    question3: undefined,
    question3Details: '',
  });
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [existingUserData, setExistingUserData] = React.useState<any>(null);
  
  // Multi-kit support
  const [selectedKitId, setSelectedKitId] = React.useState<string | null>(null);
  const [needsKitSelection, setNeedsKitSelection] = React.useState(false);
  const [totalSteps, setTotalSteps] = React.useState(5);
  const [kitSelectionRefreshTrigger, setKitSelectionRefreshTrigger] = React.useState(0);

  // Fetch existing user data on component mount
  React.useEffect(() => {
    const fetchExistingData = async () => {
      if (!user?.primaryEmailAddress?.emailAddress) return;
      
      try {
        const response = await fetch(`/api/user/current`);
        if (response.ok) {
          const userData = await response.json();
          setExistingUserData(userData);
          
          // Check if this is a multi-kit order that needs kit selection
          if (userData?.order?.kitCount > 1) {
            setNeedsKitSelection(true);
            setTotalSteps(6); // Add one more step for kit selection
          }
        }
      } catch (error) {
        console.error('Error fetching existing user data:', error);
      }
    };

    fetchExistingData();
  }, [user]);

  const form = useForm<UserInfo>({
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

  const childForm = useForm<ChildInfo>({
    resolver: zodResolver(childInfoSchema),
    defaultValues: {
      firstName: existingUserData?.children?.[0]?.firstName || "",
      lastName: existingUserData?.children?.[0]?.lastName || "",
      dob: existingUserData?.children?.[0]?.dob || "",
      dueDate: existingUserData?.children?.[0]?.dueDate || "",
      isNotYetBorn: existingUserData?.children?.[0]?.dueDate ? true : false,
      sex: existingUserData?.children?.[0]?.sex || undefined,
      ethnicity: existingUserData?.children?.[0]?.ethnicities || [],
      ethnicityOther: "",
      relationshipToChild: undefined,
    },
  });

  // Update form defaults when existingUserData changes
  React.useEffect(() => {
    if (existingUserData) {
      form.reset({
        firstName: existingUserData.user?.profile?.firstName || user?.firstName || "",
        lastName: existingUserData.user?.profile?.lastName || user?.lastName || "",
        address: existingUserData.user?.profile?.address || "",
        city: existingUserData.user?.profile?.city || "",
        state: existingUserData.user?.profile?.state || "",
        zipCode: existingUserData.user?.profile?.zipCode || "",
        phone: existingUserData.user?.profile?.phone || "",
      });

      childForm.reset({
        firstName: existingUserData.children?.[0]?.firstName || "",
        lastName: existingUserData.children?.[0]?.lastName || "",
        dob: existingUserData.children?.[0]?.dob || "",
        dueDate: existingUserData.children?.[0]?.dueDate || "",
        isNotYetBorn: existingUserData.children?.[0]?.dueDate ? true : false,
        sex: existingUserData.children?.[0]?.sex || undefined,
        ethnicity: existingUserData.children?.[0]?.ethnicities || [],
        ethnicityOther: "",
        relationshipToChild: undefined,
      });
    }
  }, [existingUserData, user, form, childForm]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const changeStep = (newStep: number) => {
    setStep(newStep);
    setSaveError(null);
    scrollToTop();
  };

  function onSubmit(values: UserInfo) {
    setUserInfo(values);
    changeStep(needsKitSelection ? 1 : 1); // If needs kit selection, go to kit selection, otherwise go to child info
  }

  function onChildSubmit(values: any) {
    console.log('ChildInfoStep submitted with values:', values);
    console.log('needsKitSelection:', needsKitSelection);
    console.log('selectedKitId:', selectedKitId);
    
    setChildInfo(values);
    
    // Check if this is an unborn child flow
    if (values.isNotYetBorn) {
      setIsUnbornChildFlow(true);
      changeStep(needsKitSelection ? 5 : 4); // Go to unborn child confirmation
    } else {
      changeStep(needsKitSelection ? 3 : 2); // Go to consent step
    }
  }

  function onConsentSubmit(consentData: any) {
    console.log('ConsentStep submitted with data:', consentData);
    console.log('consentAccepted:', consentAccepted);
    console.log('needsKitSelection:', needsKitSelection);
    
    if (!consentAccepted) {
      setSaveError("You must accept the consent form to continue");
      return;
    }
    
    // Store the consent data for later use
    setConsentData(consentData);
    changeStep(needsKitSelection ? 4 : 3); // Go to questionnaire step
  }

  async function onQuestionnaireSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);

    try {
      // Use invitation email if available, otherwise use current user's email
      const emailToUse = invitationData?.parentEmail || user?.primaryEmailAddress?.emailAddress;
      
      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail: emailToUse,
          userInfo,
          childInfo,
          consentAccepted,
          consentData,
          questionnaire,
          kitId: selectedKitId, // Include the selected kit ID
        }),
      });
      
      if (!res.ok) {
        throw new Error("Failed to save onboarding data");
      }

      // Check if there are more kits to complete
      if (needsKitSelection && existingUserData?.order?.id) {
        const kitsResponse = await fetch(`/api/orders/${existingUserData.order.id}/kits`);
        if (kitsResponse.ok) {
          const kits = await kitsResponse.json();
          const pendingKits = kits.filter((kit: any) => 
            kit.status === 'PENDING_ONBOARDING' && 
            !kit.childId && 
            !kit.consentId && 
            !kit.questionnaireId
          );
          
          if (pendingKits.length > 0) {
            // There are more kits to complete, go back to kit selection
            setSelectedKitId(null); // Reset selected kit
            setKitSelectionRefreshTrigger(prev => prev + 1); // Trigger refresh
            changeStep(1); // Go back to kit selection
            return;
          }
        }
      }
      
      // All kits are complete or single kit order, go to confirmation
      changeStep(needsKitSelection ? 5 : 4);
    } catch (err: any) {
      setSaveError(err.message || "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  // Handle kit selection
  const handleKitSelected = (kitId: string) => {
    setSelectedKitId(kitId);
    
    // Reset child form to clear any previous kit's data
    childForm.reset({
      firstName: "",
      lastName: "",
      dob: "",
      dueDate: "",
      isNotYetBorn: false,
      sex: undefined,
      ethnicity: [],
      ethnicityOther: "",
      relationshipToChild: undefined,
    });
    
    // Reset all kit-specific state
    setChildInfo(null);
    setConsentAccepted(false);
    setConsentData(null);
    setQuestionnaire({
      question1: undefined,
      question1Details: '',
      question2: undefined,
      question2Details: '',
      question3: undefined,
      question3Details: '',
    });
    
    changeStep(2); // Go to child info step
  };

  const handleKitSelectionBack = () => {
    changeStep(0); // Go back to user info
  };

  return (
    <div className="container-mobile container-tablet container-desktop">
      <div className="mobile-padding mobile-spacing">
        <div className="max-w-2xl mx-auto">
          {/* Progress Indicator */}
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center justify-between">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">
                Complete Onboarding
              </h1>
              <div className="text-sm sm:text-base text-muted-foreground">
                Step {step + 1} of {totalSteps}
              </div>
            </div>
            <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Step Content */}
          <div className="min-h-[400px] sm:min-h-[500px]">
            {step === 0 && (
              <UserInfoStep form={{...form, US_STATES}} user={user} onNext={onSubmit} invitationData={invitationData} />
            )}
            {step === 1 && needsKitSelection && (
              <KitSelectionStep 
                orderId={existingUserData?.order?.id}
                onKitSelected={handleKitSelected}
                onBack={handleKitSelectionBack}
                refreshTrigger={kitSelectionRefreshTrigger}
              />
            )}
            {step === (needsKitSelection ? 2 : 1) && (
              <ChildInfoStep 
                form={childForm} 
                onNext={onChildSubmit} 
                onBack={() => changeStep(needsKitSelection ? 1 : 0)} 
                user={user} 
                userInfo={userInfo}
                order={existingUserData?.order}
                selectedKitId={selectedKitId}
              />
            )}
            {step === (needsKitSelection ? 3 : 2) && (
              <ConsentStep 
                consentAccepted={consentAccepted} 
                setConsentAccepted={setConsentAccepted} 
                onNext={onConsentSubmit} 
                onBack={() => changeStep(needsKitSelection ? 2 : 1)}
                childInfo={childInfo}
                userInfo={userInfo}
              />
            )}
            {step === (needsKitSelection ? 4 : 3) && (
              <QuestionnaireStep 
                questionnaire={questionnaire} 
                setQuestionnaire={setQuestionnaire} 
                onNext={onQuestionnaireSubmit} 
                saving={saving} 
                saveError={saveError} 
                onBack={() => changeStep(needsKitSelection ? 3 : 2)}
                order={existingUserData?.order}
                selectedKitId={selectedKitId}
              />
            )}
            {step === (needsKitSelection ? 5 : 4) && (
              isInvitationFlow ? (
                <InvitationConfirmationStep />
              ) : isUnbornChildFlow ? (
                <UnbornChildConfirmationStep 
                  childInfo={childInfo} 
                  userInfo={userInfo} 
                  onBack={() => changeStep(needsKitSelection ? 2 : 1)}
                />
              ) : (
                <ConfirmationStep onDashboard={() => router.push("/dashboard")} />
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default OnboardingWizard; 