import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup } from "@/components/ui/radio-group";
import * as React from "react";

export default function ChildInfoStep({ form, onNext, onBack }: any) {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onNext)} className="space-y-4">
        <div className="flex gap-4">
          <div className="w-1/2">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Child's First Name</FormLabel>
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
                  <FormLabel>Child's Last Name</FormLabel>
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
          name="dob"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date of Birth</FormLabel>
              <FormControl>
                <Input {...field} type="date" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="sex"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sex</FormLabel>
              <FormControl>
                <RadioGroup
                  className="flex gap-6"
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="Male"
                      checked={field.value === "Male"}
                      onChange={() => field.onChange("Male")}
                      className="accent-blue-600"
                    />
                    Male
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="Female"
                      checked={field.value === "Female"}
                      onChange={() => field.onChange("Female")}
                      className="accent-blue-600"
                    />
                    Female
                  </label>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="ethnicity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ethnicity</FormLabel>
              <FormControl>
                <select {...field} className="w-full border rounded px-3 py-2">
                  <option value="">Select</option>
                  <option value="Hispanic/Latino">Hispanic/Latino</option>
                  <option value="White">White</option>
                  <option value="Black/African American">Black/African American</option>
                  <option value="Asian">Asian</option>
                  <option value="Native American">Native American</option>
                  <option value="Pacific Islander">Pacific Islander</option>
                  <option value="Other">Other</option>
                </select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex gap-2">
          {onBack && (
            <Button type="button" variant="outline" className="w-full" onClick={onBack}>
              Back
            </Button>
          )}
          <Button type="submit" className="w-full" disabled={!form.formState.isValid}>
            Next
          </Button>
        </div>
      </form>
    </Form>
  );
} 