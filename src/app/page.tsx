import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { getAuthRedirectUrl } from "@/lib/auth-redirect";
import {
  EarlyDetectionArt,
  MedicationArt,
  CounselingArt,
  HelixStrand,
} from "@/components/auth/illustrations";
import { Check, ArrowRight } from "@/components/auth/icons";

const TRUST = ["HIPAA-compliant", "CLIA / CAP", "HSA / FSA"];

const FEATURES = [
  {
    art: EarlyDetectionArt,
    title: "Comprehensive screening",
    copy: "Whole-genome screening for 1,000+ pediatric-onset conditions, designed specifically for children.",
  },
  {
    art: MedicationArt,
    title: "Medication insights",
    copy: "Pharmacogenomic guidance so doctors can choose safer, more effective treatments for your child.",
  },
  {
    art: CounselingArt,
    title: "Expert genetic counseling",
    copy: "Board-certified genetic counselors interpret every result and help you plan clear next steps.",
  },
];

export default async function Home() {
  const { userId } = await auth();

  // If user is authenticated, redirect to appropriate destination
  if (userId) {
    const redirectUrl = await getAuthRedirectUrl();
    redirect(redirectUrl);
  }

  const year = new Date().getFullYear();

  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{
        background:
          "linear-gradient(165deg,#f4faf7 0%,#eaf4ef 48%,#dcebe4 100%)",
      }}
    >
      {/* Decorative sage atmosphere */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <span
          className="absolute rounded-full"
          style={{
            width: 620,
            height: 620,
            right: -180,
            top: -160,
            background:
              "radial-gradient(circle at 35% 35%, rgba(111,177,161,.28), rgba(111,177,161,0) 68%)",
          }}
        />
        <span
          className="absolute rounded-full"
          style={{
            width: 520,
            height: 520,
            left: -160,
            bottom: -200,
            background:
              "radial-gradient(circle at 60% 40%, rgba(152,203,196,.3), rgba(152,203,196,0) 70%)",
          }}
        />
      </div>

      <div className="relative z-10">
        {/* Hero */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 lg:pt-24 pb-10 sm:pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div className="space-y-7 text-center lg:text-left order-2 lg:order-1">
              <p className="font-accent text-3xl sm:text-4xl text-primary leading-none">
                Know more. Know early.
              </p>
              <h1 className="text-4xl sm:text-5xl xl:text-6xl font-medium leading-[1.08] tracking-tight text-foreground">
                Genetic testing for your child&apos;s future.{" "}
                <span className="text-primary">Powered by DNA.</span>
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Advanced, at-home genetic screening that gives you early,
                actionable insight into your child&apos;s health — with expert
                counseling every step of the way.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link href="/sign-in">
                  <Button size="lg" className="w-full sm:w-auto rounded-full px-9 h-12 text-base gap-2">
                    Sign in to your Health Hub
                    <ArrowRight size={18} />
                  </Button>
                </Link>
              </div>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-3 justify-center lg:justify-start pt-1">
                {TRUST.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-fore-teal"
                  >
                    <Check size={14} strokeWidth={2} />
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Hero image with overhanging helix badge */}
            <div className="order-1 lg:order-2">
              <div className="relative">
                <div className="relative aspect-[4/3] lg:aspect-[5/4] rounded-[28px] overflow-hidden shadow-[0_40px_90px_-40px_rgba(35,75,67,0.5)] ring-1 ring-fore-teal/15">
                  <Image
                    src="/images/hero-image.png"
                    alt="Parent and child"
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
                <div className="hidden sm:flex absolute -bottom-5 left-6 items-center gap-3 rounded-2xl bg-white/90 backdrop-blur px-5 py-3 shadow-lg ring-1 ring-fore-teal/15">
                  <HelixStrand width={62} />
                  <div className="leading-tight">
                    <p className="text-sm font-semibold text-foreground">1,000+ conditions</p>
                    <p className="text-xs text-muted-foreground">one painless cheek swab</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
          <div className="text-center space-y-3 mb-12">
            <h2 className="text-3xl sm:text-4xl font-medium text-foreground">
              Why families choose Fore Genomics
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Comprehensive screening, clear reports, and real human guidance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {FEATURES.map((f) => {
              const Art = f.art;
              return (
                <div
                  key={f.title}
                  className="rounded-3xl bg-white/70 backdrop-blur-sm border border-fore-teal/15 p-8 shadow-[0_20px_50px_-34px_rgba(35,75,67,0.45)]"
                >
                  <Art size={64} />
                  <h3 className="mt-5 text-xl font-medium text-foreground">{f.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
                    {f.copy}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Simple collection */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div className="relative aspect-[4/3] rounded-[28px] overflow-hidden shadow-[0_30px_70px_-40px_rgba(35,75,67,0.45)] ring-1 ring-fore-teal/15 order-1">
              <Image
                src="/images/swab-collection.png"
                alt="Simple cheek swab collection"
                fill
                className="object-cover"
              />
            </div>
            <div className="space-y-5 text-center lg:text-left order-2">
              <p className="font-accent text-2xl text-primary leading-none">Simple. Painless.</p>
              <h2 className="text-3xl sm:text-4xl font-medium text-foreground">
                A gentle swab, done at home
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Our at-home kit makes collection effortless — a gentle cheek swab
                is all it takes. No needles, no discomfort. Results delivered
                securely to your Health Hub.
              </p>
            </div>
          </div>
        </section>

        {/* Family / support */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div className="space-y-6 text-center lg:text-left order-2 lg:order-1">
              <h2 className="text-3xl sm:text-4xl font-medium text-foreground">
                Supporting your family every step
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                From ordering your kit to understanding your results, our team of
                genetic counselors is here to guide you — so every family has
                access to comprehensive genetic insight in a supportive, caring
                environment.
              </p>
              <div className="flex justify-center lg:justify-start">
                <Link href="/sign-in">
                  <Button size="lg" className="rounded-full px-9 h-12 text-base gap-2">
                    Get started
                    <ArrowRight size={18} />
                  </Button>
                </Link>
              </div>
            </div>
            <div className="relative aspect-[4/3] rounded-[28px] overflow-hidden shadow-[0_30px_70px_-40px_rgba(35,75,67,0.45)] ring-1 ring-fore-teal/15 order-1 lg:order-2">
              <Image
                src="/images/family-moment.png"
                alt="Family moment"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-fore-teal/15 mt-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-7">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                © {year} Fore Genomics. All rights reserved.
              </p>
              <div className="flex flex-wrap gap-5 text-sm">
                <a
                  href="https://www.foregenomics.com/pages/privacy-policy"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Privacy Policy
                </a>
                <a
                  href="https://www.foregenomics.com/pages/site-terms-and-conditions"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Terms of Service
                </a>
                <a
                  href={
                    process.env.NODE_ENV === "production"
                      ? "mailto:parent.portal@foregenomics.com"
                      : "mailto:parent.portal-dev@foregenomics.com"
                  }
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Contact Support
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
