import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import * as React from "react";

export default function ConsentStep({ consentAccepted, setConsentAccepted, onNext, onBack }: any) {
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (consentAccepted) onNext();
  }
  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg mx-auto">
      <h2 className="text-xl font-semibold">Consent Form</h2>
      <div className="border rounded p-4 bg-gray-50">
        <p className="mb-2 font-medium">Placeholder Consent Form</p>
        <p className="text-sm text-gray-600 mb-4">
          By checking the box below, you agree to the terms and conditions of this (fake) consent form. This is just a placeholder for demonstration purposes.
        </p>
        <label className="flex items-center gap-2">
          <Checkbox checked={consentAccepted} onCheckedChange={v => setConsentAccepted(v === true)} />
          <span>I accept the consent form</span>
        </label>
      </div>
      <div className="flex gap-2">
        {onBack && (
          <Button type="button" variant="outline" className="w-full" onClick={onBack}>
            Back
          </Button>
        )}
        <Button type="submit" className="w-full" disabled={!consentAccepted}>
          Continue
        </Button>
      </div>
    </form>
  );
} 