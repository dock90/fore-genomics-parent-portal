"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Circle, Clock, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Kit {
  id: string;
  kitNumber: number;
  kitType: string;
  status: string;
  childId: string | null;
  consentId: string | null;
  questionnaireId: string | null;
}

interface ChildInfo {
  firstName?: string;
  lastName?: string;
  dob?: string;
  dueDate?: string;
  isNotYetBorn?: boolean;
  sex?: "Male" | "Female";
  ethnicity?: string[];
  ethnicityOther?: string;
  relationshipToChild?: "MOTHER" | "FATHER" | "GUARDIAN" | "OTHER";
}

interface KitPanelProps {
  kit: Kit;
  kitIndex: number;
  totalKits: number;
  isActive: boolean;
  isCompleted: boolean;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onActivate: () => void;
  childrenData?: {
    kitId: string;
    childInfo: ChildInfo | null;
    consentAccepted: boolean;
    consentData: any;
    questionnaire: any;
    validationErrors: {
      childInfo: string[];
      consent: string[];
      questionnaire: string[];
    };
    isDirty: boolean;
  } | null;
  children: React.ReactNode;
  // Add validation props
  validationState?: {
    isValid: boolean;
    errors: string[];
    lastValidated: Date | null;
  };
  onValidate?: () => void;
  // Add reset functionality props
  onResetKit?: (kitIndex: number) => void;
  onResetSection?: (kitIndex: number, section: 'childInfo' | 'consent' | 'questionnaire') => void;
}

