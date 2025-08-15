"use client";

import * as React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import UserInfoStep from "./onboarding/UserInfoStep";
import ChildInfoStep from "./onboarding/ChildInfoStep";
import ConsentStep from "./onboarding/ConsentStep";
import QuestionnaireStep from "./onboarding/QuestionnaireStep";
import ConfirmationStep from "./onboarding/ConfirmationStep";
import InvitationConfirmationStep from "./onboarding/InvitationConfirmationStep";
import UnbornChildConfirmationStep from "./onboarding/UnbornChildConfirmationStep";
import { KitSelectionStep } from "./onboarding/KitSelectionStep";
import MultiKitOnboardingForm from "./onboarding/MultiKitOnboardingForm";
import { isFeatureEnabled } from "@/lib/feature-flags";

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

const childInfoSchema = z
  .object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    dob: z
      .string()
      .optional()
      .refine(
        (val) => {
          if (!val) return true; // Allow empty for optional field
          const dob = new Date(val);
          const today = new Date();
          today.setHours(23, 59, 59, 999); // Set to end of day for comparison
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
          if (!val) return true; // Allow empty for optional field
          const dueDate = new Date(val);
          const today = new Date();
          today.setHours(0, 0, 0, 0); // Reset time to start of day for comparison
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
      // If child is not yet born, dueDate is required
      if (data.isNotYetBorn) {
        return !!data.dueDate;
      }
      // If child is born, firstName, lastName, dob, ethnicity, and relationshipToChild are required
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
      path: ["firstName"], // This will show the error on the firstName field
    }
  );

type ChildInfo = z.infer<typeof childInfoSchema>;

const US_STATES = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
];

