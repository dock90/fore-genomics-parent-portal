import Link from "next/link";
import Image from "next/image";
import { ExternalLink } from "lucide-react";

export default function DashboardFooter() {
  return (
    <footer className="mt-12 pt-8 border-t border-border">
      <div className="flex flex-col items-center gap-6">
        {/* Links */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
          <Link
            href="https://www.foregenomics.com/product-terms-conditions"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            Product Terms & Conditions
            <ExternalLink className="h-3 w-3" />
          </Link>
          <Link
            href="https://www.foregenomics.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            Visit Fore Genomics
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
        
        {/* Logo and Copyright */}
        <div className="flex flex-col items-center gap-3">
          <Image
            src="/images/logos/fore_genomics_logo.png"
            alt="Fore Genomics"
            width={90}
            height={24}
            className="h-6 w-auto opacity-50"
          />
          <p className="text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} Fore Genomics, Inc. All Rights Reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

