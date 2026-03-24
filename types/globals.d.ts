export {};

export type UserRole = "ADMIN" | "COUNSELOR" | "PARENT" | "PURCHASER";
export type KitType = "BASE" | "PLUS" | "PREMIUM";
export type OrderStatus =
  | "ORDER_RECEIVED"
  | "ONBOARDING_COMPLETED"
  | "PREPARING_ORDER"
  | "SHIPPED_TO_USER"
  | "DELIVERED_AWAITING_RETURN"
  | "SHIPPED_TO_LAB"
  | "RECEIVED_IN_PROCESS"
  | "COMPLETE_REPORT_DELIVERED"
  | "COMPLETE_COUNSELING_REQUIRED"
  | "COMPLETE_NO_COUNSELING_REQUIRED";
export type RelationshipToChild = "MOTHER" | "FATHER" | "GUARDIAN" | "OTHER";

declare global {
  interface CustomJwtSessionClaims {
    role?: UserRole;
    createdByParentInvitation?: boolean;
    invitationId?: string;
    orderId?: string;
    kitId?: string;
    kitNumber?: number;
    kitType?: KitType;
    childFirstName?: string;
    childLastName?: string;
    childDOB?: string;
    childSex?: string;
    childEthnicity?: string;
  }
}
