import Link from "next/link";

export default function DashboardFooter() {
  return (
    <footer className="mt-12 pt-6 border-t border-border">
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-muted-foreground">
        <Link
          href="https://www.foregenomics.com/product-terms-conditions"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground transition-colors"
        >
          Product Terms & Conditions
        </Link>
      </div>
      <p className="text-center text-xs text-muted-foreground mt-4">
        © {new Date().getFullYear()} Fore Genomics, Inc. All Rights Reserved.
      </p>
    </footer>
  );
}

