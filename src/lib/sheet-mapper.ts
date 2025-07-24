/**
 * Sheet Mapper Utility
 * 
 * This utility helps map onboarding data to the correct Excel template structure.
 * Update the mapping functions below to match your actual template layout.
 */

export interface SheetMapping {
  row: number;
  column: number;
  value: string | number | boolean;
}

export class SheetMapper {
  /**
   * Maps onboarding data to Excel row/column coordinates
   * Updated to match the actual template structure
   */
  static mapOnboardingData(data: any): SheetMapping[] {
    const mappings: SheetMapping[] = [];

    // Order Identifier (A5 = label, B5 = order number)
    mappings.push(
      { row: 4, column: 1, value: data.orderNumber } // B5
    );

    // Child Information Section (Column A = labels, Column B = values)
    mappings.push(
      { row: 7, column: 0, value: 'Name' }, // A8
      { row: 7, column: 1, value: `${data.childInfo.firstName} ${data.childInfo.lastName}` }, // B8
      { row: 8, column: 0, value: 'Date of Birth' }, // A9
      { row: 8, column: 1, value: data.childInfo.dob }, // B9
      { row: 9, column: 0, value: 'Sex' }, // A10
      { row: 9, column: 1, value: data.childInfo.sex }, // B10
      { row: 10, column: 0, value: 'Ethnicity' }, // A11
      { row: 10, column: 1, value: Array.isArray(data.childInfo.ethnicities) ? data.childInfo.ethnicities.join(', ') : '' } // B11
    );

    // Parent Information Section (Column C = labels, Column D = values)
    mappings.push(
      { row: 7, column: 2, value: 'Relationship' }, // C8
      { row: 7, column: 3, value: data.consentData.relationshipToChild || 'Parent' }, // D8
      { row: 8, column: 2, value: 'Name' }, // C9
      { row: 8, column: 3, value: `${data.userInfo.firstName} ${data.userInfo.lastName}` }, // D9
      { row: 9, column: 2, value: 'Address' }, // C10
      { row: 9, column: 3, value: data.userInfo.address }, // D10
      { row: 11, column: 2, value: 'City' }, // C12
      { row: 11, column: 3, value: data.userInfo.city }, // D12
      { row: 12, column: 2, value: 'State' }, // C13
      { row: 12, column: 3, value: data.userInfo.state }, // D13
      { row: 13, column: 2, value: 'Zip Code' }, // C14
      { row: 13, column: 3, value: data.userInfo.zipCode }, // D14
      { row: 14, column: 2, value: 'Phone' }, // C15
      { row: 14, column: 3, value: data.userInfo.phone }, // D15
      { row: 15, column: 2, value: 'Email' }, // C16
      { row: 15, column: 3, value: data.userInfo.email } // D16
    );

    return mappings;
  }

  /**
   * Helper function to get column letter from number
   * Useful for dynamic range calculations
   */
  static getColumnLetter(columnNumber: number): string {
    let result = '';
    while (columnNumber > 0) {
      columnNumber--;
      result = String.fromCharCode(65 + (columnNumber % 26)) + result;
      columnNumber = Math.floor(columnNumber / 26);
    }
    return result;
  }

  /**
   * Helper function to create range string
   */
  static createRange(column: string, row: number): string {
    return `${column}${row}`;
  }
} 