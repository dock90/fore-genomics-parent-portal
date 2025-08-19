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

  isCompleted = false,
  isReadOnly = false,
}: ChildInfoStepProps) {
  


  // Reset editing state when form is reset from external source
  React.useEffect(() => {
    if (isCompleted && !form.getValues().firstName) {
      setIsEditing(false);
    }
  }, [isCompleted, form]);

  // Add edit mode state
  const [isEditing, setIsEditing] = React.useState(false);
  
  const [parentInvitationData, setParentInvitationData] = React.useState({
    parentName: "",
    parentEmail: "",
  });

  const [isInvitingParent, setIsInvitingParent] = React.useState(false);
  const [invitationSent, setInvitationSent] = React.useState(false);
  const [sendingInvitation, setSendingInvitation] = React.useState(false);
  const [hasPrePopulatedData, setHasPrePopulatedData] = React.useState(false);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSaveChanges = (values: any) => {
    onSave(values);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    // Reset form to original values and exit edit mode
    form.reset();
    setIsEditing(false);
  };
  


  // Watch for form changes
  const relationshipToChild = form.watch("relationshipToChild");
  // In multikit flow, always treat as born child (hide unborn functionality)
  const isNotYetBorn = kitContext ? false : (form.watch("isNotYetBorn") || false);

  React.useEffect(() => {
    // In multikit flow, never show parent invitation (hide "Other" relationship type)
    if (kitContext) {
      setIsInvitingParent(false);
    } else {
      setIsInvitingParent(relationshipToChild === "OTHER");
    }
  }, [relationshipToChild, kitContext]);

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
        // In multikit flow, always set as born child
        form.setValue("isNotYetBorn", kitContext ? false : !!child.dueDate);
        
        // In multikit flow, ensure relationship is not "OTHER" (hide this option)
        if (kitContext && child.relationshipToChild === "OTHER") {
          form.setValue("relationshipToChild", undefined);
        } else {
          form.setValue("relationshipToChild", child.relationshipToChild || undefined);
        }

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
            // In multikit flow, always set as born child
            isNotYetBorn: kitContext ? false : false,
            sex: undefined,
            ethnicity: [],
            ethnicityOther: "",
            relationshipToChild: undefined,
          });
        }
      }
    }
  }, [order, selectedKitId, form, kitContext]);

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
    // In multikit flow, always treat as born child
    if (kitContext) {
      // Normal submission for multikit flow
      if (onSave) {
        onSave(values);
      }
      return;
    }

    // Check if this is an unborn child (only for single kit flow)
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

  // Track form validity state
  const [formValidityState, setFormValidityState] = React.useState(false);

  // Check if all required fields are populated (not their validity)
  const isFormValid = () => {
    const values = form.getValues();
    // In multikit flow, always treat as born child
    const isNotYetBorn = kitContext ? false : values.isNotYetBorn;

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
      // In multikit flow, always treat as born child
      const isNotYetBorn = kitContext ? false : value.isNotYetBorn;
      
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
  }, [form, kitContext]); // Add kitContext dependency

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



  return (
    <div className="space-y-4">
              <Form {...form}>
        <form onSubmit={handleFormSubmit} className="space-y-4 sm:space-y-6">
          <div className="space-y-4 sm:space-y-6">
            {/* Not Yet Born Checkbox - Hidden in multikit flow */}
            {!kitContext && (
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
                  disabled={isReadOnly && !isEditing}
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
            )}

            {/* Name Fields - Always show in multikit flow, otherwise only show if child is born */}
            {(kitContext || !isNotYetBorn) && (
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
                        <Input {...field} className="text-sm sm:text-base" disabled={isReadOnly && !isEditing} />
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
                        <Input {...field} className="text-sm sm:text-base" disabled={isReadOnly && !isEditing} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Date of Birth or Due Date - In multikit flow, always show DOB */}
            {kitContext ? (
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
                        disabled={isReadOnly && !isEditing}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : isNotYetBorn ? (
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
                          disabled={isReadOnly && !isEditing}
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

            {/* Sex - Always show in multikit flow, otherwise only show if child is born */}
            {(kitContext || !isNotYetBorn) && (
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
                        disabled={isReadOnly && !isEditing}
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

            {/* Ethnicity - Always show in multikit flow, otherwise only show if child is born */}
            {(kitContext || !isNotYetBorn) && (
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
                          disabled={isReadOnly && !isEditing}
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
                                  disabled={isReadOnly && !isEditing}
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

            {/* Relationship to Child - Always show in multikit flow, otherwise only show if child is born */}
            {(kitContext || !isNotYetBorn) && (
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
                      disabled={isReadOnly && !isEditing}
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
                        {/* Hide "Other" option in multikit flow */}
                        {!kitContext && <SelectItem value="OTHER">Other</SelectItem>}
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
                      disabled={isReadOnly && !isEditing}
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
                      disabled={isReadOnly && !isEditing}
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

          {/* Completion Message and Edit Button - Show when completed */}
          {isCompleted && !isEditing && (
            <div className="space-y-4 mt-6">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-green-800">
                  <div className="w-5 h-5 bg-green-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm">✓</span>
                  </div>
                  <span className="font-medium">Child Information Completed</span>
                </div>
                <p className="text-sm text-green-700 mt-1">
                  You can now proceed to complete the consent form below.
                </p>
              </div>
              
              <Button
                type="button"
                onClick={handleEdit}
                variant="outline"
                className="w-full text-sm sm:text-base py-3 sm:py-4"
              >
                Edit Information
              </Button>
            </div>
          )}

          {/* Continue Button - Only show if not completed */}
          {!isCompleted && (
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
            </div>
          )}

          {/* Save Changes and Cancel Buttons - Show when editing completed form */}
          {isCompleted && isEditing && (
            <div className="space-y-3 pt-4">
              <Button
                type="button"
                onClick={form.handleSubmit(handleSaveChanges)}
                className="w-full text-sm sm:text-base py-3 sm:py-4"
                disabled={!formValidityState}
              >
                Save Changes
              </Button>
              <Button
                type="button"
                onClick={handleCancelEdit}
                variant="outline"
                className="w-full text-sm sm:text-base py-3 sm:py-4"
              >
                Cancel
              </Button>
            </div>
          )}
        </form>
      </Form>
    </div>
  );
}
