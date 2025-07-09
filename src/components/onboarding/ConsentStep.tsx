import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import * as React from "react";

export default function ConsentStep({ consentAccepted, setConsentAccepted, onNext, onBack }: any) {
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (consentAccepted) onNext();
  }
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
      <div className="space-y-4 sm:space-y-6">
        <div className="text-center sm:text-left">
          <h2 className="text-xl sm:text-2xl font-semibold text-foreground">Consent Form</h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-2">
            Please review and accept the consent form to continue
          </p>
        </div>
        
        <div className="border rounded-lg p-4 sm:p-6 bg-muted/50">
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-sm sm:text-base text-foreground mb-2">
                Genetic Testing Consent Agreement
              </h3>
              <div className="text-sm sm:text-base text-muted-foreground space-y-3">
                <p>
                  By checking the box below, you acknowledge that you have read, understood, and agree to the following terms:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>You consent to genetic testing for your child</li>
                  <li>You understand the potential benefits and limitations of the test</li>
                  <li>You agree to the collection and processing of biological samples</li>
                  <li>You acknowledge that results will be shared with healthcare providers</li>
                  <li>You understand your right to withdraw consent at any time</li>
                </ul>
                <p className="text-xs sm:text-sm italic">
                  This is a demonstration consent form for the Fore Genomics Parent Portal.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3 pt-4 border-t">
              <Checkbox 
                id="consent" 
                checked={consentAccepted} 
                onCheckedChange={v => setConsentAccepted(v === true)}
                className="mt-1"
              />
              <Label 
                htmlFor="consent" 
                className="text-sm sm:text-base leading-relaxed cursor-pointer"
              >
                I have read, understood, and agree to the terms and conditions of this consent form
              </Label>
            </div>
          </div>
        </div>
      </div>
      
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
          disabled={!consentAccepted}
        >
          Continue
        </Button>
      </div>
    </form>
  );
} 