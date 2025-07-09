import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import * as React from "react";

export default function QuestionnaireStep({ questionnaire, setQuestionnaire, onNext, saving, saveError, onBack }: any) {
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onNext(e);
  }
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
      <div className="space-y-4 sm:space-y-6">
        <div className="text-center sm:text-left">
          <h2 className="text-xl sm:text-2xl font-semibold text-foreground">
            Development & Family History Questionnaire
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-2">
            Please answer the following questions to help us understand your child's medical history
          </p>
        </div>
        
        <div className="border rounded-lg p-4 sm:p-6 bg-muted/50 space-y-6 sm:space-y-8">
          {/* Question 1 */}
          <div className="space-y-3 sm:space-y-4">
            <Label className="text-sm sm:text-base font-medium">
              Has your child met all major developmental milestones on time?
            </Label>
            <RadioGroup
              value={questionnaire.question1?.toString()}
              onValueChange={(value) => setQuestionnaire((q: any) => ({ ...q, question1: value === 'true' }))}
              className="flex flex-col sm:flex-row gap-3 sm:gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="true" id="q1-yes" />
                <Label htmlFor="q1-yes" className="text-sm sm:text-base">Yes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="false" id="q1-no" />
                <Label htmlFor="q1-no" className="text-sm sm:text-base">No</Label>
              </div>
            </RadioGroup>
            {questionnaire.question1 === false && (
              <div className="mt-4 space-y-2">
                <Label htmlFor="question1Details" className="text-sm sm:text-base">
                  Please provide details:
                </Label>
                <Textarea
                  id="question1Details"
                  className="text-sm sm:text-base min-h-[80px] sm:min-h-[100px]"
                  value={questionnaire.question1Details}
                  onChange={e => setQuestionnaire((q: any) => ({ ...q, question1Details: e.target.value }))}
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
              value={questionnaire.question2?.toString()}
              onValueChange={(value) => setQuestionnaire((q: any) => ({ ...q, question2: value === 'true' }))}
              className="flex flex-col sm:flex-row gap-3 sm:gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="true" id="q2-yes" />
                <Label htmlFor="q2-yes" className="text-sm sm:text-base">Yes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="false" id="q2-no" />
                <Label htmlFor="q2-no" className="text-sm sm:text-base">No</Label>
              </div>
            </RadioGroup>
            {questionnaire.question2 === true && (
              <div className="mt-4 space-y-2">
                <Label htmlFor="question2Details" className="text-sm sm:text-base">
                  Please provide details:
                </Label>
                <Textarea
                  id="question2Details"
                  className="text-sm sm:text-base min-h-[80px] sm:min-h-[100px]"
                  value={questionnaire.question2Details}
                  onChange={e => setQuestionnaire((q: any) => ({ ...q, question2Details: e.target.value }))}
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
              value={questionnaire.question3?.toString()}
              onValueChange={(value) => setQuestionnaire((q: any) => ({ ...q, question3: value === 'true' }))}
              className="flex flex-col sm:flex-row gap-3 sm:gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="true" id="q3-yes" />
                <Label htmlFor="q3-yes" className="text-sm sm:text-base">Yes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="false" id="q3-no" />
                <Label htmlFor="q3-no" className="text-sm sm:text-base">No</Label>
              </div>
            </RadioGroup>
            {questionnaire.question3 === true && (
              <div className="mt-4 space-y-2">
                <Label htmlFor="question3Details" className="text-sm sm:text-base">
                  Please provide details:
                </Label>
                <Textarea
                  id="question3Details"
                  className="text-sm sm:text-base min-h-[80px] sm:min-h-[100px]"
                  value={questionnaire.question3Details}
                  onChange={e => setQuestionnaire((q: any) => ({ ...q, question3Details: e.target.value }))}
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

      {/* Navigation Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
        {onBack && (
          <Button 
            type="button" 
            variant="outline" 
            className="w-full sm:w-auto text-sm sm:text-base py-3 sm:py-4" 
            onClick={onBack}
          >
            Back
          </Button>
        )}
        <Button 
          type="submit" 
          className="w-full sm:w-auto text-sm sm:text-base py-3 sm:py-4" 
          disabled={questionnaire.question1 === undefined || questionnaire.question2 === undefined || questionnaire.question3 === undefined || saving}
        >
          {saving ? "Saving..." : "Complete Onboarding"}
        </Button>
      </div>
    </form>
  );
} 