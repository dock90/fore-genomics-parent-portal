'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollToEnable, ConsentCard } from '@/components/ui/scroll-to-enable';
import type { StepProps } from '@/lib/onboarding/types';
import { useStepSubmit } from '@/lib/onboarding/step-context';

export default function ConsentTelehealthStep({ onNext, state }: StepProps) {
  const [hasScrolled, setHasScrolled] = useState(state.consent.part3Scrolled);
  const [accepted, setAccepted] = useState(state.consent.part3Accepted);

  const handleSubmit = () => {
    if (!hasScrolled || !accepted) {
      return;
    }
    onNext({
      consent: {
        ...state.consent,
        part3Scrolled: true,
        part3Accepted: true,
        consentAll: true,
      },
    });
  };

  useStepSubmit(handleSubmit);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">
          Part 3: Telehealth Services
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Understanding remote genetic counseling
        </p>
      </div>

      {/* Scrollable Content */}
      <ConsentCard title="Informed Consent for Telehealth Services">
        <ScrollToEnable
          onScrollComplete={setHasScrolled}
          isCompleted={hasScrolled}
          height="max-h-[45vh]"
        >
          <div className="space-y-4">
            <p>
              Telehealth involves the use of secure electronic
              communications, information technology, or other means to
              enable a healthcare provider and a patient at different
              locations to communicate and share individual patient health
              information for the purpose of rendering clinical care. This
              "Telehealth Informed Consent" informs the patient
              ("patient," "you," or "your") concerning the treatment
              methods, risks, and limitations of using a telehealth
              platform as well as some of the means by which the
              healthcare provider and affiliates may communicate with you.
            </p>

            <div>
              <strong>Services Provided:</strong>
              <p className="mt-2">
                Telehealth services offered by AMG Medical Group (DE), P.A,
                and its affiliated medical groups (collectively "Group"),
                and the Group's engaged providers (our "Providers" or your
                "Provider") may include a patient consultation, diagnosis,
                treatment recommendation, and/or a referral to in-person
                care, as determined clinically appropriate (the "Services").
                Your Provider will be licensed in the state where you are
                located at the time of your consultation.
              </p>
              <p className="mt-2">
                DNA Ally, Inc. ("DNA Ally") does not provide the Services;
                it performs administrative, payment, and other supportive
                activities for Group and our Providers.
              </p>
            </div>

            <div>
              <strong>Electronic Transmissions:</strong>
              <p className="mt-2">
                The types of electronic transmissions that may occur using
                the telehealth platform include, but are not limited to:
              </p>
              <ul className="list-disc list-inside space-y-1 mt-2 pl-2 text-slate-600">
                <li>Appointment scheduling</li>
                <li>Completion, exchange, and review of medical intake forms and other clinically relevant information</li>
                <li>Treatment recommendations by your Provider</li>
                <li>Delivery of a consultation report with diagnosis and/or treatment recommendations</li>
              </ul>
            </div>

            <div>
              <strong>Expected Benefits:</strong>
              <ul className="list-disc list-inside space-y-1 mt-2 pl-2 text-slate-600">
                <li>Improved access to care by enabling you to remain in your preferred location</li>
                <li>More efficient care evaluation and management</li>
              </ul>
            </div>

            <div className="bg-red-50 p-3 rounded-lg border border-red-200">
              <strong className="text-red-800">Important Service Limitations:</strong>
              <ul className="list-disc list-inside space-y-2 mt-2 pl-2 text-red-700">
                <li>
                  <strong>OUR PROVIDERS DO NOT ADDRESS MEDICAL EMERGENCIES.</strong> If you
                  believe you are experiencing a medical emergency, dial 9-1-1
                  and/or go to the nearest emergency room.
                </li>
                <li>
                  Our Providers are an addition to, and not a replacement
                  for, your local primary care provider.
                </li>
                <li>Group does not have any in-person clinic locations.</li>
              </ul>
            </div>

            <div>
              <strong>Security Measures:</strong>
              <p className="mt-2">
                The electronic communication systems we use will incorporate
                network and software security protocols to protect the
                confidentiality of patient identification and imaging data.
                All Services delivered through telehealth will be over a secure
                connection that complies with HIPAA requirements.
              </p>
            </div>

            <div>
              <strong>Possible Risks:</strong>
              <ul className="list-disc list-inside space-y-1 mt-2 pl-2 text-slate-600">
                <li>Delays in evaluation and treatment due to equipment or technology failures</li>
                <li>In rare events, information may be of inadequate quality, necessitating rescheduling</li>
                <li>In very rare events, security protocols could fail, causing a breach of privacy</li>
              </ul>
            </div>

            <div>
              <strong>Patient Acknowledgments:</strong>
              <p className="mt-2">I acknowledge, understand, and agree to the following:</p>
              <ol className="list-decimal list-inside space-y-2 mt-2 pl-2 text-slate-600">
                <li>I am at least eighteen (18) years of age and legal guardian for the child I am requesting the test for.</li>
                <li>I am the individual who will collect the sample for the Test(s).</li>
                <li>A Group physician will determine whether or not Test(s) and Services are appropriate.</li>
                <li>My child's health information may be shared with other health care professionals for purposes of providing Services.</li>
                <li>I have read and understand the benefits, risks, limitations and other information about the Test(s).</li>
                <li>The information I have provided is correct to the best of my knowledge.</li>
                <li>Services do not constitute treatment of any condition, disease or illness.</li>
                <li>I will not make medical decisions without consulting my primary care provider.</li>
                <li>If I am experiencing a medical emergency, I have been directed to dial 9-1-1 immediately.</li>
                <li>I have the right to withhold or withdraw my consent to telehealth at any time.</li>
                <li>I am entitled to all confidentiality protections under applicable federal and state laws.</li>
                <li>I agree to receive communications from my Provider and DNA Ally by email, text message, phone or other method.</li>
              </ol>
            </div>

            <div>
              <strong>Additional State-Specific Information:</strong>
              <p className="mt-2 text-slate-600">
                Depending on your state of residence, additional notices and rights may apply.
                You can file complaints about providers through your state's medical board website.
                For Texas residents: Complaints may be reported to the Texas Medical Board,
                333 Guadalupe, Tower 3, Suite 610, P.O. Box 2018, MC-263, Austin, Texas 78768-2018.
              </p>
            </div>

            <div className="bg-secondary p-3 rounded-lg border border-fore-teal-light">
              <strong>Final Attestation:</strong>
              <p className="mt-2">
                By checking the box below, I attest that I have read and understood
                this Informed Consent Form in its entirety. I have had the opportunity
                to ask questions. I acknowledge my free consent to the test and
                all consents indicated above, on behalf of myself and the child.
                I acknowledge that such testing in no way guarantees my health,
                the patient's health, or the health of other family members.
              </p>
              <p className="mt-2">
                I understand that by checking the boxes in this form, I am
                acknowledging that I have read, understood, and certified
                the accuracy of the statements. Checking these boxes is
                equivalent to providing my signature and shall have the same
                binding legal effect as my signature.
              </p>
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
          id="part3-accept"
          checked={accepted}
          onCheckedChange={(checked) => setAccepted(checked === true)}
          disabled={!hasScrolled}
          className="mt-0.5"
        />
        <label
          htmlFor="part3-accept"
          className={`text-sm leading-relaxed cursor-pointer ${
            !hasScrolled ? 'text-slate-400' : 'text-slate-700'
          }`}
        >
          I have read, understood, and agree to the Informed Consent for
          Telehealth Services
        </label>
      </motion.div>
    </div>
  );
}
