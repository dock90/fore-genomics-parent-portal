import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import * as React from "react";

export default function QuestionnaireStep({
  questionnaire,
  setQuestionnaire,
  onNext,
  saving,
  saveError,
  onBack,
  order,
  selectedKitId,
  kitContext,
  isLastKit,
  onComplete,
  onSaveAnswers,
}: any) {
  const [checkingKits, setCheckingKits] = React.useState(true);

  // Check if this is the last kit to complete (only if not provided as prop)
  React.useEffect(() => {
    if (isLastKit !== undefined) {
      setCheckingKits(false);
      return;
    }

    const checkRemainingKits = async () => {
      if (!order?.id || !selectedKitId) {
        setCheckingKits(false);
        return;
      }

      try {
        const response = await fetch(`/api/orders/${order.id}/kits`);
        if (response.ok) {
          const kits = await response.json();
          const pendingKits = kits.filter(
            (kit: any) =>
              kit.order.status === "ORDER_RECEIVED" &&
              !kit.childId &&
              !kit.consentId &&
              !kit.questionnaireId
          );

          // If there's only one pending kit and it's the current one, this is the last kit
          const lastKit = pendingKits.length <= 1;
          if (lastKit && onComplete) {
            onComplete(lastKit);
          }
        }
      } catch (error) {
      } finally {
        setCheckingKits(false);
      }
    };

    checkRemainingKits();
  }, [order?.id, selectedKitId, isLastKit, onComplete]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (onNext) {
      onNext(e);
    }
  }

  // Determine button text based on context
  const getButtonText = () => {
    if (saving) return "Saving...";
    if (isLastKit) return "Complete Onboarding";
    return "Continue";
  };

  // Check if form is valid
  const isFormValid =
    questionnaire.question1 !== undefined &&
    questionnaire.question2 !== undefined &&
    questionnaire.question3 !== undefined;

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div className="text-center sm:text-left">
            <h2 className="text-xl sm:text-2xl font-semibold text-foreground">
              Development & Family History Questionnaire
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mt-2">
              Please answer the following questions to help us understand your
              child's medical history
            </p>
          </div>

          <div className="space-y-6 sm:space-y-8">
            {/* Question 1 */}
            <div className="space-y-3 sm:space-y-4">
              <Label className="text-sm sm:text-base font-medium">
                Has your child met all major developmental milestones on time?
              </Label>
              <RadioGroup
                value={
                  questionnaire.question1 === undefined
                    ? undefined
                    : questionnaire.question1.toString()
                }
                onValueChange={(value) => {
                  const newQuestionnaire = {
                    ...questionnaire,
                    question1: value === "true",
                  };
                  setQuestionnaire(newQuestionnaire);
                }}
                className="flex flex-col sm:flex-row gap-3 sm:gap-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="true" id="q1-yes" />
                  <Label htmlFor="q1-yes" className="text-sm sm:text-base">
                    Yes
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="false" id="q1-no" />
                  <Label htmlFor="q1-no" className="text-sm sm:text-base">
                    No
                  </Label>
                </div>
              </RadioGroup>
              {questionnaire.question1 === false && (
                <div className="mt-4 space-y-2">
                  <Label
                    htmlFor="question1Details"
                    className="text-sm sm:text-base"
                  >
                    Please provide details:
                  </Label>
                  <Textarea
                    id="question1Details"
                    className="text-sm sm:text-base min-h-[80px] sm:min-h-[100px]"
                    value={questionnaire.question1Details}
                    onChange={(e) => {
                      const newQuestionnaire = {
                        ...questionnaire,
                        question1Details: e.target.value,
                      };
                      setQuestionnaire(newQuestionnaire);
                    }}
                    placeholder="Describe any developmental delays or concerns..."
                  />
                </div>
              )}
            </div>

            {/* Question 2 */}
            <div className="space-y-3 sm:space-y-4 pt-4 border-t">
              <Label className="text-sm sm:text-base font-medium">
                Is there a family history of genetic conditions?
              </Label>
              <RadioGroup
                value={
                  questionnaire.question2 === undefined
                    ? undefined
                    : questionnaire.question2.toString()
                }
                onValueChange={(value) => {
                  const newQuestionnaire = {
                    ...questionnaire,
                    question2: value === "true",
                  };
                  setQuestionnaire(newQuestionnaire);
                }}
                className="flex flex-col sm:flex-row gap-3 sm:gap-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="true" id="q2-yes" />
                  <Label htmlFor="q2-yes" className="text-sm sm:text-base">
                    Yes
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="false" id="q2-no" />
                  <Label htmlFor="q2-no" className="text-sm sm:text-base">
                    No
                  </Label>
                </div>
              </RadioGroup>
              {questionnaire.question2 === true && (
                <div className="mt-4 space-y-2">
                  <Label
                    htmlFor="question2Details"
                    className="text-sm sm:text-base"
                  >
                    Please provide details:
                  </Label>
                  <Textarea
                    id="question2Details"
                    className="text-sm sm:text-base min-h-[80px] sm:min-h-[100px]"
                    value={questionnaire.question2Details}
                    onChange={(e) => {
                      const newQuestionnaire = {
                        ...questionnaire,
                        question2Details: e.target.value,
                      };
                      setQuestionnaire(newQuestionnaire);
                    }}
                    placeholder="Describe any known genetic conditions in your family..."
                  />
                </div>
              )}
            </div>

            {/* Question 3 */}
            <div className="space-y-3 sm:space-y-4 pt-4 border-t">
              <Label className="text-sm sm:text-base font-medium">
                Has your child ever been hospitalized?
              </Label>
              <RadioGroup
                value={
                  questionnaire.question3 === undefined
                    ? undefined
                    : questionnaire.question3.toString()
                }
                onValueChange={(value) => {
                  const newQuestionnaire = {
                    ...questionnaire,
                    question3: value === "true",
                  };
                  setQuestionnaire(newQuestionnaire);
                }}
                className="flex flex-col sm:flex-row gap-3 sm:gap-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="true" id="q3-yes" />
                  <Label htmlFor="q3-yes" className="text-sm sm:text-base">
                    Yes
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="false" id="q3-no" />
                  <Label htmlFor="q3-no" className="text-sm sm:text-base">
                    No
                  </Label>
                </div>
              </RadioGroup>
              {questionnaire.question3 === true && (
                <div className="mt-4 space-y-2">
                  <Label
                    htmlFor="question3Details"
                    className="text-sm sm:text-base"
                  >
                    Please provide details:
                  </Label>
                  <Textarea
                    id="question3Details"
                    className="text-sm sm:text-base min-h-[80px] sm:min-h-[100px]"
                    value={questionnaire.question3Details}
                    onChange={(e) => {
                      const newQuestionnaire = {
                        ...questionnaire,
                        question3Details: e.target.value,
                      };
                      setQuestionnaire(newQuestionnaire);
                    }}
                    placeholder="Describe the reason for hospitalization and any relevant details..."
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Error Message */}
        {saveError && (
          <Alert variant="destructive">
            <AlertDescription className="text-sm sm:text-base">
              {saveError}
            </AlertDescription>
          </Alert>
        )}

        {/* Continue Button for Multi-Kit Flow */}
        {onSaveAnswers && (
          <div className="pt-6 space-y-3">
            <Button
              type="button"
              onClick={() => onSaveAnswers(questionnaire)}
              disabled={!isFormValid || saving}
              className="w-full sm:w-auto px-8 py-3 text-base font-medium"
            >
              {saving ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </div>
              ) : (
                "Continue"
              )}
            </Button>
          </div>
        )}

        {/* Navigation Buttons - Only show if navigation functions are provided */}
        {(onBack || onNext) && (
          <div className="space-y-3 pt-4">
            {onNext && (
              <Button
                type="submit"
                className="w-full text-sm sm:text-base py-3 sm:py-4"
                disabled={!isFormValid || saving || checkingKits}
              >
                {getButtonText()}
              </Button>
            )}
            {onBack && (
              <Button
                type="button"
                variant="outline"
                className="w-full text-sm sm:text-base py-3 sm:py-4"
                onClick={onBack}
              >
                Back
              </Button>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
