import { Button } from "@/components/ui/button";
import * as React from "react";

export default function QuestionnaireStep({ questionnaire, setQuestionnaire, onNext, saving, saveError, onBack }: any) {
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
              <input type="radio" name="q1" value="yes" checked={questionnaire.q1 === 'yes'} onChange={() => setQuestionnaire((q: any) => ({ ...q, q1: 'yes' }))} /> Yes
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="q1" value="no" checked={questionnaire.q1 === 'no'} onChange={() => setQuestionnaire((q: any) => ({ ...q, q1: 'no' }))} /> No
            </label>
          </div>
          {questionnaire.q1 === 'no' && (
            <div className="mt-2">
              <label className="block text-sm mb-1" htmlFor="q1Details">Please provide details:</label>
              <textarea
                id="q1Details"
                className="w-full border rounded px-3 py-2 min-h-[60px]"
                value={questionnaire.q1Details}
                onChange={e => setQuestionnaire((q: any) => ({ ...q, q1Details: e.target.value }))}
              />
            </div>
          )}
        </div>
        <div>
          <label className="block font-medium mb-1">Is there a family history of genetic conditions?</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input type="radio" name="q2" value="yes" checked={questionnaire.q2 === 'yes'} onChange={() => setQuestionnaire((q: any) => ({ ...q, q2: 'yes' }))} /> Yes
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="q2" value="no" checked={questionnaire.q2 === 'no'} onChange={() => setQuestionnaire((q: any) => ({ ...q, q2: 'no' }))} /> No
            </label>
          </div>
          {questionnaire.q2 === 'yes' && (
            <div className="mt-2">
              <label className="block text-sm mb-1" htmlFor="q2Details">Please provide details:</label>
              <textarea
                id="q2Details"
                className="w-full border rounded px-3 py-2 min-h-[60px]"
                value={questionnaire.q2Details}
                onChange={e => setQuestionnaire((q: any) => ({ ...q, q2Details: e.target.value }))}
              />
            </div>
          )}
        </div>
        <div>
          <label className="block font-medium mb-1">Has your child ever been hospitalized?</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input type="radio" name="q3" value="yes" checked={questionnaire.q3 === 'yes'} onChange={() => setQuestionnaire((q: any) => ({ ...q, q3: 'yes' }))} /> Yes
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="q3" value="no" checked={questionnaire.q3 === 'no'} onChange={() => setQuestionnaire((q: any) => ({ ...q, q3: 'no' }))} /> No
            </label>
          </div>
          {questionnaire.q3 === 'yes' && (
            <div className="mt-2">
              <label className="block text-sm mb-1" htmlFor="q3Details">Please provide details:</label>
              <textarea
                id="q3Details"
                className="w-full border rounded px-3 py-2 min-h-[60px]"
                value={questionnaire.q3Details}
                onChange={e => setQuestionnaire((q: any) => ({ ...q, q3Details: e.target.value }))}
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
        <Button type="submit" className="w-full" disabled={!questionnaire.q1 || !questionnaire.q2 || !questionnaire.q3 || saving}>
          {saving ? "Saving..." : "Continue"}
        </Button>
      </div>
    </form>
  );
} 