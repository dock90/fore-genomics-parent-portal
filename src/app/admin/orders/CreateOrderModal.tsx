"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon, AlertCircle } from "lucide-react";
import { createOrder } from "./create/_actions";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

interface User {
  id: string;
  email: string;
  profile?: {
    firstName: string;
    lastName: string;
  } | null;
}

interface CreateOrderModalProps {
  users: User[];
}

type KitType = "BASE" | "PLUS" | "PREMIUM";

const createOrderSchema = z
  .discriminatedUnion("userType", [
    // Schema for existing users
    z.object({
      userType: z.literal("existing"),
      userId: z.string().min(1, "Please select a user"),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      email: z.string().optional(),
      notes: z.string().optional(),
      kitCount: z.number().min(1).max(10),
      kitTypes: z.array(z.enum(["BASE", "PLUS", "PREMIUM"])),
    }),
    // Schema for new users
    z.object({
      userType: z.literal("new"),
      userId: z.string().optional(),
      firstName: z.string().min(1, "First name is required"),
      lastName: z.string().min(1, "Last name is required"),
      email: z.string().email("Please enter a valid email address"),
      notes: z.string().optional(),
      kitCount: z.number().min(1).max(10),
      kitTypes: z.array(z.enum(["BASE", "PLUS", "PREMIUM"])),
    }),
  ])
;

type CreateOrderFormData = z.infer<typeof createOrderSchema>;

