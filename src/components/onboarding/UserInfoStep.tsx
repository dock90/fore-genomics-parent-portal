import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import * as React from "react";
import PhoneInput from 'react-phone-number-input/input';
import 'react-phone-number-input/style.css';

function formatPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  const match = digits.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
  if (!match) return digits;
  let formatted = "";
  if (match[1]) formatted += `(${match[1]}`;
  if (match[1] && match[1].length === 3) formatted += ") ";
  if (match[2]) formatted += match[2];
  if (match[2] && match[2].length === 3) formatted += "-";
  if (match[3]) formatted += match[3];
  return formatted;
}

export default function UserInfoStep({ form, user, onNext }: any) {
  // Helper to get only digits from a string
  function getDigits(value: string) {
    return value.replace(/\D/g, "");
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onNext)} className="space-y-4">
        <FormItem>
          <FormLabel>Email</FormLabel>
          <FormControl>
            <Input value={user?.primaryEmailAddress?.emailAddress || ""} disabled />
          </FormControl>
          <FormMessage />
        </FormItem>
        <div className="flex gap-4">
          <div className="w-1/2">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="w-1/2">
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Street Address</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex gap-4">
          <div className="flex-1">
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="w-20">
            <FormField
              control={form.control}
              name="state"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>State</FormLabel>
                  <FormControl>
                    <select {...field} className="w-full border rounded px-3 py-2">
                      <option value=""></option>
                      {form.US_STATES.map((abbr: string) => (
                        <option key={abbr} value={abbr}>{abbr}</option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="w-1/3">
            <FormField
              control={form.control}
              name="zipCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ZIP Code</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number</FormLabel>
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
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full mt-4" disabled={!form.formState.isValid}>
          Next
        </Button>
      </form>
    </Form>
  );
} 