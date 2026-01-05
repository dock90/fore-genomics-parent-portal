'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { PenLine, Check, Calendar, User, Baby } from 'lucide-react';
import { SignaturePad } from '@/components/ui/signature-pad';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import type { StepProps } from '@/lib/onboarding/types';
import { useStepSubmit } from '@/lib/onboarding/step-context';

export default function ConsentSignatureStep({ onNext, state }: StepProps) {
  // Pre-populate from state
  const childFullName = useMemo(() => {
    return `${state.childFirstName} ${state.childLastName}`.trim();
  }, [state.childFirstName, state.childLastName]);

  const signerFullName = useMemo(() => {
    return `${state.firstName} ${state.lastName}`.trim();
  }, [state.firstName, state.lastName]);

  const [signature, setSignature] = useState<string | null>(state.consent.signature);
  const [signatureDate, setSignatureDate] = useState(
    state.consent.signatureDate || new Date().toISOString().split('T')[0]
  );
  const [signerName, setSignerName] = useState(state.consent.signerName || signerFullName);
  const [childName, setChildName] = useState(state.consent.childName || childFullName);
  const [childDOB, setChildDOB] = useState(state.consent.childDOB || state.childDob);

  const isValid = signature && signerName && childName && signatureDate;

  // Summary of accepted consents
  const consentSummary = [
    { label: 'Fore Genomics Services', accepted: state.consent.part1Accepted },
    { label: 'Genetic Testing', accepted: state.consent.part2Accepted },
    { label: 'Telehealth Services', accepted: state.consent.part3Accepted },
  ];

  const handleSubmit = () => {
    if (!signature) {
      toast.info('Please provide your signature to continue');
      return;
    }
    if (!signerName.trim()) {
      toast.info('Please enter your full name');
      return;
    }
    if (!childName.trim()) {
      toast.info('Please confirm the child\'s name');
      return;
    }

    onNext({
      consent: {
        ...state.consent,
        signature,
        signatureDate,
        signerName,
        childName,
        childDOB,
      },
    });
  };

  useStepSubmit(handleSubmit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-14 h-14 mx-auto bg-emerald-100 rounded-full flex items-center justify-center mb-3"
        >
          <PenLine className="w-7 h-7 text-emerald-600" />
        </motion.div>
        <h1 className="text-xl font-bold text-slate-900">
          Sign Your Consent
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Please review and sign below to complete your consent
        </p>
      </div>

      {/* Consent Summary */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-slate-50 rounded-xl p-4"
      >
        <h3 className="text-sm font-semibold text-slate-700 mb-3">
          You have agreed to:
        </h3>
        <div className="space-y-2">
          {consentSummary.map((item, index) => (
            <div key={item.label} className="flex items-center gap-2">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                item.accepted ? 'bg-emerald-100' : 'bg-slate-200'
              }`}>
                {item.accepted ? (
                  <Check className="w-3 h-3 text-emerald-600" />
                ) : (
                  <span className="text-xs text-slate-400">{index + 1}</span>
                )}
              </div>
              <span className={`text-sm ${item.accepted ? 'text-slate-700' : 'text-slate-400'}`}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Form Fields */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="space-y-4"
      >
        {/* Child's Name */}
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-sm text-slate-600">
            <Baby className="w-4 h-4" />
            Child's Name
          </Label>
          <Input
            value={childName}
            onChange={(e) => setChildName(e.target.value)}
            placeholder="Child's full name"
            className="h-12 text-base"
          />
        </div>

        {/* Child's DOB */}
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-sm text-slate-600">
            <Calendar className="w-4 h-4" />
            Child's Date of Birth
          </Label>
          <Input
            type="date"
            value={childDOB}
            onChange={(e) => setChildDOB(e.target.value)}
            className="h-12 text-base"
          />
        </div>

        {/* Divider */}
        <div className="border-t border-slate-200 pt-4">
          <p className="text-xs text-slate-500 mb-3">
            Signing as: <span className="font-medium text-slate-700">{state.relationshipToChild || 'Parent/Guardian'}</span>
          </p>
        </div>

        {/* Your Name */}
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-sm text-slate-600">
            <User className="w-4 h-4" />
            Your Full Name
          </Label>
          <Input
            value={signerName}
            onChange={(e) => setSignerName(e.target.value)}
            placeholder="Your full name"
            className="h-12 text-base"
          />
        </div>

        {/* Date */}
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-sm text-slate-600">
            <Calendar className="w-4 h-4" />
            Today's Date
          </Label>
          <Input
            type="date"
            value={signatureDate}
            onChange={(e) => setSignatureDate(e.target.value)}
            className="h-12 text-base"
          />
        </div>
      </motion.div>

      {/* Signature Pad */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <Label className="text-sm font-medium text-slate-700 mb-2 block">
          Your Signature
        </Label>
        <SignaturePad
          onSignatureChange={setSignature}
          initialSignature={signature}
          width={320}
          height={150}
          className="w-full"
        />
      </motion.div>

      {/* Legal Text */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-xs text-slate-400 text-center leading-relaxed"
      >
        By signing above, I confirm that I am the parent or legal guardian of the
        child named above and have the authority to consent to genetic testing on
        their behalf. I have read and understand all consent documents.
      </motion.p>
    </div>
  );
}
