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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import * as React from "react";
import PhoneInput from "react-phone-number-input/input";
import "react-phone-number-input/style.css";

export default function UserInfoStep({
  form,
  user,
  onNext,
  onReset,
  invitationData,
  isCompleted = false,
  resetKey,
}: any) {
  const handleSubmit = (values: any) => {
    // Add email to the form data
    const email = user?.email || "";
    onNext({ ...values, email });
  };

  // Watch form values to enable button when form becomes valid again after reset
  const [isFormValid, setIsFormValid] = React.useState(false);
  
  React.useEffect(() => {
    const subscription = form.watch((value: any) => {
      // Check if all required fields are filled
      const hasFirstName = value.firstName && value.firstName.trim() !== '';
      const hasLastName = value.lastName && value.lastName.trim() !== '';
      const hasAddress = value.address && value.address.trim() !== '';
      const hasCity = value.city && value.city.trim() !== '';
      const hasState = value.state && value.state.trim() !== '';
      const hasZipCode = value.zipCode && value.zipCode.trim() !== '';
      const hasPhone = value.phone && value.phone.trim() !== '';
      
      const isValid = hasFirstName && hasLastName && hasAddress && hasCity && hasState && hasZipCode && hasPhone;
      setIsFormValid(isValid);
    });
    
    // Initial validation check
    const initialValues = form.getValues();
    const hasFirstName = initialValues.firstName && initialValues.firstName.trim() !== '';
    const hasLastName = initialValues.lastName && initialValues.lastName.trim() !== '';
    const hasAddress = initialValues.address && initialValues.address.trim() !== '';
    const hasCity = initialValues.city && initialValues.city.trim() !== '';
    const hasState = initialValues.state && initialValues.state.trim() !== '';
    const hasZipCode = initialValues.zipCode && initialValues.zipCode.trim() !== '';
    const hasPhone = initialValues.phone && initialValues.phone.trim() !== '';
    
    const initialIsValid = hasFirstName && hasLastName && hasAddress && hasCity && hasState && hasZipCode && hasPhone;
    setIsFormValid(initialIsValid);
    
    return () => subscription.unsubscribe();
  }, [form]);

  // Force validation state update when form is reset
  React.useEffect(() => {
    const checkFormValidity = () => {
      const values = form.getValues();
      const hasFirstName = values.firstName && values.firstName.trim() !== '';
      const hasLastName = values.lastName && values.lastName.trim() !== '';
      const hasAddress = values.address && values.address.trim() !== '';
      const hasCity = values.city && values.city.trim() !== '';
      const hasState = values.state && values.state.trim() !== '';
      const hasZipCode = values.zipCode && values.zipCode.trim() !== '';
      const hasPhone = values.phone && values.phone.trim() !== '';
      
      const isValid = hasFirstName && hasLastName && hasAddress && hasCity && hasState && hasZipCode && hasPhone;
      setIsFormValid(isValid);
    };

    // Check immediately
    checkFormValidity();
    
    // Also check after a short delay to catch any async updates
    const timeoutId = setTimeout(checkFormValidity, 100);
    
    return () => clearTimeout(timeoutId);
  }, [form, resetKey]);

  // Listen to form state changes to detect resets
  React.useEffect(() => {
    const subscription = form.watch((value: any, { name, type }: { name?: string; type?: string }) => {
      // If this is a reset event, update validation state
      if (type === 'reset') {
        setIsFormValid(false);
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form]);

  // Reset validation state when form is reset
  React.useEffect(() => {
    const subscription = form.watch((value: any) => {
      // When form is reset, also reset our validation state
      if (!form.formState.isDirty) {
        setIsFormValid(false);
      }
      
      // Check if all fields are empty (indicating a reset)
      const allFieldsEmpty = !value.firstName && !value.lastName && !value.address && 
                             !value.city && !value.state && !value.zipCode && !value.phone;
      
      if (allFieldsEmpty) {
        setIsFormValid(false);
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form]);

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-4 sm:space-y-6"
      >
        <div className="space-y-4 sm:space-y-6">
          <FormItem>
            <FormLabel className="text-sm sm:text-base">Email</FormLabel>
            <FormControl>
              <Input
                value={user?.email || ""}
                disabled
                className="text-sm sm:text-base"
              />
            </FormControl>
            <FormMessage />
          </FormItem>

          {/* Name Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm sm:text-base">
                    First Name
                  </FormLabel>
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
                  <FormLabel className="text-sm sm:text-base">
                    Last Name
                  </FormLabel>
                  <FormControl>
                    <Input {...field} className="text-sm sm:text-base" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Address */}
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm sm:text-base">
                  Street Address
                </FormLabel>
                <FormControl>
                  <Input {...field} className="text-sm sm:text-base" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* City, State, ZIP */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm sm:text-base">City</FormLabel>
                  <FormControl>
                    <Input {...field} className="text-sm sm:text-base" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="state"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm sm:text-base">State</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="text-sm sm:text-base">
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {form.US_STATES.map((abbr: string) => (
                        <SelectItem key={abbr} value={abbr}>
                          {abbr}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="zipCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm sm:text-base">
                    ZIP Code
                  </FormLabel>
                  <FormControl>
                    <Input {...field} className="text-sm sm:text-base" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Phone */}
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm sm:text-base">
                  Phone Number
                </FormLabel>
                <FormControl>
                  <PhoneInput
                    country="US"
                    value={field.value}
                    onChange={field.onChange}
                    inputComponent={Input}
                    name={field.name}
                    inputMode="tel"
                    autoComplete="tel"
                    ref={field.ref}
                    className="text-sm sm:text-base"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-3 mt-6 sm:mt-8">
          <Button
            type="submit"
            className="w-full text-sm sm:text-base py-3 sm:py-4"
            disabled={!isFormValid || isCompleted}
          >
            Continue
          </Button>
          {onReset && (
            <Button
              type="button"
              variant="outline"
              onClick={onReset}
              className="w-full text-sm sm:text-base py-3 sm:py-4"
            >
              Reset
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
