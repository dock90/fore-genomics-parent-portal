-- AlterTable: add raw genome variant file pointer (VCF / .vcf.gz) used by Fore Explore
ALTER TABLE "Kit" ADD COLUMN "genomeDataFileName" TEXT;
