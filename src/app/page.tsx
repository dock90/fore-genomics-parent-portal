import type { ComponentType } from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Image from "next/image";
import { getAuthRedirectUrl } from "@/lib/auth-redirect";
import {
  EarlyDetectionArt,
  MedicationArt,
  CounselingArt,
  HelixStrand,
} from "@/components/auth/illustrations";
import { Check } from "@/components/auth/icons";
import { Container } from "@/components/ui/container";
import { CtaButton } from "@/components/ui/cta-button";

type ArtComponent = ComponentType<{ size?: number; className?: string }>;
type Stat = { value: string; label: string };
type Feature = { art: ArtComponent; title: string; copy: string };
type Step = { title: string; copy: string };

const LOGO_SRC = "/images/logos/fore-genomics-logo-green.svg";

const TRUST: readonly string[] = ["HIPAA-compliant", "CLIA / CAP", "HSA / FSA"];

const STATS: readonly Stat[] = [
  { value: "1,000+", label: "Conditions screened" },
  { value: "1", label: "Painless cheek swab" },
  { value: "100%", label: "At-home collection" },
  { value: "HIPAA", label: "CLIA / CAP secure" },
];

const FEATURES: readonly Feature[] = [
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

const STEPS: readonly Step[] = [
  {
    title: "Activate your kit",
    copy: "Sign in to your Health Hub to register the at-home collection kit we ship straight to your door.",
  },
  {
    title: "Swab & send it back",
    copy: "A gentle cheek swab takes seconds. Drop it in the mail with the prepaid label — no needles, no clinic visit.",
  },
  {
    title: "Results & counseling",
    copy: "Your child's results arrive securely in the Health Hub, with board-certified counselors to guide every next step.",
  },
];

const SWAB_POINTS: readonly string[] = [
  "Whole-genome screening for 1,000+ conditions",
  "Results delivered securely to your Health Hub",
  "Board-certified genetic counseling included",
];

const SUPPORT_EMAIL =
  process.env.NODE_ENV === "production"
    ? "mailto:parent.portal@foregenomics.com"
    : "mailto:parent.portal-dev@foregenomics.com";

export default async function Home() {
  const { userId } = await auth();

  // Authenticated users skip the marketing page.
  if (userId) {
    redirect(await getAuthRedirectUrl());
  }

  const year = new Date().getFullYear();

  return (
    <div className="relative w-full overflow-hidden bg-white">
      {/* ============================ HERO ============================ */}
      <section className="hero">
        <Image
          src="/images/hero-image.png"
          alt="A parent and child at home"
          fill
          priority
          sizes="100vw"
          className="hero-image"
        />
        <div className="hero-overlay" aria-hidden="true" />

        <Container className="hero-content">
          {/* Top block — intentionally airy above the fold */}
          <div className="max-w-3xl">
            <p className="hero-kicker">Know more. Know early.</p>
            <h1 className="hero-title">
              Genetic testing for your child&apos;s future.
            </h1>
          </div>

          {/* Bottom row */}
          <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-xl space-y-7">
              <p className="hero-subtitle">
                At-home genetic screening with expert counseling — early,
                actionable insight into your child&apos;s health.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
                <CtaButton href="/sign-in" label="Sign in to your Health Hub" />
                <CtaButton
                  href="/#how-it-works"
                  label="How it works"
                  variant="ghost"
                />
              </div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1">
                {TRUST.map((item) => (
                  <span key={item} className="hero-trust">
                    <Check size={15} strokeWidth={2.5} className="check-on-photo" />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {/* Editorial accent */}
            <div className="flex flex-col items-start gap-3 lg:items-end lg:text-right">
              <span className="hero-pill">
                <HelixStrand width={40} />
                Pediatric whole-genome screening
              </span>
              <p className="hero-tagline">Powered by DNA.</p>
            </div>
          </div>
        </Container>
      </section>

      {/* ===================== BODY (sage atmosphere) ===================== */}
      <div className="page-surface relative">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <span className="page-glow page-glow--primary" />
          <span className="page-glow page-glow--mint" />
        </div>

        <div className="relative z-10">
          {/* ===================== STATS BAND ===================== */}
          <Container as="section" className="band-spacing">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
              {STATS.map((stat, i) => (
                <div
                  key={stat.label}
                  className={i > 0 ? "stat-item--divided" : undefined}
                >
                  <dt className="stat-value">{stat.value}</dt>
                  <dd className="stat-label">{stat.label}</dd>
                </div>
              ))}
            </dl>
          </Container>

          {/* ===================== WHY / FEATURES ===================== */}
          <Container as="section" id="why" className="anchor-offset section-spacing">
            <div className="max-w-3xl">
              <p className="eyebrow">Why families choose us</p>
              <h2 className="section-title mt-4">
                Comprehensive screening, clear reports, and real human guidance.
              </h2>
              <p className="section-intro mt-6">
                Everything we build is designed around one thing: giving families
                early, trustworthy insight into a child&apos;s health — with
                experts beside you the whole way.
              </p>
            </div>

            <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3 lg:gap-8">
              {FEATURES.map(({ art: Art, title, copy }) => (
                <div key={title} className="feature-card">
                  <Art size={62} />
                  <h3 className="feature-card__title">{title}</h3>
                  <p className="feature-card__copy">{copy}</p>
                </div>
              ))}
            </div>
          </Container>

          {/* ===================== HOW IT WORKS ===================== */}
          <Container
            as="section"
            id="how-it-works"
            className="anchor-offset section-spacing-bottom"
          >
            <div className="max-w-3xl">
              <p className="eyebrow">How it works</p>
              <h2 className="section-title mt-4">
                From kit to clarity, in three simple steps.
              </h2>
            </div>

            <ol className="mt-16 grid grid-cols-1 gap-x-10 gap-y-12 md:grid-cols-3 lg:gap-x-14">
              {STEPS.map((step, i) => (
                <li key={step.title}>
                  <span className="step-number">{`0${i + 1}`}</span>
                  <div className="step-body">
                    <h3 className="step-title">{step.title}</h3>
                    <p className="step-copy">{step.copy}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Container>

          {/* ===================== SWAB COLLECTION ===================== */}
          <Container as="section" className="section-spacing-bottom">
            <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-20">
              <div className="media-frame order-1 aspect-[4/3]">
                <Image
                  src="/images/swab-collection.png"
                  alt="Simple cheek swab collection at home"
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                />
                <div className="glass-badge absolute bottom-5 left-5">
                  <HelixStrand width={58} />
                  <div className="leading-tight">
                    <p className="text-sm font-semibold text-foreground">
                      No needles. No clinic.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      one painless cheek swab
                    </p>
                  </div>
                </div>
              </div>

              <div className="order-2">
                <p className="script-accent text-2xl">Simple. Painless.</p>
                <h2 className="section-title mt-5">A gentle swab, done at home</h2>
                <p className="section-intro mt-5">
                  Our at-home kit makes collection effortless — a gentle cheek
                  swab is all it takes. No needles, no discomfort, no clinic
                  visit.
                </p>
                <ul className="mt-6 space-y-3">
                  {SWAB_POINTS.map((point) => (
                    <li key={point} className="check-item">
                      <span className="check-badge">
                        <Check size={13} strokeWidth={2.5} />
                      </span>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Container>

          {/* ===================== FAMILY / SUPPORT ===================== */}
          <Container as="section" className="section-spacing-bottom">
            <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-20">
              <div className="order-2 lg:order-1">
                <p className="eyebrow">Support, every step</p>
                <h2 className="section-title mt-4">
                  We&apos;re with your family the whole way
                </h2>
                <p className="section-intro mt-5">
                  From ordering your kit to understanding your results, our team
                  of genetic counselors is here to guide you — so every family
                  has access to comprehensive genetic insight in a supportive,
                  caring environment.
                </p>
                <div className="mt-7">
                  <CtaButton href="/sign-in" label="Get started" />
                </div>
              </div>

              <div className="media-frame order-1 aspect-[4/5] lg:order-2">
                <Image
                  src="/images/family-moment.png"
                  alt="A family moment at home"
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                />
              </div>
            </div>
          </Container>

          {/* ===================== FOOTER ===================== */}
          <Container as="footer" id="contact" className="anchor-offset band-spacing">
            <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
              <div className="max-w-sm space-y-3">
                <Image
                  src={LOGO_SRC}
                  alt="Fore Genomics"
                  width={150}
                  height={38}
                  className="h-6 w-auto"
                />
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Advanced, at-home genetic screening for your child — with
                  expert counseling every step of the way.
                </p>
              </div>
              <nav className="flex flex-wrap gap-x-6 gap-y-3">
                <a
                  href="https://www.foregenomics.com/pages/privacy-policy"
                  className="footer-link"
                >
                  Privacy Policy
                </a>
                <a
                  href="https://www.foregenomics.com/pages/site-terms-and-conditions"
                  className="footer-link"
                >
                  Terms of Service
                </a>
                <a href={SUPPORT_EMAIL} className="footer-link">
                  Contact Support
                </a>
              </nav>
            </div>
            <div className="mt-8 border-t border-fore-teal/12 pt-6">
              <p className="text-sm text-muted-foreground">
                © {year} Fore Genomics. All rights reserved.
              </p>
            </div>
          </Container>
        </div>
      </div>
    </div>
  );
}
