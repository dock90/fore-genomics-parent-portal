import { Button } from "@/components/ui/button";
import * as React from "react";

export default function QuestionnaireStep({ questionnaire, setQuestionnaire, onNext, saving, saveError, onBack }: any) {
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    console.log("QuestionnaireStep form submitted");
    console.log("Questionnaire state:", questionnaire);
    onNext(e);
  }
  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg mx-auto">
      <h2 className="text-xl font-semibold">Development & Family History Questionnaire</h2>
      <div className="border rounded p-4 bg-gray-50 space-y-4">
        <div>
          <label className="block font-medium mb-1">Has your child met all major developmental milestones on time?</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input type="radio" name="question1" value="true" checked={questionnaire.question1 === true} onChange={() => setQuestionnaire((q: any) => ({ ...q, question1: true }))} /> Yes
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="question1" value="false" checked={questionnaire.question1 === false} onChange={() => setQuestionnaire((q: any) => ({ ...q, question1: false }))} /> No
            </label>
          </div>
          {questionnaire.question1 === false && (
            <div className="mt-2">
              <label className="block text-sm mb-1" htmlFor="question1Details">Please provide details:</label>
              <textarea
                id="question1Details"
                className="w-full border rounded px-3 py-2 min-h-[60px]"
                value={questionnaire.question1Details}
                onChange={e => setQuestionnaire((q: any) => ({ ...q, question1Details: e.target.value }))}
              />
            </div>
          )}
        </div>
        <div>
          <label className="block font-medium mb-1">Is there a family history of genetic conditions?</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input type="radio" name="question2" value="true" checked={questionnaire.question2 === true} onChange={() => setQuestionnaire((q: any) => ({ ...q, question2: true }))} /> Yes
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="question2" value="false" checked={questionnaire.question2 === false} onChange={() => setQuestionnaire((q: any) => ({ ...q, question2: false }))} /> No
            </label>
          </div>
          {questionnaire.question2 === true && (
            <div className="mt-2">
              <label className="block text-sm mb-1" htmlFor="question2Details">Please provide details:</label>
              <textarea
                id="question2Details"
                className="w-full border rounded px-3 py-2 min-h-[60px]"
                value={questionnaire.question2Details}
                onChange={e => setQuestionnaire((q: any) => ({ ...q, question2Details: e.target.value }))}
              />
            </div>
          )}
        </div>
        <div>
          <label className="block font-medium mb-1">Has your child ever been hospitalized?</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input type="radio" name="question3" value="true" checked={questionnaire.question3 === true} onChange={() => setQuestionnaire((q: any) => ({ ...q, question3: true }))} /> Yes
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="question3" value="false" checked={questionnaire.question3 === false} onChange={() => setQuestionnaire((q: any) => ({ ...q, question3: false }))} /> No
            </label>
          </div>
          {questionnaire.question3 === true && (
            <div className="mt-2">
              <label className="block text-sm mb-1" htmlFor="question3Details">Please provide details:</label>
              <textarea
                id="question3Details"
                className="w-full border rounded px-3 py-2 min-h-[60px]"
                value={questionnaire.question3Details}
                onChange={e => setQuestionnaire((q: any) => ({ ...q, question3Details: e.target.value }))}
              />
            </div>
          )}
        </div>
      </div>
      {saveError && <p className="text-red-600">{saveError}</p>}
      <div className="flex gap-2">
        {onBack && (
          <Button type="button" variant="outline" className="w-full" onClick={onBack}>
            Back
          </Button>
        )}
        <Button type="submit" className="w-full" disabled={questionnaire.question1 === undefined || questionnaire.question2 === undefined || questionnaire.question3 === undefined || saving}>
          {saving ? "Saving..." : "Continue"}
        </Button>
      </div>
    </form>
  );
} 