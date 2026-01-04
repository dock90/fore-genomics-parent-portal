'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollToEnable, ConsentCard } from '@/components/ui/scroll-to-enable';
import { toast } from 'sonner';
import type { StepProps } from '@/lib/onboarding/types';
import { useStepSubmit } from '@/lib/onboarding/step-context';

export default function ConsentServicesStep({ onNext, state }: StepProps) {
  const [hasScrolled, setHasScrolled] = useState(state.consent.part1Scrolled);
  const [accepted, setAccepted] = useState(state.consent.part1Accepted);

  const handleSubmit = () => {
    if (!hasScrolled) {
      toast.info('Please scroll through the entire document to continue');
      return;
    }
    if (!accepted) {
      toast.info('Please accept the terms to continue');
      return;
    }
    onNext({
      consent: {
        ...state.consent,
        part1Scrolled: true,
        part1Accepted: true,
      },
    });
  };

  useStepSubmit(handleSubmit);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">
          Part 1: Fore Genomics Services
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Please read the following terms and conditions
        </p>
      </div>

      {/* Scrollable Content */}
      <ConsentCard title="Informed Consent to Fore Genomics Services">
        <ScrollToEnable
          onScrollComplete={setHasScrolled}
          isCompleted={hasScrolled}
          height="max-h-[45vh]"
        >
          <div className="space-y-4">
            <p>
              By signing this form, I acknowledge and consent to the following
              additional terms and conditions:
            </p>

            <div className="space-y-4">
              <div>
                <strong>1.</strong> "Fore Genomics, Inc." shall mean Fore
                Genomics, Inc. – and/or its "Collaborators" which includes any
                lab, clinician, clinical facility, research partner, data
                partner, or other persons acting in any way for Fore Genomics,
                Inc. the corporation, and/or any and all of its former,
                current and future officers, directors, employees, agents, or
                contractors. Clinical laboratory testing of your child's
                sample will be performed by Fore Genomics' Collaborator,
                Inocras, Inc., located in San Diego, CA (herein-after
                "Inocras").
              </div>

              <div>
                <strong>2.</strong> Fore Genomics, Inc. uses electronic
                delivery for any official agreement, data, reports, analyses,
                or communications. Any hard copies (physical, printed
                versions) by mail or courier will be subject to additional
                processing and shipment fees payable by me at the then-current
                rates.
              </div>

              <div>
                <strong>3.</strong> Fore Genomics, Inc. uses facsimile or
                electronic signatures for all agreements, and email and
                cloud-based storage for notification and/or deliveries of all
                data after the initial physician's order. I am responsible for
                providing my correct and primary email address for electronic
                or facsimile signature and/or delivery of data, or for
                providing a different email address other than my own which I
                am authorized to use and from which I will sign agreements and
                consents in the future. This email address, or another which I
                designate to Fore Genomics, Inc. in the future, will be the
                primary means by which I will receive information from Fore
                Genomics, Inc.
              </div>

              <div>
                <strong>4.</strong> Fore Genomics, Inc. has my permission to
                contact any person(s) designated on this form designated by me
                who is not signing this form or who has not provided the
                information themselves, and further that Fore Genomics, Inc.'s
                permission to contact such person arises from their permission
                to contact me.
              </div>

              <div>
                <strong>5.</strong> Fore Genomics, Inc. will provide genetic
                counseling service and DNA data storage service with its
                collaborators. Any additional level of service I receive after
                these services will be defined under separate agreement
                between me and Fore Genomics, Inc.
              </div>

              <div>
                <strong>6.</strong> Fore Genomics, Inc. will receive all data
                subject to this form in accordance with my selections on this
                form.
              </div>

              <div>
                <strong>7.</strong> Fore Genomics, Inc. will store my child's
                genomic data in accordance with Fore Genomics' policies and
                procedures which I agree incorporates this consent and
                elections on this form and consent and specifically the
                Sections 8, 9, and 10 below by reference as if set forth fully
                therein and will further define the duration of my child's
                genome data storage as well as the level of services which I
                will receive. I understand I may elect to decline further
                services from Fore Genomics, Inc.
              </div>

              <div>
                <strong>8.</strong> I understand that genomics in general
                represent a significant advancement of science and technology,
                and that innovation does not occur without risk. I understand
                this risk sometimes means knowing something I didn't want to
                know, or missing something that I think I should have known
                sooner. Fore Genomics, Inc. makes no express or implied
                warranty as to the sufficiency, accuracy, or completeness of
                the results, analyses, reanalyses, or any interpretation of
                data associated with its products or services.
              </div>

              <div>
                <strong>9.</strong> I expressly waive any and all liability
                of, and/or claims (known or unknown) against Fore Genomics,
                Inc., its employees, its affiliates/Collaborators, its
                shareholders, its officers or directors by any definition, the
                ordering physician, the ordering physician's practice and any
                related person, or any other person for damages or relief, in
                any court for any cause of action in any jurisdiction, arising
                from testing, storage, interpretation, consulting, guidance,
                information, correlation of my genome, genes, DNA, data, or
                any other information pertaining to any other matter related
                thereto. I further agree to indemnify and hold harmless Fore
                Genomics, Inc. and its affiliates/Collaborators against any
                third party claims which may occur as a result of the
                information I learn, or the actions I take based upon such
                information, or for any other reason related to my genetic
                counseling, DNA, genes, testing, or consulting services and
                products of any form related thereto for any reason.
              </div>

              <div>
                <strong>10.</strong> California law shall govern this consent
                and future agreements between me and Fore Genomics, Inc.
                unless otherwise agreed in such future agreements. Following a
                notice of any claim by me or any person (as defined by{" "}
                <strong>California Evidence Code § 175</strong>) against Fore
                Genomics, Inc. or any person acting on your behalf or through
                any person, I expressly agree to sole venue for any and all
                disputes or claims for damages or other relief arising from
                this agreement or any other involving Fore Genomics, Inc., its
                affiliates, or its Collaborators to be JAMS (Irvine,
                California) mediation, followed by binding arbitration if
                mediation fails. I expressly agree and understand that, should
                my claim against Fore Genomics, Inc. be successful in
                arbitration, that my claim will never exceed a maximum of the
                amount of money paid by me to Fore Genomics, Inc. following
                the date of this consent to the date of such award, plus costs
                of mediation or arbitration. I expressly agree upon execution
                of this agreement that I will not commence, engage in, or
                otherwise support any class action or any other action for any
                reason whatsoever – and that this Section 10 is a material
                inducement by and between me and Fore Genomics, Inc. to
                provide any services hereunder and after the date hereof, and
                that this Section 10 shall remain in effect not less than ten
                years following the last date of the last payment of money
                made by me to Fore Genomics, Inc. or its affiliates,
                inclusive, or each of them.
              </div>
            </div>
          </div>
        </ScrollToEnable>
      </ConsentCard>

      {/* Acceptance Checkbox */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: hasScrolled ? 1 : 0.5, y: 0 }}
        className="flex items-start gap-3 p-4 bg-white rounded-xl border border-slate-200"
      >
        <Checkbox
          id="part1-accept"
          checked={accepted}
          onCheckedChange={(checked) => setAccepted(checked === true)}
          disabled={!hasScrolled}
          className="mt-0.5"
        />
        <label
          htmlFor="part1-accept"
          className={`text-sm leading-relaxed cursor-pointer ${
            !hasScrolled ? 'text-slate-400' : 'text-slate-700'
          }`}
        >
          I have read, understood, and agree to the Informed Consent to
          Fore Genomics Services
        </label>
      </motion.div>
    </div>
  );
}