export function CreateOrderModal({ users }: CreateOrderModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [kitCount, setKitCount] = useState(1);
  const [kitTypes, setKitTypes] = useState<KitType[]>(["BASE"]);
  const [defaultsSet, setDefaultsSet] = useState(false);

  // Check if there are users available
  const hasUsers = users.length > 0;
  const defaultUserId = ""; // No default user - admin must select

  const form = useForm<CreateOrderFormData>({
    resolver: zodResolver(createOrderSchema),
    defaultValues: {
      userType: hasUsers ? "existing" : "new", // Back to existing if users available
      userId: defaultUserId, // Empty - no default selection
      firstName: "",
      lastName: "",
      email: "",
      notes: "",
      kitCount: 1,
      kitTypes: ["BASE"],
    },
    mode: "onSubmit", // Only validate on submit to avoid premature errors
    shouldUnregister: false, // Keep field values when switching between user types
    reValidateMode: "onChange", // Re-validate when values change
  });

  // Force form to use our default values
  useEffect(() => {
    if (hasUsers && !defaultsSet) {
      // No default user - just mark defaults as set
      setDefaultsSet(true);
    }
  }, [hasUsers, defaultsSet]);

  // Watch form values and trigger validation when they change
  useEffect(() => {
    const subscription = form.watch((value, { name, type }) => {
      if (type === "change" && name) {
        // Trigger validation for the changed field
        form.trigger(name as keyof CreateOrderFormData);
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const userType = form.watch("userType");

  // Update kit types when kit count changes
  const handleKitCountChange = (newKitCount: number) => {
    setKitCount(newKitCount);
    form.setValue("kitCount", newKitCount);
    setError(null); // Clear error when kit configuration changes

    if (kitTypes.length < newKitCount) {
      // Add default BASE kits
      const newKitTypes = [
        ...kitTypes,
        ...Array(newKitCount - kitTypes.length).fill("BASE"),
      ];
      setKitTypes(newKitTypes);
      form.setValue("kitTypes", newKitTypes);
    } else if (kitTypes.length > newKitCount) {
      // Remove excess kits
      const newKitTypes = kitTypes.slice(0, newKitCount);
      setKitTypes(newKitTypes);
      form.setValue("kitTypes", newKitTypes);
    }
  };

  const handleKitTypeChange = (index: number, kitType: KitType) => {
    const newKitTypes = [...kitTypes];
    newKitTypes[index] = kitType;
    setKitTypes(newKitTypes);
    form.setValue("kitTypes", newKitTypes);
    setError(null); // Clear error when kit configuration changes
  };

  const handleUserIdChange = (selectedUserId: string) => {
    if (selectedUserId) {
      const selectedUser = users.find((user) => user.id === selectedUserId);
      if (selectedUser) {
        // Clear the userId error immediately to prevent flashing
        form.clearErrors("userId");

        // Set the userId first
        form.setValue("userId", selectedUserId);

        // Then populate the other fields
        form.setValue("firstName", selectedUser.profile?.firstName || "");
        form.setValue("lastName", selectedUser.profile?.lastName || "");
        form.setValue("email", selectedUser.email);

        // Clear any previous errors
        setError(null);
      }
    }
  };

  const onSubmit = async (data: CreateOrderFormData) => {
    setIsSubmitting(true);
    setError(null); // Clear any previous errors

    try {
      const formData = new FormData();
      formData.append("userType", data.userType);

      if (data.userType === "existing") {
        formData.append("userId", data.userId!);
      } else {
        formData.append("firstName", data.firstName!);
        formData.append("lastName", data.lastName!);
        formData.append("email", data.email!);
      }

      formData.append("notes", data.notes || "");
      formData.append("kitCount", data.kitCount.toString());
      formData.append("kitTypes", JSON.stringify(data.kitTypes));

      const result = await createOrder(formData);

      if (result.success) {
        setIsOpen(false);
        form.reset({
          userType: hasUsers ? "existing" : "new",
          userId: defaultUserId,
          firstName: "",
          lastName: "",
          email: "",
          notes: "",
          kitCount: 1,
          kitTypes: ["BASE"],
        });
        setKitCount(1);
        setKitTypes(["BASE"]);
        setError(null);
        router.refresh();
      } else {
        // Display error from the action
        setError(result.error);
      }
    } catch (error) {
      // Fallback error handling for unexpected errors
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create order";
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      form.reset({
        userType: hasUsers ? "existing" : "new",
        userId: defaultUserId,
        firstName: "",
        lastName: "",
        email: "",
        notes: "",
        kitCount: 1,
        kitTypes: ["BASE"],
      });
      setKitCount(1);
      setKitTypes(["BASE"]);
      setError(null);
    } else {
      // Force validation after reset to ensure isValid is correct
      setTimeout(() => {
        form.trigger();
      }, 100);
    }
  };

  // Check if form is valid for button state
  const isFormValid = (() => {
    const userType = form.watch("userType");
    const userId = form.watch("userId");

    if (userType === "new") {
      // For new users, check if required fields are filled
      const firstName = form.watch("firstName");
      const lastName = form.watch("lastName");
      const email = form.watch("email");
      return firstName && lastName && email;
    } else if (userType === "existing") {
      // For existing users, just need a userId selected
      return !!userId;
    }
    return false;
  })();

  // Only show validation errors after user has interacted with the form
  const shouldShowErrors = hasInteracted;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <PlusIcon className="h-4 w-4" />
          Create Order
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Order</DialogTitle>
          <DialogDescription>
            Create a new order for an existing user or create a new user
            account.
          </DialogDescription>
        </DialogHeader>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            {/* User Type Selection */}
            <div>
              <Label>User Type</Label>
              <RadioGroup
                value={userType}
                onValueChange={(value) => {
                  // If trying to select "existing" but no users available, force "new"
                  const actualValue =
                    value === "existing" && !hasUsers ? "new" : value;

                  if (actualValue === "existing") {
                    // Switching to existing user - clear fields and require user selection
                    form.setValue(
                      "userType",
                      actualValue as "existing" | "new"
                    );
                    form.setValue("userId", "");
                    form.setValue("firstName", "");
                    form.setValue("lastName", "");
                    form.setValue("email", "");
                  } else {
                    // Switching to new user - clear fields
                    form.setValue(
                      "userType",
                      actualValue as "existing" | "new"
                    );
                    form.setValue("userId", "");
                    form.setValue("firstName", "");
                    form.setValue("lastName", "");
                    form.setValue("email", "");
                  }

                  // Clear all form errors when switching user types to prevent stale errors
                  form.clearErrors();
                  setError(null); // Clear error when user type changes
                }}
                className="flex flex-col space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem
                    value="existing"
                    id="existing"
                    disabled={!hasUsers}
                  />
                  <Label
                    htmlFor="existing"
                    className={!hasUsers ? "text-muted-foreground" : ""}
                  >
                    Existing User {!hasUsers && "(No users available)"}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="new" id="new" />
                  <Label htmlFor="new">New User</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Existing User Selection */}
            {userType === "existing" && (
              <div>
                <Label htmlFor="userId">Select User *</Label>
                {!hasUsers ? (
                  <div className="text-sm text-muted-foreground mt-1">
                    No users available. Please create a new user instead.
                  </div>
                ) : (
                  <Select
                    value={form.watch("userId")}
                    onValueChange={(value) => {
                      setHasInteracted(true);
                      handleUserIdChange(value);
                    }}
                  >
                    <SelectTrigger
                      className={cn(
                        "w-full",
                        shouldShowErrors &&
                          form.formState.errors.userId &&
                          "border-red-500"
                      )}
                    >
                      <SelectValue placeholder="Choose a user..." />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.profile?.firstName} {user.profile?.lastName} (
                          {user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {shouldShowErrors && form.formState.errors.userId && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.userId.message}
                  </p>
                )}
              </div>
            )}

            {/* New User Fields */}
            {userType === "new" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      {...form.register("firstName")}
                      placeholder="Enter first name"
                      className={cn(
                        "w-full",
                        shouldShowErrors &&
                          form.formState.errors.firstName &&
                          "border-red-500"
                      )}
                      onChange={(e) => {
                        setHasInteracted(true);
                        form.register("firstName").onChange(e);
                        setError(null); // Clear error when user types
                      }}
                    />
                    {shouldShowErrors && form.formState.errors.firstName && (
                      <p className="text-sm text-red-500 mt-1">
                        {form.formState.errors.firstName.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      {...form.register("lastName")}
                      placeholder="Enter last name"
                      className={cn(
                        "w-full",
                        shouldShowErrors &&
                          form.formState.errors.lastName &&
                          "border-red-500"
                      )}
                      onChange={(e) => {
                        setHasInteracted(true);
                        form.register("lastName").onChange(e);
                        setError(null); // Clear error when user types
                      }}
                    />
                    {shouldShowErrors && form.formState.errors.lastName && (
                      <p className="text-sm text-red-500 mt-1">
                        {form.formState.errors.lastName.message}
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    {...form.register("email")}
                    placeholder="Enter email address"
                    className={cn(
                      "w-full",
                      shouldShowErrors &&
                        form.formState.errors.email &&
                        "border-red-500"
                    )}
                    onChange={(e) => {
                      setHasInteracted(true);
                      form.register("email").onChange(e);
                      setError(null); // Clear error when user types
                    }}
                  />
                  {shouldShowErrors && form.formState.errors.email && (
                    <p className="text-sm text-red-500 mt-1">
                      {form.formState.errors.email.message}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Kit Configuration */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="kitCount">Number of Test Kits *</Label>
                <Select
                  value={kitCount.toString()}
                  onValueChange={(value) => {
                    setHasInteracted(true);
                    handleKitCountChange(parseInt(value));
                  }}
                >
                  <SelectTrigger
                    className={cn(
                      "w-full",
                      shouldShowErrors &&
                        form.formState.errors.kitCount &&
                        "border-red-500"
                    )}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        {num} {num === 1 ? "Kit" : "Kits"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {shouldShowErrors && form.formState.errors.kitCount && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.kitCount.message}
                  </p>
                )}
              </div>

              {/* Kit Type Selection */}
              <div className="space-y-3">
                <Label>Kit Types</Label>
                {Array.from({ length: kitCount }, (_, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <span className="text-sm font-medium w-8">
                      #{index + 1}
                    </span>
                    <Select
                      value={kitTypes[index] || "BASE"}
                      onValueChange={(value) => {
                        setHasInteracted(true);
                        handleKitTypeChange(index, value as KitType);
                      }}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BASE">Base Kit</SelectItem>
                        <SelectItem value="PLUS">Plus Kit</SelectItem>
                        <SelectItem value="PREMIUM">Premium Kit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                {...form.register("notes")}
                placeholder="Add any notes about this order..."
                className="min-h-[100px]"
                onChange={(e) => {
                  setHasInteracted(true);
                  form.register("notes").onChange(e);
                  setError(null); // Clear error when user types
                }}
              />
            </div>
          </div>

          <div className="flex gap-4">
            <Button
              type="submit"
              disabled={isSubmitting || !isFormValid}
              className="w-full"
            >
              {isSubmitting ? "Creating Order..." : "Create Order"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
