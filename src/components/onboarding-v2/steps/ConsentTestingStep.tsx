'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollToEnable, ConsentCard } from '@/components/ui/scroll-to-enable';
import type { StepProps } from '@/lib/onboarding/types';
import { useStepSubmit } from '@/lib/onboarding/step-context';

export default function ConsentTestingStep({ onNext, state }: StepProps) {
  const [hasScrolled, setHasScrolled] = useState(state.consent.part2Scrolled);
  const [accepted, setAccepted] = useState(state.consent.part2Accepted);

  const handleSubmit = () => {
    if (!hasScrolled || !accepted) {
      return;
    }
    onNext({
      consent: {
        ...state.consent,
        part2Scrolled: true,
        part2Accepted: true,
      },
    });
  };

  useStepSubmit(handleSubmit);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">
          Part 2: Genetic Testing Consent
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Understanding what genetic testing involves
        </p>
      </div>

      {/* Scrollable Content */}
      <ConsentCard title="Informed Consent for Genetic Testing">
        <ScrollToEnable
          onScrollComplete={setHasScrolled}
          isCompleted={hasScrolled}
          height="max-h-[45vh]"
        >
          <div className="space-y-4">
            <p>
              Healthcare providers will review your submission and order Fore
              Genomics Pediatric Health Screen test(s). The Fore Genomics
              Pediatric Health Screen will be performed by Inocras Inc. ("we",
              "us", or "Inocras"), a collaborator of Fore Genomics,
              Inc, at its clinical laboratory.
            </p>

            <div className="space-y-4">
              <div>
                <strong>What is this testing and why is it being done?</strong>
                <p className="mt-2">
                  The test(s) to be ordered are genetic tests that involve
                  whole genome sequencing (WGS). WGS examines all of the DNA
                  in the human genetic code including coding and non-coding
                  regions. Its purpose is to identify a genetic basis of an
                  existing or potential disorder. WGS can aid in the diagnosis
                  of patients who are thought to have a genetic condition when
                  the exact condition is not clear. In these situations, WGS
                  can be used instead of many individual genetic tests.
                </p>
              </div>

              <div>
                <strong>How is testing performed?</strong>
                <p className="mt-2">
                  Testing is performed on a sample of your DNA collected on
                  your buccal (cheek) swab and sent to us ("Sample"). Once
                  collected, WGS will be performed on your Sample producing a
                  large amount of genetic information. The WGS analysis can
                  take into account any submitted clinical history, family
                  history as well as currently available genetic information
                  in medical literature and databases.
                </p>
              </div>

              <div>
                <strong>What is the benefit of this test and what might I learn?</strong>
                <p className="mt-2">
                  If you take this test, we may find gene variant(s) that are
                  important to your health and/or the health of your
                  relatives. In that case, you and your family may benefit
                  from knowing that information. WGS is performed to identify
                  a potential genetic basis for a condition affecting you, and
                  results will be reported to help address that question.
                </p>

                <div className="mt-3 space-y-3">
                  <div>
                    <strong>The results of this test could be:</strong>
                  </div>

                  <div className="pl-4 space-y-2">
                    <div>
                      <strong className="text-emerald-700">a. Positive:</strong>
                      <ul className="list-disc list-inside mt-1 space-y-1 pl-2 text-slate-600">
                        <li>Identify a likely diagnosis of a genetic condition; support treatment selection; or support clinical decision making</li>
                        <li>Identify a predisposition or an increased risk for developing a genetic disease in the future</li>
                        <li>Have implications for other family members</li>
                      </ul>
                    </div>

                    <div>
                      <strong className="text-amber-700">b. Negative:</strong>
                      <ul className="list-disc list-inside mt-1 space-y-1 pl-2 text-slate-600">
                        <li>Reduce but not eliminate the possibility that your condition has a genetic basis</li>
                        <li>Reduce but not eliminate your predisposition or risk for developing a genetic disease in the future</li>
                        <li>Be uninformative or not remove the need for additional testing</li>
                      </ul>
                    </div>

                    <div>
                      <strong className="text-slate-700">c. Of uncertain significance:</strong>
                      <ul className="list-disc list-inside mt-1 space-y-1 pl-2 text-slate-600">
                        <li>Result in recommendation of additional testing for you or genetic testing of additional family members</li>
                        <li>Remain uncertain for the foreseeable future</li>
                        <li>Be resolved over time if additional information becomes available</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="mt-3">
                  <strong>Secondary (incidental) findings:</strong>
                  <p className="mt-2">
                    This test(s) reports incidental findings in accordance
                    with the recommendations published by the American College
                    of Medical Genetics and Genomics (ACMG). ACMG has compiled
                    a list of genes for which specific mutations are known to
                    be causative of disorders with defined phenotypes that are
                    clinically actionable by an accepted intervention.
                  </p>
                </div>
              </div>

              <div>
                <strong>What are the risks and limitations of this testing?</strong>
                <p className="mt-2">
                  The test is designed to provide insights to assist your
                  healthcare provider to make informed decisions. However, the
                  test reports do not provide a definitive medical diagnosis
                  nor specific treatment recommendations. There is no
                  guarantee that the test will yield clinically relevant
                  information, impact your healthcare decisions, or otherwise
                  lead to any particular or beneficial outcome.
                </p>
                <p className="mt-2">
                  WGS has technical limitations that may prevent certain sequence
                  changes in the DNA from being detected. This test may not be
                  able to detect all types of DNA changes. The process of WGS
                  is not 100% error-free.
                </p>
                <p className="mt-2">
                  Since some genetic variations may indicate future health
                  problems for you and your relatives, this information might
                  be of interest to healthcare providers, life insurance
                  companies, and others. Federal and State laws provide some
                  protections against discrimination based on genetic
                  information (GINA). However, it does not prevent companies that
                  sell life insurance, disability insurance, or long-term care
                  insurance from using genetic information.
                </p>
              </div>

              <div>
                <strong>How will I learn my results?</strong>
                <p className="mt-2">
                  Test reports are released to the certified healthcare
                  provider(s) that orders your test. A copy will be provided
                  to you by us through Fore Genomics if you request it. Test
                  reports are confidential and will only be shared in
                  accordance with applicable laws. Your test report is
                  available for you to download from the Fore Genomics patient
                  portal or can be requested by phone, email, or fax.
                </p>
              </div>

              <div>
                <strong>Who can I speak to about my test and results?</strong>
                <p className="mt-2">
                  It is recommended that you consult with a genetic counselor
                  or your healthcare provider before consenting to this test.
                  It is also recommended that you speak to a genetic counselor
                  or your healthcare provider about your results. You can
                  contact a genetic counselor through telehealth or find one
                  in your area on the National Society of Genetic Counselors'
                  website (www.NSGC.org).
                </p>
              </div>

              <div>
                <strong>What happens to my data and sample?</strong>
                <p className="mt-2">
                  We take robust measures to help keep your data safe, secure,
                  and confidential and we limit the use of your data to only
                  the permitted purposes. We use technical, administrative and
                  physical safeguards to secure your data and protect it
                  against misuse, loss, or alteration.
                </p>
                <p className="mt-2">
                  The following activities are a core part of the Fore
                  Genomics Pediatric Health Screen test services:
                </p>
                <ol className="list-decimal list-inside space-y-1 mt-2 pl-2 text-slate-600">
                  <li>Providing genetic testing services, including preparing and delivering a genetic test report</li>
                  <li>Performing operational activities in support of the test, such as billing</li>
                  <li>Internal uses for validation, quality improvement, and product development</li>
                  <li>Sharing of data that is summarized at a group or aggregate level</li>
                </ol>
              </div>

              <div className="bg-sky-50 p-3 rounded-lg border border-sky-200">
                <strong>ATTESTATION OF INFORMED CONSENT:</strong>
                <p className="mt-2">
                  I have been given information about Inocras's whole genome
                  sequencing test and Fore's Pediatric Genetic Health Screen.
                  I understand the purpose of the test and the possible
                  benefits and risks of the test. I have been given a full
                  opportunity to ask questions that I may have about the test.
                  I voluntarily agree to undergo this testing. I authorize
                  Inocras to use my Samples for the purpose of the test.
                </p>
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
          id="part2-accept"
          checked={accepted}
          onCheckedChange={(checked) => setAccepted(checked === true)}
          disabled={!hasScrolled}
          className="mt-0.5"
        />
        <label
          htmlFor="part2-accept"
          className={`text-sm leading-relaxed cursor-pointer ${
            !hasScrolled ? 'text-slate-400' : 'text-slate-700'
          }`}
        >
          I have read, understood, and agree to the Informed Consent for
          Genetic Testing
        </label>
      </motion.div>
    </div>
  );
}
