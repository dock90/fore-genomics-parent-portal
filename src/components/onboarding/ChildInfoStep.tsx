import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import * as React from "react";

export default function ChildInfoStep({ form, onNext, onBack }: any) {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onNext)} className="space-y-4 sm:space-y-6">
        <div className="space-y-4 sm:space-y-6">
          {/* Name Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm sm:text-base">Child's First Name</FormLabel>
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
                  <FormLabel className="text-sm sm:text-base">Child's Last Name</FormLabel>
                  <FormControl>
                    <Input {...field} className="text-sm sm:text-base" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Date of Birth */}
          <FormField
            control={form.control}
            name="dob"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm sm:text-base">Date of Birth</FormLabel>
                <FormControl>
                  <Input {...field} type="date" className="text-sm sm:text-base" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Sex */}
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

          {/* Ethnicity */}
          <FormField
            control={form.control}
            name="ethnicity"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm sm:text-base">Ethnicity</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="text-sm sm:text-base">
                      <SelectValue placeholder="Select ethnicity" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Hispanic/Latino">Hispanic/Latino</SelectItem>
                    <SelectItem value="White">White</SelectItem>
                    <SelectItem value="Black/African American">Black/African American</SelectItem>
                    <SelectItem value="Asian">Asian</SelectItem>
                    <SelectItem value="Native American">Native American</SelectItem>
                    <SelectItem value="Pacific Islander">Pacific Islander</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
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
            disabled={!form.formState.isValid}
          >
            Continue
          </Button>
        </div>
      </form>
    </Form>
  );
} 