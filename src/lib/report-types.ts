export type ReportType = 'parent' | 'pediatrician' | 'fullLab' | 'legacy';

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
	parent: 'Parent Report',
	pediatrician: 'Pediatrician Report',
	fullLab: 'Full Lab Report',
	legacy: 'Report',
};

export const REPORT_TYPE_DB_FIELDS: Record<ReportType, string> = {
	parent: 'parentReportFileName',
	pediatrician: 'pediatricianReportFileName',
	fullLab: 'fullLabReportFileName',
	legacy: 'reportFileName',
};
