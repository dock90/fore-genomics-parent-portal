import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { MultiSelect } from "@/components/ui/multi-select";
import { Info, Loader2 } from "lucide-react";
import * as React from "react";

interface ChildInfoStepProps {
  form: any;
  user: any;
  userInfo: any;
  order: any;
  selectedKitId: string;
  kitContext?: {
    kitNumber: number;
    totalKits: number;
    kitType: string;
    childName?: string;
  };
  onSave?: (data: any) => void;
  onReset?: () => void; // Add reset callback
  isCompleted?: boolean;
  isReadOnly?: boolean;
}

export default function ChildInfoStep({
  form,
  user,
  userInfo,
  order,
  selectedKitId,
  kitContext,
  onSave,
  onReset,
  isCompleted = false,
  isReadOnly = false,
}: ChildInfoStepProps) {
  const [parentInvitationData, setParentInvitationData] = React.useState({
    parentName: "",
    parentEmail: "",
  });

  const [isInvitingParent, setIsInvitingParent] = React.useState(false);
  const [invitationSent, setInvitationSent] = React.useState(false);
  const [sendingInvitation, setSendingInvitation] = React.useState(false);
  const [hasPrePopulatedData, setHasPrePopulatedData] = React.useState(false);
  
  // Add a reset counter to force form re-render
  const [resetCounter, setResetCounter] = React.useState(0);

  // Watch for form changes
  const relationshipToChild = form.watch("relationshipToChild");
  const isNotYetBorn = form.watch("isNotYetBorn") || false;

  React.useEffect(() => {
    setIsInvitingParent(relationshipToChild === "OTHER");
  }, [relationshipToChild]);

  // Pre-populate form with existing child data if available
  React.useEffect(() => {
    // Removed console.log statements to prevent console spam

    if (order?.kits) {
      let kitWithChild;

      if (selectedKitId) {
        // Multi-kit order with kit selection - find the specific selected kit
        kitWithChild = order.kits.find((kit: any) => kit.id === selectedKitId);
        // Removed console.log statement to prevent console spam
      } else {
        // Single kit order - use the first kit that doesn't have a child (to avoid pre-populating with transferred kit data)
        kitWithChild = order.kits.find((kit: any) => !kit.child);
        if (!kitWithChild) {
          // If all kits have children, use the first one
          kitWithChild = order.kits[0];
        }
        // Removed console.log statement to prevent console spam
      }

      if (kitWithChild?.child) {
        // Pre-populate if the kit has child data (regardless of selectedKitId)
        const child = kitWithChild.child;
        // Removed console.log statements to prevent console spam

        // Pre-populate form fields with existing child data
        form.setValue("firstName", child.firstName || "");
        form.setValue("lastName", child.lastName || "");
        form.setValue("dob", child.dob || "");
        form.setValue("dueDate", child.dueDate || "");
        form.setValue("sex", child.sex || undefined);
        form.setValue("ethnicity", child.ethnicities || []);
        form.setValue("isNotYetBorn", !!child.dueDate);

        if (child.firstName && child.lastName) {
          setHasPrePopulatedData(true);
        }
      } else {
        // Removed console.log statement to prevent console spam
        // Clear any pre-populated data
        setHasPrePopulatedData(false);

        // Clear the form if no kit is selected (to prevent showing data from previous kit)
        if (!selectedKitId) {
          form.reset({
            firstName: "",
            lastName: "",
            dob: "",
            dueDate: "",
            isNotYetBorn: false,
            sex: undefined,
            ethnicity: [],
            ethnicityOther: "",
            relationshipToChild: undefined,
          });
        }
      }
    }
  }, [order, selectedKitId, form]);

  const handleInvitationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!order?.id) {
      alert("No order found. Please try again.");
      return;
    }

    setSendingInvitation(true);

    try {
      const response = await fetch("/api/onboarding/invite-parent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          childInfo: {
            firstName: form.getValues("firstName"),
            lastName: form.getValues("lastName"),
            dob: form.getValues("dob"),
            sex: form.getValues("sex"),
            ethnicity: form.getValues("ethnicity"),
          },
          parentInfo: {
            parentName: parentInvitationData.parentName,
            parentEmail: parentInvitationData.parentEmail,
          },
          orderId: order.id,
          initiatedBy: "other", // Track who initiated this
          initiatorEmail: user?.email,
          inviterName: userInfo?.firstName || "The purchaser",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to send invitation");
      }

      // Call onSave with special flag to indicate invitation was sent
      if (onSave) {
        onSave({ type: "invitation_sent", data: parentInvitationData });
      }
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
      // Call onSave with special flag to indicate unborn child
      if (onSave) {
        onSave({ type: "unborn_child", data: values });
      }
      return;
    }

    // Normal submission
    if (onSave) {
      onSave(values);
    }
  };

  // Track form validity state to ensure button updates properly after reset
  const [formValidityState, setFormValidityState] = React.useState(false);

  // Check if all required fields are populated (not their validity)
  const isFormValid = () => {
    const values = form.getValues();
    const isNotYetBorn = values.isNotYetBorn;

    let isValid = false;
    if (isNotYetBorn) {
      // For unborn children, only dueDate is required (presence, not validity)
      isValid = !!values.dueDate;
    } else {
      // For born children, firstName, lastName, dob, ethnicity, and relationshipToChild are required (presence, not validity)
      isValid = !!(
        values.firstName &&
        values.lastName &&
        values.dob &&
        values.ethnicity &&
        values.ethnicity.length > 0 &&
        values.relationshipToChild
      );
    }
    
    // Update the state to ensure UI updates
    setFormValidityState(isValid);
    return isValid;
  };

  // Watch form values to update validity state in real-time
  React.useEffect(() => {
    const subscription = form.watch((value: any) => {
      const isNotYetBorn = value.isNotYetBorn;
      
      let isValid = false;
      if (isNotYetBorn) {
        // For unborn children, only dueDate is required
        isValid = !!value.dueDate;
      } else {
        // For born children, check all required fields
        isValid = !!(
          value.firstName &&
          value.firstName.trim() !== '' &&
          value.lastName &&
          value.lastName.trim() !== '' &&
          value.dob &&
          value.ethnicity &&
          value.ethnicity.length > 0 &&
          value.relationshipToChild
        );
      }
      
      console.log('Child form values changed:', value);
      console.log('Child form validity calculated:', isValid);
      console.log('Form state:', form.formState);
      setFormValidityState(isValid);
    });
    
    // Initial check
    isFormValid();
    
    return () => subscription.unsubscribe();
  }, [form, resetCounter]); // Add resetCounter dependency to re-subscribe after reset

  // Ensure form is properly initialized after reset
  React.useEffect(() => {
    if (resetCounter > 0) {
      // After reset, ensure the form is in a clean state
      const defaultValues = {
        firstName: "",
        lastName: "",
        dob: "",
        dueDate: "",
        isNotYetBorn: false,
        sex: undefined,
        ethnicity: [],
        ethnicityOther: "",
        relationshipToChild: undefined,
      };
      
      // Force form reset to ensure clean state
      form.reset(defaultValues);
      form.clearErrors();
      
      // Set validity to false after reset
      setFormValidityState(false);
      
      console.log('Form re-initialized after reset, counter:', resetCounter);
    }
  }, [resetCounter, form]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Trigger form validation to show any errors
    const isValid = await form.trigger();
    console.log("Form validation result:", isValid);
    console.log("Form errors:", form.formState.errors);
    console.log("dob error:", form.formState.errors.dob);
    console.log("firstName error:", form.formState.errors.firstName);

    // Check if form is valid
    if (!isFormValid()) {
      console.log("Form is not valid according to isFormValid()");
      return;
    }

    // Form is valid, proceed with submission
    if (isInvitingParent) {
      handleInvitationSubmit(e);
    } else {
      form.handleSubmit(handleSubmit)();
    }
  };

  // If completed and read-only, show summary view
  if (isCompleted && isReadOnly) {
    const values = form.getValues();
    return (
      <div className="space-y-4 p-4 bg-white border border-gray-200 rounded-lg">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-blue-600">✓ Child Information Complete</h3>
          {kitContext && (
            <span className="text-sm text-gray-600">
              Kit {kitContext.kitNumber} of {kitContext.totalKits}
            </span>
          )}
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium text-gray-700">Child Name</Label>
            <p className="text-sm text-black">{values.firstName} {values.lastName}</p>
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-700">
              {values.isNotYetBorn ? "Due Date" : "Date of Birth"}
            </Label>
            <p className="text-sm text-black">{values.isNotYetBorn ? values.dueDate : values.dob}</p>
          </div>
          {!values.isNotYetBorn && (
            <>
              <div>
                <Label className="text-sm font-medium text-gray-700">Sex</Label>
                <p className="text-sm text-black">{values.sex}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">Ethnicity</Label>
                <p className="text-sm text-black">{Array.isArray(values.ethnicity) ? values.ethnicity.join(", ") : values.ethnicity}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">Relationship</Label>
                <p className="text-sm text-black">{values.relationshipToChild}</p>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Kit Context Header */}
      {kitContext && (
        <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-blue-900">
              Kit {kitContext.kitNumber} of {kitContext.totalKits}
            </span>
            <span className="text-sm text-blue-700">•</span>
            <span className="text-sm text-blue-700">{kitContext.kitType}</span>
          </div>
          {kitContext.childName && (
            <span className="text-sm text-blue-700">
              Child: {kitContext.childName}
            </span>
          )}
        </div>
      )}

      <Form {...form} key={`child-form-${resetCounter}`}>
        <form onSubmit={handleFormSubmit} className="space-y-4 sm:space-y-6">
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
                disabled={isReadOnly}
              />
              <div className="space-y-1 leading-none">
                <Label className="text-sm sm:text-base">
                  Child is not yet born
                </Label>
                <p className="text-sm text-muted-foreground">
                  Check this if you've purchased testing for a child who hasn't
                  been born yet
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
                      <FormLabel className="text-sm sm:text-base">
                        Child's First Name *
                      </FormLabel>
                      <FormControl>
                        <Input {...field} className="text-sm sm:text-base" disabled={isReadOnly} />
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
                      <FormLabel className="text-sm sm:text-base">
                        Child's Last Name *
                      </FormLabel>
                      <FormControl>
                        <Input {...field} className="text-sm sm:text-base" disabled={isReadOnly} />
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
                  const today = new Date().toISOString().split("T")[0];
                  return (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base">
                        Due Date *
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="date"
                          min={today}
                          className="text-sm sm:text-base"
                          disabled={isReadOnly}
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
                    <FormLabel className="text-sm sm:text-base">
                      Date of Birth *
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="date"
                        className="text-sm sm:text-base"
                        disabled={isReadOnly}
                      />
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
                        disabled={isReadOnly}
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="Male" id="male" />
                          <Label htmlFor="male" className="text-sm sm:text-base">
                            Male
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="Female" id="female" />
                          <Label
                            htmlFor="female"
                            className="text-sm sm:text-base"
                          >
                            Female
                          </Label>
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
                  const selectedEthnicities = field.value
                    ? Array.isArray(field.value)
                      ? field.value
                      : [field.value]
                    : [];
                  const hasOther = selectedEthnicities.includes("Other");

                  return (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base">
                        Ethnicity *
                      </FormLabel>
                      <FormControl>
                        <MultiSelect
                          options={[
                            {
                              label: "Hispanic/Latino",
                              value: "Hispanic/Latino",
                            },
                            { label: "White", value: "White" },
                            {
                              label: "Black/African American",
                              value: "Black/African American",
                            },
                            { label: "Asian", value: "Asian" },
                            {
                              label: "Native American",
                              value: "Native American",
                            },
                            {
                              label: "Pacific Islander",
                              value: "Pacific Islander",
                            },
                            { label: "Other", value: "Other" },
                          ]}
                          selected={selectedEthnicities}
                          onChange={(selected) => field.onChange(selected)}
                          placeholder="Select ethnicity"
                          className="text-sm sm:text-base"
                          disabled={isReadOnly}
                        />
                      </FormControl>
                      {hasOther && (
                        <FormField
                          control={form.control}
                          name="ethnicityOther"
                          render={({ field: otherField }) => (
                            <FormItem>
                              <FormLabel className="text-sm sm:text-base">
                                Please specify ethnicity
                              </FormLabel>
                              <FormControl>
                                <Input
                                  {...otherField}
                                  placeholder="Enter ethnicity"
                                  className="text-sm sm:text-base mt-2"
                                  disabled={isReadOnly}
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
                    <FormLabel className="text-sm sm:text-base">
                      Relationship to Child *
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isReadOnly}
                    >
                      <FormControl>
                        <SelectTrigger className="text-sm sm:text-base">
                          <SelectValue placeholder="Select relationship" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="MOTHER">Mother</SelectItem>
                        <SelectItem value="FATHER">Father</SelectItem>
                        <SelectItem value="GUARDIAN">Guardian</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
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
                  Only parents or legal guardians can provide consent for genetic
                  testing. Please provide the parent or legal guardian's contact
                  information so we can invite them to complete the process.
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
                      value={parentInvitationData.parentName}
                      onChange={(e) =>
                        setParentInvitationData((prev) => ({
                          ...prev,
                          parentName: e.target.value,
                        }))
                      }
                      placeholder="Enter full name"
                      className="text-sm"
                      required
                      disabled={isReadOnly}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="parentEmail" className="text-sm font-medium">
                      Parent/Guardian's Email Address *
                    </Label>
                    <Input
                      id="parentEmail"
                      type="email"
                      value={parentInvitationData.parentEmail}
                      onChange={(e) =>
                        setParentInvitationData((prev) => ({
                          ...prev,
                          parentEmail: e.target.value,
                        }))
                      }
                      placeholder="Enter email address"
                      className="text-sm"
                      required
                      disabled={isReadOnly}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {Object.keys(form.formState.errors).length > 0 && (
            <Alert variant="destructive">
              <AlertDescription>
                Please fix the following errors:
                <ul className="mt-2 list-disc list-inside">
                  {Object.entries(form.formState.errors).map(([field, error]) => (
                    <li key={field}>
                      {field === "dob"
                        ? "Date of Birth"
                        : field === "firstName"
                          ? "First Name"
                          : field === "lastName"
                            ? "Last Name"
                            : field === "dueDate"
                              ? "Due Date"
                              : field === "ethnicity"
                                ? "Ethnicity"
                                : field === "relationshipToChild"
                                  ? "Relationship to Child"
                                  : field}
                      : {(error as any)?.message}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Continue Button - Only show if not read-only */}
          {!isReadOnly && (
            <div className="space-y-3 pt-4">
              <Button
                type="submit"
                className="w-full text-sm sm:text-base py-3 sm:py-4"
                disabled={
                  sendingInvitation || // Disable while request is pending
                  form.formState.isSubmitting || // Disable while form is submitting
                  (isInvitingParent &&
                    (!parentInvitationData.parentName ||
                      !parentInvitationData.parentEmail)) || // Disable for invitation if parent data is missing
                  !formValidityState || // Use tracked validity state instead of calling function
                  isCompleted // Disable if form is already completed
                }
              >
                {sendingInvitation && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isInvitingParent
                  ? sendingInvitation
                    ? "Sending Invitation..."
                    : "Send Invitation"
                  : "Continue"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  console.log('Reset button clicked');
                  console.log('Form values before reset:', form.getValues());
                  
                  // Clear any custom state
                  setParentInvitationData({
                    parentName: "",
                    parentEmail: "",
                  });
                  
                  // Reset the validity state immediately
                  setFormValidityState(false);
                  
                  // Clear form errors
                  form.clearErrors();
                  
                  // Reset the form to initial values with proper default values
                  const defaultValues = {
                    firstName: "",
                    lastName: "",
                    dob: "",
                    dueDate: "",
                    isNotYetBorn: false,
                    sex: undefined,
                    ethnicity: [],
                    ethnicityOther: "",
                    relationshipToChild: undefined,
                  };
                  
                  form.reset(defaultValues);
                  
                  console.log('Form values after reset:', form.getValues());
                  
                  // Force a complete form re-render by incrementing the counter
                  setResetCounter(prev => prev + 1);
                  
                  // Notify parent component that form was reset
                  if (onReset) {
                    onReset();
                  }
                  
                  // Additional validation trigger after a short delay
                  setTimeout(() => {
                    form.trigger();
                    console.log('Form values after timeout:', form.getValues());
                    console.log('Form validity state after reset:', formValidityState);
                    
                    // Manually check and update validity state
                    const currentValues = form.getValues();
                    const isNotYetBorn = currentValues.isNotYetBorn;
                    
                    let isValid = false;
                    if (isNotYetBorn) {
                      isValid = !!currentValues.dueDate;
                    } else {
                      isValid = !!(
                        currentValues.firstName &&
                        currentValues.firstName.trim() !== '' &&
                        currentValues.lastName &&
                        currentValues.lastName.trim() !== '' &&
                        currentValues.dob &&
                        currentValues.ethnicity &&
                        currentValues.ethnicity.length > 0 &&
                        currentValues.relationshipToChild
                      );
                    }
                    
                    console.log('Manual validity check after reset:', isValid);
                    setFormValidityState(isValid);
                  }, 100);
                }}
                className="w-full text-sm sm:text-base py-3 sm:py-4"
              >
                Reset
              </Button>
            </div>
          )}
        </form>
      </Form>
    </div>
  );
}
