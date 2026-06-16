import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
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

const CONTAINER = "mx-auto w-full max-w-[1400px] px-5 sm:px-8 lg:px-12";
const SAGE_GRADIENT = "linear-gradient(135deg,#68b3a9 0%,#5e9e8f 70%)";

const TRUST = ["HIPAA-compliant", "CLIA / CAP", "HSA / FSA"];

const STATS = [
  { value: "1,000+", label: "Conditions screened" },
  { value: "1", label: "Painless cheek swab" },
  { value: "100%", label: "At-home collection" },
  { value: "HIPAA", label: "CLIA / CAP secure" },
];

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

const STEPS = [
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

/** Brand gradient pill CTA (server-safe). */
function CtaButton({
  href,
  label,
  variant = "solid",
}: {
  href: string;
  label: string;
  variant?: "solid" | "ghost";
}) {
  if (variant === "ghost") {
    return (
      <Link
        href={href}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/40 bg-white/10 px-7 text-base font-medium text-white backdrop-blur transition-all duration-200 hover:bg-white/20"
      >
        {label}
      </Link>
    );
  }
  return (
    <Link
      href={href}
      className="inline-flex h-12 items-center justify-center gap-2 rounded-full px-8 text-base font-semibold text-white shadow-lg transition-all duration-200 hover:-translate-y-px hover:brightness-105"
      style={{
        background: SAGE_GRADIENT,
        boxShadow: "0 14px 30px -12px rgba(80,145,127,.6)",
      }}
    >
      {label}
      <ArrowRight size={18} />
    </Link>
  );
}

export default async function Home() {
  const { userId } = await auth();

  // If user is authenticated, redirect to appropriate destination
  if (userId) {
    const redirectUrl = await getAuthRedirectUrl();
    redirect(redirectUrl);
  }

  const year = new Date().getFullYear();

  return (
    <div className="relative w-full overflow-hidden bg-white">
      {/* ============================ HERO ============================ */}
      <section className="relative isolate flex min-h-[640px] w-full flex-col overflow-hidden lg:h-[92svh] lg:max-h-[940px]">
        <Image
          src="/images/hero-image.png"
          alt="A parent and child at home"
          fill
          priority
          sizes="100vw"
          className="object-cover"
          style={{ objectPosition: "center 32%" }}
        />
        {/* Brand-tinted scrim for legibility */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg,rgba(18,38,34,.62) 0%,rgba(18,38,34,.18) 26%,rgba(18,38,34,.20) 55%,rgba(18,38,34,.82) 100%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(100deg,rgba(18,38,34,.55) 0%,rgba(18,38,34,.08) 52%,rgba(18,38,34,0) 78%)",
          }}
        />

        {/* Hero content */}
        <div
          className={`relative z-10 flex flex-1 flex-col justify-between gap-14 pb-16 pt-28 sm:pt-32 lg:gap-0 lg:pb-20 lg:pt-40 ${CONTAINER}`}
        >
          {/* Top block — kept intentionally airy */}
          <div className="max-w-3xl">
            <p className="font-accent text-3xl leading-none text-white/90 sm:text-4xl">
              Know more. Know early.
            </p>
            <h1 className="mt-4 text-balance text-[2.6rem] font-medium leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">
              Genetic testing for your child&apos;s future.
            </h1>
          </div>

          {/* Bottom row */}
          <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-xl space-y-7">
              <p className="text-lg leading-relaxed text-white/85 sm:text-xl">
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
                {TRUST.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-white/90"
                  >
                    <Check size={14} strokeWidth={2} />
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Editorial accent */}
            <div className="flex flex-col items-start gap-3 lg:items-end lg:text-right">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-xs font-medium tracking-wide text-white/90 backdrop-blur">
                <HelixStrand width={40} />
                Pediatric whole-genome screening
              </span>
              <p className="font-display text-3xl font-medium leading-[1.05] text-white sm:text-4xl lg:text-5xl">
                Powered by DNA.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== BODY (sage atmosphere) ===================== */}
      <div
        className="relative"
        style={{
          background:
            "linear-gradient(180deg,#f4faf7 0%,#eaf4ef 46%,#dcebe4 100%)",
        }}
      >
        {/* Decorative sage atmosphere */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <span
            className="absolute rounded-full"
            style={{
              width: 620,
              height: 620,
              right: -200,
              top: 280,
              background:
                "radial-gradient(circle at 35% 35%, rgba(111,177,161,.22), rgba(111,177,161,0) 68%)",
            }}
          />
          <span
            className="absolute rounded-full"
            style={{
              width: 560,
              height: 560,
              left: -200,
              bottom: 220,
              background:
                "radial-gradient(circle at 60% 40%, rgba(152,203,196,.24), rgba(152,203,196,0) 70%)",
            }}
          />
        </div>

        <div className="relative z-10">
          {/* ===================== STATS BAND ===================== */}
          <section className="border-b border-fore-teal/12">
            <div className={`${CONTAINER} py-12 sm:py-14`}>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
                {STATS.map((s, i) => (
                  <div
                    key={s.label}
                    className={
                      i > 0
                        ? "lg:border-l lg:border-fore-teal/15 lg:pl-8"
                        : undefined
                    }
                  >
                    <dt className="font-display text-4xl font-medium leading-none text-primary sm:text-5xl">
                      {s.value}
                    </dt>
                    <dd className="mt-3 text-sm font-medium text-muted-foreground">
                      {s.label}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>

          {/* ===================== WHY / FEATURES ===================== */}
          <section id="why" className={`${CONTAINER} py-24 sm:py-32 lg:py-40`}>
            <div className="max-w-3xl">
              <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                Why families choose us
              </p>
              <h2 className="text-balance text-4xl font-medium leading-[1.1] text-foreground sm:text-5xl">
                Comprehensive screening, clear reports, and real human guidance.
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
                Everything we build is designed around one thing: giving families
                early, trustworthy insight into a child&apos;s health — with
                experts beside you the whole way.
              </p>
            </div>

            <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3 lg:gap-8">
              {FEATURES.map((f) => {
                const Art = f.art;
                return (
                  <div
                    key={f.title}
                    className="group rounded-[28px] border border-fore-teal/15 bg-white/70 p-9 shadow-[0_24px_60px_-44px_rgba(35,75,67,0.5)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_34px_70px_-44px_rgba(35,75,67,0.55)] lg:p-10"
                  >
                    <Art size={62} />
                    <h3 className="mt-6 text-xl font-medium text-foreground">
                      {f.title}
                    </h3>
                    <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
                      {f.copy}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ===================== HOW IT WORKS ===================== */}
          <section
            id="how-it-works"
            className={`${CONTAINER} pb-24 sm:pb-32 lg:pb-40`}
          >
            <div className="max-w-3xl">
              <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                How it works
              </p>
              <h2 className="text-balance text-4xl font-medium leading-[1.1] text-foreground sm:text-5xl">
                From kit to clarity, in three simple steps.
              </h2>
            </div>

            <ol className="mt-16 grid grid-cols-1 gap-x-10 gap-y-12 md:grid-cols-3 lg:gap-x-14">
              {STEPS.map((s, i) => (
                <li key={s.title} className="relative">
                  <span className="font-display text-6xl font-medium leading-none text-primary/25 lg:text-7xl">
                    0{i + 1}
                  </span>
                  <div className="mt-6 border-t border-fore-teal/25 pt-6">
                    <h3 className="text-xl font-medium text-foreground">
                      {s.title}
                    </h3>
                    <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
                      {s.copy}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* ===================== SWAB COLLECTION ===================== */}
          <section className={`${CONTAINER} pb-24 sm:pb-32 lg:pb-40`}>
            <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-20">
              <div className="relative order-1 aspect-[4/3] overflow-hidden rounded-[32px] shadow-[0_40px_90px_-50px_rgba(35,75,67,0.5)] ring-1 ring-fore-teal/15">
                <Image
                  src="/images/swab-collection.png"
                  alt="Simple cheek swab collection at home"
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                />
                <div className="absolute bottom-5 left-5 flex items-center gap-3 rounded-2xl bg-white/90 px-5 py-3 shadow-lg ring-1 ring-fore-teal/15 backdrop-blur">
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

              <div className="order-2 space-y-6">
                <p className="font-accent text-2xl leading-none text-primary">
                  Simple. Painless.
                </p>
                <h2 className="text-balance text-4xl font-medium leading-[1.1] text-foreground sm:text-5xl">
                  A gentle swab, done at home
                </h2>
                <p className="text-lg leading-relaxed text-muted-foreground">
                  Our at-home kit makes collection effortless — a gentle cheek
                  swab is all it takes. No needles, no discomfort, no clinic
                  visit.
                </p>
                <ul className="space-y-3 pt-1">
                  {[
                    "Whole-genome screening for 1,000+ conditions",
                    "Results delivered securely to your Health Hub",
                    "Board-certified genetic counseling included",
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-3 text-[15px] text-foreground/80"
                    >
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
                        <Check size={13} strokeWidth={2.5} />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* ===================== FAMILY / SUPPORT ===================== */}
          <section className={`${CONTAINER} pb-24 sm:pb-32 lg:pb-40`}>
            <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-20">
              <div className="order-2 space-y-6 lg:order-1">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                  Support, every step
                </p>
                <h2 className="text-balance text-4xl font-medium leading-[1.1] text-foreground sm:text-5xl">
                  We&apos;re with your family the whole way
                </h2>
                <p className="text-lg leading-relaxed text-muted-foreground">
                  From ordering your kit to understanding your results, our team
                  of genetic counselors is here to guide you — so every family
                  has access to comprehensive genetic insight in a supportive,
                  caring environment.
                </p>
                <div className="pt-2">
                  <CtaButton href="/sign-in" label="Get started" />
                </div>
              </div>

              <div className="relative order-1 aspect-[4/5] overflow-hidden rounded-[32px] shadow-[0_40px_90px_-50px_rgba(35,75,67,0.5)] ring-1 ring-fore-teal/15 lg:order-2">
                <Image
                  src="/images/family-moment.png"
                  alt="A family moment at home"
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                />
              </div>
            </div>
          </section>

          {/* ===================== FOOTER ===================== */}
          <footer id="contact" className="border-t border-fore-teal/15">
            <div className={`${CONTAINER} py-12 sm:py-14`}>
              <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
                <div className="max-w-sm space-y-3">
                  <Image
                    src="/images/logos/fore-genomics-logo-green.svg"
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
                <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm">
                  <a
                    href="https://www.foregenomics.com/pages/privacy-policy"
                    className="text-muted-foreground transition-colors hover:text-primary"
                  >
                    Privacy Policy
                  </a>
                  <a
                    href="https://www.foregenomics.com/pages/site-terms-and-conditions"
                    className="text-muted-foreground transition-colors hover:text-primary"
                  >
                    Terms of Service
                  </a>
                  <a
                    href={
                      process.env.NODE_ENV === "production"
                        ? "mailto:parent.portal@foregenomics.com"
                        : "mailto:parent.portal-dev@foregenomics.com"
                    }
                    className="text-muted-foreground transition-colors hover:text-primary"
                  >
                    Contact Support
                  </a>
                </div>
              </div>
              <div className="mt-8 border-t border-fore-teal/12 pt-6">
                <p className="text-sm text-muted-foreground">
                  © {year} Fore Genomics. All rights reserved.
                </p>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
