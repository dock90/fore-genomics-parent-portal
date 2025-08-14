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
  invitationData,
}: any) {
  const handleSubmit = (values: any) => {
    // Add email to the form data
    const email = user?.email || "";
    onNext({ ...values, email });
  };

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

        <Button
          type="submit"
          className="w-full mt-6 sm:mt-8 text-sm sm:text-base py-3 sm:py-4"
          disabled={!form.formState.isValid}
        >
          Continue
        </Button>
      </form>
    </Form>
  );
}