function OnboardingWizard({
  user,
  invitationData,
}: {
  user: any;
  invitationData?: any;
}) {
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [userInfo, setUserInfo] = React.useState<UserInfo | null>(null);
  const [childInfo, setChildInfo] = React.useState<ChildInfo | null>(null);
  const [consentAccepted, setConsentAccepted] = React.useState(false);

  // Debug wrapper for setConsentAccepted
  const setConsentAcceptedDebug = React.useCallback((value: boolean) => {
    console.log(
      "setConsentAccepted called with:",
      value,
      "type:",
      typeof value
    );
    setConsentAccepted(value);
  }, []);
  const [consentData, setConsentData] = React.useState<any>(null);
  const [isInvitationFlow, setIsInvitationFlow] = React.useState(false);
  const [isUnbornChildFlow, setIsUnbornChildFlow] = React.useState(false);
  const [questionnaire, setQuestionnaire] = React.useState({
    question1: undefined,
    question1Details: "",
    question2: undefined,
    question2Details: "",
    question3: undefined,
    question3Details: "",
  });
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [existingUserData, setExistingUserData] = React.useState<any>(null);

  // Multi-kit support
  const [selectedKitId, setSelectedKitId] = React.useState<string | null>(null);
  const [needsKitSelection, setNeedsKitSelection] = React.useState(false);
  const [totalSteps, setTotalSteps] = React.useState(5);
  const [kitSelectionRefreshTrigger, setKitSelectionRefreshTrigger] =
    React.useState(0);
  const [hasPendingKits, setHasPendingKits] = React.useState(false);
  
  // Multi-kit onboarding form support
  const [shouldUseMultiKitForm, setShouldUseMultiKitForm] = React.useState(false);
  const [kitsData, setKitsData] = React.useState<any[]>([]);
  const [isDeterminingFormType, setIsDeterminingFormType] = React.useState(true);

  const form = useForm<UserInfo>({
    resolver: zodResolver(userInfoSchema),
    defaultValues: {
      firstName:
        existingUserData?.user?.profile?.firstName || user?.firstName || "",
      lastName:
        existingUserData?.user?.profile?.lastName || user?.lastName || "",
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

  // Fetch existing user data on component mount
  React.useEffect(() => {
    const fetchExistingData = async () => {
      if (!user?.email) return;

      try {
        // Use specific orderId from invitation if available
        const url = invitationData?.orderId
          ? `/api/user/current?orderId=${invitationData.orderId}`
          : "/api/user/current";

        const response = await fetch(url);
        if (response.ok) {
          const userData = await response.json();
          setExistingUserData(userData);

          // Check if this order needs kit selection based on actual pending kits
          if (userData?.order?.id) {
            try {
              const kitsResponse = await fetch(
                `/api/orders/${userData.order.id}/kits`
              );
              if (kitsResponse.ok) {
                const kits = await kitsResponse.json();
                const pendingKits = kits.filter(
                  (kit: any) =>
                    kit.order.status === "ORDER_RECEIVED" &&
                    !kit.childId &&
                    !kit.consentId &&
                    !kit.questionnaireId
                );

                // Check if we should use multi-kit form
                if (isFeatureEnabled("MULTI_KIT_ORDERS") && pendingKits.length > 1) {
                  setShouldUseMultiKitForm(true);
                  setKitsData(pendingKits);
                  setNeedsKitSelection(false); // Multi-kit form handles this internally
                  setTotalSteps(1); // Multi-kit form is single page
                } else if (pendingKits.length > 1) {
                  // Fallback to existing kit selection logic
                  setShouldUseMultiKitForm(false);
                  setNeedsKitSelection(true);
                  setTotalSteps(6); // Add one more step for kit selection
                } else {
                  setShouldUseMultiKitForm(false);
                  setNeedsKitSelection(false);
                  setTotalSteps(5); // Standard flow without kit selection
                }
                
                // Mark that we've determined the form type
                setIsDeterminingFormType(false);
              }
            } catch (error) {
              console.error("Error checking pending kits:", error);
              // Fallback to original logic
              if (userData?.order?.kitCount > 1) {
                setShouldUseMultiKitForm(false);
                setNeedsKitSelection(true);
                setTotalSteps(6);
              }
              // Mark that we've determined the form type even on error
              setIsDeterminingFormType(false);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching existing user data:", error);
      }
    };

    fetchExistingData();
  }, [user, invitationData]);

  // Update form defaults when existingUserData changes
  React.useEffect(() => {
    if (existingUserData) {
      form.reset({
        firstName:
          existingUserData.user?.profile?.firstName || user?.firstName || "",
        lastName:
          existingUserData.user?.profile?.lastName || user?.lastName || "",
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
  }, [existingUserData, user]);

  // If no user is provided, show loading or error
  if (!user) {
    return <div>Loading user data...</div>;
  }

  // Show loading while determining which form to use
  if (isDeterminingFormType) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
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

  async function onChildSubmit(values: any) {
    console.log("ChildInfoStep submitted with values:", values);
    console.log("needsKitSelection:", needsKitSelection);
    console.log("selectedKitId:", selectedKitId);
    console.log("relationshipToChild from form:", values.relationshipToChild);

    // Handle special cases from ChildInfoStep
    if (values.type === "unborn_child") {
      console.log("Unborn child flow detected");
      setChildInfo(values.data);
      setIsUnbornChildFlow(true);
      changeStep(needsKitSelection ? 5 : 4); // Go to unborn child confirmation
      return;
    }

    if (values.type === "invitation_sent") {
      console.log("Invitation flow detected");
      setIsInvitationFlow(true);

      // Check if there are more kits to complete for multi-kit orders
      if (needsKitSelection && existingUserData?.order?.id) {
        try {
          const kitsResponse = await fetch(
            `/api/orders/${existingUserData.order.id}/kits`
          );
          if (kitsResponse.ok) {
            const kits = await kitsResponse.json();
            const pendingKits = kits.filter(
              (kit: any) =>
                kit.order.status === "ORDER_RECEIVED" &&
                !kit.childId &&
                !kit.consentId &&
                !kit.questionnaireId
            );
            setHasPendingKits(pendingKits.length > 0);
          }
        } catch (error) {
          console.error("Error checking pending kits:", error);
          setHasPendingKits(false);
        }
      }

      changeStep(needsKitSelection ? 5 : 4); // Go to invitation confirmation
      return;
    }

    // Normal child submission
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
    console.log("ConsentStep submitted with data:", consentData);
    console.log("consentAccepted:", consentAccepted);
    console.log("needsKitSelection:", needsKitSelection);

    // Handle back action
    if (consentData.action === 'goBack') {
      changeStep(needsKitSelection ? 2 : 1); // Go back to child info step
      return;
    }

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
      const emailToUse = invitationData?.parentEmail || user?.email;

      const requestBody = {
        userEmail: emailToUse,
        userInfo,
        childInfo,
        consentAccepted: !!consentAccepted, // force boolean
        consentData,
        questionnaire,
        kitId: selectedKitId, // Include the selected kit ID
      };
      console.log("Sending onboarding data to API:", requestBody);

      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        throw new Error("Failed to save onboarding data");
      }

      // Check if there are more kits to complete
      if (needsKitSelection && existingUserData?.order?.id) {
        const kitsResponse = await fetch(
          `/api/orders/${existingUserData.order.id}/kits`
        );
        if (kitsResponse.ok) {
          const kits = await kitsResponse.json();
          const pendingKits = kits.filter(
            (kit: any) =>
              kit.order.status === "ORDER_RECEIVED" &&
              !kit.childId &&
              !kit.consentId &&
              !kit.questionnaireId
          );

          if (pendingKits.length > 0) {
            // There are more kits to complete, go back to kit selection
            setSelectedKitId(null); // Reset selected kit
            setKitSelectionRefreshTrigger((prev) => prev + 1); // Trigger refresh
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
      question1Details: "",
      question2: undefined,
      question2Details: "",
      question3: undefined,
      question3Details: "",
    });

    changeStep(2); // Go to child info step
  };

  const handleKitSelectionBack = () => {
    changeStep(0); // Go back to user info
  };

  const handleContinueOnboarding = async () => {
    // Reset the onboarding flow to start over for remaining children
    setChildInfo(null);
    setConsentAccepted(false);
    setConsentData(null);
    setIsInvitationFlow(false);
    setIsUnbornChildFlow(false);
    setQuestionnaire({
      question1: undefined,
      question1Details: "",
      question2: undefined,
      question2Details: "",
      question3: undefined,
      question3Details: "",
    });
    setSaveError(null);
    setSaving(false);
    setSelectedKitId(null); // Reset selected kit
    setHasPendingKits(false); // Reset pending kits flag

    // Reset the child form to clear any previous data
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

    // Check actual pending kits to determine navigation
    if (existingUserData?.order?.id) {
      try {
        const kitsResponse = await fetch(
          `/api/orders/${existingUserData.order.id}/kits`
        );
        if (kitsResponse.ok) {
          const kits = await kitsResponse.json();
          const pendingKits = kits.filter(
            (kit: any) =>
              kit.order.status === "ORDER_RECEIVED" &&
              !kit.childId &&
              !kit.consentId &&
              !kit.questionnaireId
          );

          if (pendingKits.length > 1) {
            // Multiple pending kits - go to kit selection
            setNeedsKitSelection(true);
            setTotalSteps(6);
            setKitSelectionRefreshTrigger((prev) => prev + 1); // Trigger refresh
            changeStep(1); // Go to kit selection
          } else {
            // Single pending kit - go directly to child info
            setNeedsKitSelection(false);
            setTotalSteps(5);
            setUserInfo(null);
            changeStep(0); // Go to user info
          }
        }
      } catch (error) {
        console.error("Error checking pending kits:", error);
        // Fallback to user info step
        setUserInfo(null);
        changeStep(0);
      }
    } else {
      // No order data - go to user info
      setUserInfo(null);
      changeStep(0);
    }
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
              {!shouldUseMultiKitForm && (
                <div className="text-sm sm:text-base text-muted-foreground">
                  Step {step + 1} of {totalSteps}
                </div>
              )}
            </div>
            {!shouldUseMultiKitForm && (
              <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
                ></div>
              </div>
            )}
          </div>

          {/* Multi-Kit Onboarding Form (when feature flag enabled and multiple kits) */}
          {shouldUseMultiKitForm && kitsData.length > 0 ? (
            <MultiKitOnboardingForm
              user={user}
              invitationData={invitationData}
              order={existingUserData?.order}
              kits={kitsData}
            />
          ) : (
            /* Step Content */
            <div className="min-h-[400px] sm:min-h-[500px]">
              {step === 0 && (
                <UserInfoStep
                  form={{ ...form, US_STATES }}
                  user={user}
                  onNext={onSubmit}
                  invitationData={invitationData}
                />
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
                user={user}
                userInfo={userInfo}
                order={existingUserData?.order}
                selectedKitId={selectedKitId || ""}
                onSave={onChildSubmit}
                isCompleted={false}
                isReadOnly={false}
              />
            )}
            {step === (needsKitSelection ? 3 : 2) && (
              <ConsentStep
                consentAccepted={consentAccepted}
                setConsentAccepted={setConsentAcceptedDebug}
                onConsentDataChange={onConsentSubmit}
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
                selectedKitId={selectedKitId || ""}
              />
            )}
            {step === (needsKitSelection ? 5 : 4) &&
              (isInvitationFlow ? (
                <InvitationConfirmationStep
                  hasPendingKits={hasPendingKits}
                  onContinueOnboarding={handleContinueOnboarding}
                />
              ) : isUnbornChildFlow ? (
                <UnbornChildConfirmationStep
                  childInfo={childInfo}
                  userInfo={userInfo}
                  onBack={() => changeStep(needsKitSelection ? 2 : 1)}
                  onContinueOnboarding={handleContinueOnboarding}
                />
              ) : (
                <ConfirmationStep
                  onDashboard={() => router.push("/dashboard")}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default OnboardingWizard;