export default function KitPanel({
  kit,
  kitIndex,
  totalKits,
  isActive,
  isCompleted,
  isExpanded,
  onToggleExpanded,
  onActivate,
  childrenData,
  children,
  validationState,
  onValidate,
  onResetKit,
  onResetSection,
}: KitPanelProps) {
  const getCompletionStatus = () => {
    if (isCompleted) return "completed";
    if (childrenData?.childInfo && childrenData?.consentAccepted && childrenData?.questionnaire) {
      return "in-progress";
    }
    if (childrenData?.childInfo || childrenData?.consentAccepted || childrenData?.questionnaire) {
      return "started";
    }
    return "not-started";
  };

  const getStatusIcon = () => {
    const status = getCompletionStatus();
    switch (status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "in-progress":
        return <Clock className="h-5 w-5 text-blue-600" />;
      case "started":
        return <Circle className="h-5 w-5 text-yellow-600" />;
      default:
        return <Circle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    const status = getCompletionStatus();
    switch (status) {
      case "completed":
        return "Completed";
      case "in-progress":
        return "In Progress";
      case "started":
        return "Started";
      default:
        return "Not Started";
    }
  };

  // Get validation error count for this kit
  const getValidationErrorCount = () => {
    if (!childrenData?.validationErrors) return 0;
    return (
      childrenData.validationErrors.childInfo.length +
      childrenData.validationErrors.consent.length +
      childrenData.validationErrors.questionnaire.length
    );
  };

  // Get validation status for display
  const getValidationStatus = () => {
    if (validationState) {
      return validationState.isValid ? 'valid' : 'invalid';
    }
    
    const errorCount = getValidationErrorCount();
    if (errorCount === 0) return 'valid';
    if (childrenData?.isDirty) return 'invalid';
    return 'pending';
  };

  // Get validation status icon
  const getValidationIcon = () => {
    const status = getValidationStatus();
    switch (status) {
      case 'valid':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'invalid':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Circle className="h-4 w-4 text-gray-400" />;
    }
  };

  // Get validation status text
  const getValidationText = () => {
    const status = getValidationStatus();
    switch (status) {
      case 'valid':
        return 'Valid';
      case 'invalid':
        const errorCount = getValidationErrorCount();
        return `${errorCount} error${errorCount !== 1 ? 's' : ''}`;
      default:
        return 'Pending';
    }
  };

  const getStatusColor = () => {
    const status = getCompletionStatus();
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 border-green-200";
      case "in-progress":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "started":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getChildDisplayName = () => {
    if (!childrenData?.childInfo) return "Not specified";
    const { firstName, lastName, isNotYetBorn } = childrenData.childInfo;
    
    if (isNotYetBorn) {
      return "Unborn Child";
    }
    
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    }
    
    if (firstName) return firstName;
    if (lastName) return lastName;
    
    return "Not specified";
  };

  return (
    <Card className={cn(
      "transition-all duration-200",
      isActive ? "ring-2 ring-primary ring-offset-2" : "",
      isCompleted ? "border-green-200 bg-green-50/30" : "",
      isExpanded ? "shadow-lg" : "shadow-md"
    )}>
      <CardHeader 
        className={cn(
          "cursor-pointer transition-colors",
          isActive ? "bg-primary/5" : "hover:bg-muted/30"
        )}
        onClick={onActivate}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              {getStatusIcon()}
              <div>
                <CardTitle className="text-lg font-semibold">
                  Kit {kit.kitNumber} of {totalKits}: {kit.kitType}
                </CardTitle>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge 
                    variant={getCompletionStatus() === 'completed' ? 'default' : 'secondary'}
                    className={cn(
                      "text-xs",
                      getCompletionStatus() === 'completed' ? "bg-green-100 text-green-800" : ""
                    )}
                  >
                    {getStatusText()}
                  </Badge>
                  
                  {/* Validation Status Badge */}
                  <Badge 
                    variant={getValidationStatus() === 'valid' ? 'default' : 'destructive'}
                    className={cn(
                      "text-xs flex items-center space-x-1",
                      getValidationStatus() === 'valid' ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    )}
                  >
                    {getValidationIcon()}
                    <span>{getValidationText()}</span>
                  </Badge>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Validation Error Count */}
            {getValidationErrorCount() > 0 && (
              <Badge variant="destructive" className="text-xs">
                {getValidationErrorCount()} error{getValidationErrorCount() !== 1 ? 's' : ''}
              </Badge>
            )}
            
            {/* Reset Buttons - Only show when kit has data */}
            {(childrenData?.childInfo || childrenData?.consentAccepted || childrenData?.questionnaire.question1 !== undefined) && (
              <div className="flex items-center space-x-1">
                {/* Reset Individual Sections */}
                {childrenData?.childInfo && onResetSection && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onResetSection(kitIndex, 'childInfo');
                    }}
                    className="h-7 px-2 text-xs text-orange-600 border-orange-300 hover:bg-orange-50"
                    title="Reset Child Info"
                  >
                    Reset Info
                  </Button>
                )}
                
                {childrenData?.consentAccepted && onResetSection && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onResetSection(kitIndex, 'consent');
                    }}
                    className="h-7 px-2 text-xs text-orange-600 border-orange-300 hover:bg-orange-50"
                    title="Reset Consent"
                  >
                    Reset Consent
                  </Button>
                )}
                
                {childrenData?.questionnaire.question1 !== undefined && onResetSection && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onResetSection(kitIndex, 'questionnaire');
                    }}
                    className="h-7 px-2 text-xs text-orange-600 border-orange-300 hover:bg-orange-50"
                    title="Reset Questionnaire"
                  >
                    Reset Q's
                  </Button>
                )}
                
                {/* Reset Entire Kit */}
                {onResetKit && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onResetKit(kitIndex);
                    }}
                    className="h-7 px-2 text-xs text-red-600 border-red-300 hover:bg-red-50"
                    title="Reset Entire Kit"
                  >
                    Reset All
                  </Button>
                )}
              </div>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpanded();
              }}
              className="h-8 w-8 p-0"
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        
        {/* Validation Error Summary */}
        {getValidationErrorCount() > 0 && isExpanded && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center space-x-2 mb-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium text-red-800">Validation Errors</span>
            </div>
            <div className="space-y-1">
              {childrenData?.validationErrors.childInfo.map((error, index) => (
                <div key={`child-${index}`} className="text-xs text-red-700 flex items-center space-x-2">
                  <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                  <span><strong>Child Info:</strong> {error}</span>
                </div>
              ))}
              {childrenData?.validationErrors.consent.map((error, index) => (
                <div key={`consent-${index}`} className="text-xs text-red-700 flex items-center space-x-2">
                  <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                  <span><strong>Consent:</strong> {error}</span>
                </div>
              ))}
              {childrenData?.validationErrors.questionnaire.map((error, index) => (
                <div key={`questionnaire-${index}`} className="text-xs text-red-700 flex items-center space-x-2">
                  <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                  <span><strong>Questionnaire:</strong> {error}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="pt-0">
          {children}
        </CardContent>
      )}
    </Card>
  );
}
