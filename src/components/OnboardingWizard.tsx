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

  // Fetch existing user data on component mount
  React.useEffect(() => {
    const fetchExistingData = async () => {
      if (!user?.primaryEmailAddress?.emailAddress) return;
      
      try {
        const response = await fetch(`/api/user/current`);
        if (response.ok) {
          const userData = await response.json();
          setExistingUserData(userData);
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
    mode: 'onChange',
  });

  // Update form when existing data is loaded
  React.useEffect(() => {
    if (existingUserData?.user?.profile) {
      form.reset({
        firstName: existingUserData.user.profile.firstName || user?.firstName || "",
        lastName: existingUserData.user.profile.lastName || user?.lastName || "",
        address: existingUserData.user.profile.address || "",
        city: existingUserData.user.profile.city || "",
        state: existingUserData.user.profile.state || "",
        zipCode: existingUserData.user.profile.zipCode || "",
        phone: existingUserData.user.profile.phone || "",
      });
    }
  }, [existingUserData, form, user]);

  const childForm = useForm<ChildInfo>({
    resolver: zodResolver(childInfoSchema),
    defaultValues: {
      firstName: invitationData?.childFirstName || existingUserData?.user?.children?.[0]?.firstName || "",
      lastName: invitationData?.childLastName || existingUserData?.user?.children?.[0]?.lastName || "",
      dob: invitationData?.childDOB ? new Date(invitationData.childDOB).toISOString().split('T')[0] : 
           existingUserData?.user?.children?.[0]?.dob || "",
      dueDate: "",
      isNotYetBorn: false,
      sex: invitationData?.childSex || existingUserData?.user?.children?.[0]?.sex || undefined,
      ethnicity: invitationData?.childEthnicity || existingUserData?.user?.children?.[0]?.ethnicities || undefined,
      relationshipToChild: undefined,
    },
    mode: 'onChange',
  });

  // Update child form when existing data is loaded
  React.useEffect(() => {
    if (existingUserData?.user?.children?.[0]) {
      const child = existingUserData.user.children[0];
      childForm.reset({
        firstName: invitationData?.childFirstName || child.firstName || "",
        lastName: invitationData?.childLastName || child.lastName || "",
        dob: invitationData?.childDOB ? new Date(invitationData.childDOB).toISOString().split('T')[0] : 
             child.dob || "",
        dueDate: "",
        isNotYetBorn: false,
        sex: invitationData?.childSex || child.sex || undefined,
        ethnicity: invitationData?.childEthnicity || child.ethnicities || undefined,
        relationshipToChild: undefined,
      });
    }
  }, [existingUserData, childForm, invitationData]);

  // Function to scroll to top
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Scroll to top when component mounts
  React.useEffect(() => {
    scrollToTop();
  }, []);

  // Function to change step and scroll to top
  const changeStep = (newStep: number) => {
    setStep(newStep);
    // Use setTimeout to ensure the step change happens before scrolling
    setTimeout(() => {
      scrollToTop();
    }, 100);
  };

  function onSubmit(values: UserInfo) {
    setUserInfo(values);
    changeStep(1);
  }

  function onChildSubmit(values: any) {
    // Check if this is an invitation submission
    if (values.type === "invitation_sent") {
      // Handle invitation sent - show invitation confirmation
      setChildInfo(null); // Clear child info since we're not proceeding with consent
      setIsInvitationFlow(true);
      setIsUnbornChildFlow(false);
      changeStep(4); // Skip to confirmation step
      return;
    }
    
    // Check if this is an unborn child submission
    if (values.type === "unborn_child") {
      // Handle unborn child - save data and show unborn child confirmation
      setChildInfo(values.data);
      setIsInvitationFlow(false);
      setIsUnbornChildFlow(true);
      changeStep(4); // Skip to confirmation step
      return;
    }
    
    // Normal child info submission
    setChildInfo(values);
    setIsInvitationFlow(false);
    setIsUnbornChildFlow(false);
    changeStep(2);
  }

  function onConsentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (consentAccepted) {
      // Extract consent data from the form
      const formData = new FormData(e.target as HTMLFormElement);
      const consentInfo = {
        part1Accepted: formData.get('part1') === 'on',
        part2Accepted: formData.get('part2') === 'on',
        part3Accepted: formData.get('part3') === 'on',
        consentAll: formData.get('consentAll') === 'on',
        signature: formData.get('signature'),
        signatureDate: formData.get('signatureDate'),
        signerName: formData.get('signerName'),
        relationshipToChild: formData.get('relationshipToChild'),
        childName: formData.get('childName'),
        childDOB: formData.get('childDOB'),
      };
      setConsentData(consentInfo);
      changeStep(3);
    }
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
        }),
      });
      
      if (!res.ok) {
        throw new Error("Failed to save onboarding data");
      }
      
      changeStep(4);
    } catch (err: any) {
      setSaveError(err.message || "Unknown error");
    } finally {
      setSaving(false);
    }
  }

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
                Step {step + 1} of 5
              </div>
            </div>
            <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((step + 1) / 5) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Step Content */}
          <div className="min-h-[400px] sm:min-h-[500px]">
            {step === 0 && (
              <UserInfoStep form={{...form, US_STATES}} user={user} onNext={onSubmit} invitationData={invitationData} />
            )}
            {step === 1 && (
              <ChildInfoStep form={childForm} onNext={onChildSubmit} onBack={() => changeStep(0)} user={user} userInfo={userInfo} />
            )}
            {step === 2 && (
              <ConsentStep 
                consentAccepted={consentAccepted} 
                setConsentAccepted={setConsentAccepted} 
                onNext={onConsentSubmit} 
                onBack={() => changeStep(1)}
                childInfo={childInfo}
                userInfo={userInfo}
              />
            )}
            {step === 3 && (
              <QuestionnaireStep questionnaire={questionnaire} setQuestionnaire={setQuestionnaire} onNext={onQuestionnaireSubmit} saving={saving} saveError={saveError} onBack={() => changeStep(2)} />
            )}
            {step === 4 && (
              isInvitationFlow ? (
                <InvitationConfirmationStep />
              ) : isUnbornChildFlow ? (
                <UnbornChildConfirmationStep 
                  childInfo={childInfo} 
                  userInfo={userInfo} 
                  onBack={() => changeStep(1)}
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