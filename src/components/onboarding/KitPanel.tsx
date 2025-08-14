"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Circle, Clock, ChevronDown, ChevronUp } from "lucide-react";
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
  } | null;
  children: React.ReactNode;
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
    <Card 
      className={cn(
        "transition-all duration-200",
        isActive 
          ? "ring-2 ring-blue-500 shadow-lg" 
          : "hover:shadow-md",
        isCompleted && "border-green-200 bg-green-50/30"
      )}
    >
      <CardHeader 
        className={cn(
          "cursor-pointer transition-colors",
          isActive && "bg-blue-50",
          isCompleted && "bg-green-50"
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
                    variant="outline" 
                    className={cn("text-xs", getStatusColor())}
                  >
                    {getStatusText()}
                  </Badge>
                  <span className="text-sm text-gray-600">
                    Child: {getChildDisplayName()}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
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
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="pt-0">
          <div className="space-y-6">
            {children}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
