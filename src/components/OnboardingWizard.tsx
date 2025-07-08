"use client";

import * as React from "react";
import { useUser } from "@clerk/nextjs";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { RadioGroup } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { useRouter } from "next/navigation";
import UserInfoStep from './onboarding/UserInfoStep';
import ChildInfoStep from './onboarding/ChildInfoStep';
import ConsentStep from './onboarding/ConsentStep';
import QuestionnaireStep from './onboarding/QuestionnaireStep';
import ConfirmationStep from './onboarding/ConfirmationStep';

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
  firstName: z.string().min(1, "Child's first name is required"),
  lastName: z.string().min(1, "Child's last name is required"),
  dob: z.string().min(1, "Date of birth is required"),
  sex: z.enum(["Male", "Female"]),
  ethnicity: z.enum([
    "Hispanic/Latino",
    "White",
    "Black/African American",
    "Asian",
    "Native American",
    "Pacific Islander",
    "Other",
  ]),
});

type ChildInfo = z.infer<typeof childInfoSchema>;

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"
];

function OnboardingWizard() {
  const { user } = useUser();
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [userInfo, setUserInfo] = React.useState<UserInfo | null>(null);
  const [childInfo, setChildInfo] = React.useState<ChildInfo | null>(null);
  const [consentAccepted, setConsentAccepted] = React.useState(false);
  const [questionnaire, setQuestionnaire] = React.useState({
    q1: '',
    q2: '',
    q3: '',
    q1Details: '',
    q2Details: '',
    q3Details: '',
  });
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  const form = useForm<UserInfo>({
    resolver: zodResolver(userInfoSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      phone: "",
    },
    mode: 'onChange',
  });

  const childForm = useForm<ChildInfo>({
    resolver: zodResolver(childInfoSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      dob: "",
      sex: undefined,
      ethnicity: undefined,
    },
    mode: 'onChange',
  });

  function onSubmit(values: UserInfo) {
    setUserInfo(values);
    setStep(1);
  }

  function onChildSubmit(values: ChildInfo) {
    setChildInfo(values);
    setStep(2);
  }

  function onConsentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (consentAccepted) setStep(3);
  }

  async function onQuestionnaireSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userInfo,
          childInfo,
          consentAccepted,
          questionnaire,
        }),
      });
      if (!res.ok) throw new Error("Failed to save onboarding data");
      setStep(4);
    } catch (err: any) {
      setSaveError(err.message || "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-md mx-auto mt-10">
      <h1 className="text-2xl font-bold mb-6">User Onboarding</h1>
      {step === 0 && (
        <UserInfoStep form={{...form, US_STATES}} user={user} onNext={onSubmit} />
      )}
      {step === 1 && (
        <ChildInfoStep form={childForm} onNext={onChildSubmit} onBack={() => setStep(0)} />
      )}
      {step === 2 && (
        <ConsentStep consentAccepted={consentAccepted} setConsentAccepted={setConsentAccepted} onNext={() => setStep(3)} onBack={() => setStep(1)} />
      )}
      {step === 3 && (
        <QuestionnaireStep questionnaire={questionnaire} setQuestionnaire={setQuestionnaire} onNext={onQuestionnaireSubmit} saving={saving} saveError={saveError} onBack={() => setStep(2)} />
      )}
      {step === 4 && (
        <ConfirmationStep onDashboard={() => router.push("/dashboard")} />
      )}
    </div>
  );
}

export default OnboardingWizard; 