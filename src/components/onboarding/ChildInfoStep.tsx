import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { MultiSelect } from "@/components/ui/multi-select";
import { Info, Loader2 } from "lucide-react";
import * as React from "react";

export default function ChildInfoStep({ form, onNext, onBack, user, userInfo, order }: any) {
  const [isInvitingParent, setIsInvitingParent] = React.useState(false);
  const [invitationData, setInvitationData] = React.useState({
    parentName: "",
    parentEmail: ""
  });
  const [sendingInvitation, setSendingInvitation] = React.useState(false);

  // Watch for form changes
  const relationshipToChild = form.watch("relationshipToChild");
  const isNotYetBorn = form.watch("isNotYetBorn") || false;
  
  React.useEffect(() => {
    setIsInvitingParent(relationshipToChild === "Other");
  }, [relationshipToChild]);

  const handleInvitationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!order?.id) {
      alert('No order found. Please try again.');
      return;
    }
    
    setSendingInvitation(true);
    
    try {
      const requestBody = {
        childInfo: form.getValues(),
        parentInfo: invitationData,
        orderId: order?.id,
        initiatedBy: "other", // Track who initiated this
        initiatorEmail: user?.primaryEmailAddress?.emailAddress,
        inviterName: userInfo ? `${userInfo.firstName} ${userInfo.lastName}` : (user?.primaryEmailAddress?.emailAddress || 'Someone')
      };
      
      const response = await fetch("/api/onboarding/invite-parent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to send invitation");
      }
      
      // Call onNext with special flag to indicate invitation was sent
      onNext({ type: "invitation_sent", data: invitationData });
    } catch (error) {
      console.error("Error sending invitation:", error);
      // Handle error - could show toast notification
    } finally {
      setSendingInvitation(false);
    }
  };

  const handleSubmit = (values: any) => {
    // Check if this is an unborn child
    if (isNotYetBorn && values.dueDate) {
      // Call onNext with special flag to indicate unborn child
      onNext({ type: "unborn_child", data: values });
      return;
    }
    
    // Normal submission
    onNext(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={isInvitingParent ? handleInvitationSubmit : form.handleSubmit(handleSubmit)} className="space-y-4 sm:space-y-6">
        <div className="space-y-4 sm:space-y-6">
          {/* Not Yet Born Checkbox */}
          <div className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
            <Checkbox
              checked={isNotYetBorn}
              onCheckedChange={(checked) => {
                form.setValue("isNotYetBorn", checked);
                if (checked) {
                  form.setValue("dueDate", "");
                  form.setValue("dob", "");
                  form.setValue("firstName", "");
                  form.setValue("lastName", "");
                  form.setValue("sex", undefined);
                  form.setValue("ethnicity", undefined);
                  form.setValue("relationshipToChild", undefined);
                } else {
                  form.setValue("dueDate", "");
                }
              }}
            />
            <div className="space-y-1 leading-none">
              <Label className="text-sm sm:text-base">
                Child is not yet born
              </Label>
              <p className="text-sm text-muted-foreground">
                Check this if you've purchased testing for a child who hasn't been born yet
              </p>
            </div>
          </div>

          {/* Name Fields - Only show if child is born */}
          {!isNotYetBorn && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm sm:text-base">Child's First Name *</FormLabel>
                    <FormControl>
                      <Input {...field} className="text-sm sm:text-base" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm sm:text-base">Child's Last Name *</FormLabel>
                    <FormControl>
                      <Input {...field} className="text-sm sm:text-base" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {/* Date of Birth or Due Date */}
          {isNotYetBorn ? (
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => {
                const today = new Date().toISOString().split('T')[0];
                return (
                  <FormItem>
                    <FormLabel className="text-sm sm:text-base">Due Date *</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="date" 
                        min={today}
                        className="text-sm sm:text-base" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
          ) : (
            <FormField
              control={form.control}
              name="dob"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm sm:text-base">Date of Birth *</FormLabel>
                  <FormControl>
                    <Input {...field} type="date" className="text-sm sm:text-base" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Sex - Only show if child is born */}
          {!isNotYetBorn && (
            <FormField
              control={form.control}
              name="sex"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm sm:text-base">Sex</FormLabel>
                  <FormControl>
                    <RadioGroup
                      className="flex flex-col sm:flex-row gap-4 sm:gap-6"
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Male" id="male" />
                        <Label htmlFor="male" className="text-sm sm:text-base">Male</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Female" id="female" />
                        <Label htmlFor="female" className="text-sm sm:text-base">Female</Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Ethnicity - Only show if child is born */}
          {!isNotYetBorn && (
            <FormField
              control={form.control}
              name="ethnicity"
              render={({ field }) => {
                const selectedEthnicities = field.value ? (Array.isArray(field.value) ? field.value : [field.value]) : [];
                const hasOther = selectedEthnicities.includes("Other");
                
                return (
                  <FormItem>
                    <FormLabel className="text-sm sm:text-base">Ethnicity</FormLabel>
                    <FormControl>
                      <MultiSelect
                        options={[
                          { label: "Hispanic/Latino", value: "Hispanic/Latino" },
                          { label: "White", value: "White" },
                          { label: "Black/African American", value: "Black/African American" },
                          { label: "Asian", value: "Asian" },
                          { label: "Native American", value: "Native American" },
                          { label: "Pacific Islander", value: "Pacific Islander" },
                          { label: "Other", value: "Other" }
                        ]}
                        selected={selectedEthnicities}
                        onChange={(selected) => field.onChange(selected)}
                        placeholder="Select ethnicity"
                        className="text-sm sm:text-base"
                      />
                    </FormControl>
                    {hasOther && (
                      <FormField
                        control={form.control}
                        name="ethnicityOther"
                        render={({ field: otherField }) => (
                          <FormItem>
                            <FormLabel className="text-sm sm:text-base">Please specify ethnicity</FormLabel>
                            <FormControl>
                              <Input 
                                {...otherField} 
                                placeholder="Enter ethnicity"
                                className="text-sm sm:text-base mt-2" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
          )}

          {/* Relationship to Child - Only show if child is born */}
          {!isNotYetBorn && (
            <FormField
              control={form.control}
              name="relationshipToChild"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm sm:text-base">Relationship to Child</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="text-sm sm:text-base">
                        <SelectValue placeholder="Select relationship" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Parent">Parent</SelectItem>
                      <SelectItem value="Guardian">Guardian</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        {/* Parent/Guardian Invitation Section */}
        {isInvitingParent && (
          <div className="space-y-4 border-t pt-6">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Only parents or legal guardians can provide consent for genetic testing. Please provide the parent or legal guardian's contact information so we can invite them to complete the process.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="parentName" className="text-sm font-medium">
                    Parent/Guardian's Full Name *
                  </Label>
                  <Input
                    id="parentName"
                    value={invitationData.parentName}
                    onChange={(e) => setInvitationData(prev => ({ ...prev, parentName: e.target.value }))}
                    placeholder="Enter full name"
                    className="text-sm"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="parentEmail" className="text-sm font-medium">
                    Parent/Guardian's Email Address *
                  </Label>
                  <Input
                    id="parentEmail"
                    type="email"
                    value={invitationData.parentEmail}
                    onChange={(e) => setInvitationData(prev => ({ ...prev, parentEmail: e.target.value }))}
                    placeholder="Enter email address"
                    className="text-sm"
                    required
                  />
                </div>
              </div>
              

            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
          {onBack && (
            <Button 
              type="button" 
              variant="outline" 
              className="w-full sm:w-auto text-sm sm:text-base py-3 sm:py-4" 
              onClick={onBack}
              disabled={sendingInvitation} // Disable back button while sending invitation
            >
              Back
            </Button>
          )}
          <Button 
            type="submit" 
            className="w-full sm:w-auto text-sm sm:text-base py-3 sm:py-4" 
            disabled={
              sendingInvitation || // Disable while request is pending
              (isInvitingParent 
                ? !invitationData.parentName || !invitationData.parentEmail
                : isNotYetBorn 
                  ? !form.watch("dueDate")
                  : !form.formState.isValid)
            }
          >
            {sendingInvitation && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isInvitingParent ? (sendingInvitation ? "Sending Invitation..." : "Send Invitation") : "Continue"}
          </Button>
        </div>
      </form>
    </Form>
  );
} 