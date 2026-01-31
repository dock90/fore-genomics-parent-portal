import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { getAuthRedirectUrl } from "@/lib/auth-redirect";

export default async function Home() {
  const { userId } = await auth();

  // If user is authenticated, redirect to appropriate destination
  if (userId) {
    const redirectUrl = await getAuthRedirectUrl();
    redirect(redirectUrl);
  }

  // Show landing page for unauthenticated users
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Hero Content */}
            <div className="space-y-6 sm:space-y-8 text-center lg:text-left order-2 lg:order-1">
              <div className="space-y-4 sm:space-y-6">
                <p className="text-sm sm:text-base text-muted-foreground uppercase tracking-wider">
                  Welcome to the Parent Portal
                </p>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-foreground leading-tight">
                  <span className="block">Genetic Testing</span>
                  <span className="text-fore-teal block">for Your Child&apos;s Future</span>
                </h1>

                <p className="text-lg sm:text-xl lg:text-2xl text-muted-foreground max-w-2xl leading-relaxed">
                  Advanced genetic testing to help understand your child&apos;s health
                  and development. Get personalized insights and expert guidance.
                </p>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center lg:justify-start">
                <Link href="/sign-in">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto text-base sm:text-lg px-8 sm:px-12 py-4 sm:py-6"
                  >
                    Sign In
                  </Button>
                </Link>
              </div>
            </div>

            {/* Hero Image */}
            <div className="order-1 lg:order-2">
              <div className="relative aspect-[4/3] lg:aspect-square rounded-2xl overflow-hidden shadow-2xl">
                <Image
                  src="/images/hero-image.png"
                  alt="Parent and child"
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Simple Collection Section */}
      <section className="bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            {/* Image */}
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-xl">
              <Image
                src="/images/swab-collection.png"
                alt="Simple cheek swab collection"
                fill
                className="object-cover"
              />
            </div>

            {/* Content */}
            <div className="space-y-6 text-center lg:text-left">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
                Simple, Painless Collection
              </h2>
              <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed">
                Our at-home collection kit makes it easy to collect a sample from your child. 
                A gentle cheek swab is all it takes - no needles, no discomfort. 
                Results delivered directly to your portal.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        <div className="text-center space-y-12 sm:space-y-16">
          <div className="space-y-4 sm:space-y-6">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
              Why Choose Fore Genomics?
            </h2>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              Comprehensive genetic testing with expert analysis and
              personalized support
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-12">
            {/* Feature 1 */}
            <div className="text-center space-y-4 sm:space-y-6 p-6 sm:p-8 rounded-xl bg-secondary/50 border border-border">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-fore-teal-light/30 rounded-full flex items-center justify-center mx-auto">
                <svg
                  className="w-6 h-6 sm:w-8 sm:h-8 text-fore-teal"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-foreground">
                Comprehensive Testing
              </h3>
              <p className="text-sm sm:text-base text-muted-foreground">
                Advanced genetic panels designed specifically for children&apos;s
                health and development
              </p>
            </div>

            {/* Feature 2 */}
            <div className="text-center space-y-4 sm:space-y-6 p-6 sm:p-8 rounded-xl bg-secondary/50 border border-border">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-fore-blue/20 rounded-full flex items-center justify-center mx-auto">
                <svg
                  className="w-6 h-6 sm:w-8 sm:h-8 text-fore-blue"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-foreground">
                Expert Analysis
              </h3>
              <p className="text-sm sm:text-base text-muted-foreground">
                Results interpreted by certified genetic counselors and
                medical professionals
              </p>
            </div>

            {/* Feature 3 */}
            <div className="text-center space-y-4 sm:space-y-6 p-6 sm:p-8 rounded-xl bg-secondary/50 border border-border">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-fore-teal/20 rounded-full flex items-center justify-center mx-auto">
                <svg
                  className="w-6 h-6 sm:w-8 sm:h-8 text-fore-teal"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-foreground">
                Personalized Support
              </h3>
              <p className="text-sm sm:text-base text-muted-foreground">
                Ongoing guidance and support throughout your genetic testing
                journey
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Family Section */}
      <section className="bg-fore-blue/5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            {/* Content */}
            <div className="space-y-8 sm:space-y-10 text-center lg:text-left order-2 lg:order-1">
              <div className="space-y-4 sm:space-y-6">
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
                  Supporting Your Family Every Step
                </h2>
                <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed">
                  From ordering your kit to understanding your results, our team of genetic counselors 
                  is here to guide you. We believe every family deserves access to comprehensive 
                  genetic insights in a supportive, caring environment.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center lg:justify-start">
                <Link href="/sign-in">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto text-base sm:text-lg px-8 sm:px-12 py-4 sm:py-6"
                  >
                    Get Started
                  </Button>
                </Link>
              </div>
            </div>

            {/* Image */}
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-xl order-1 lg:order-2">
              <Image
                src="/images/family-moment.png"
                alt="Family moment"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © 2025 Fore Genomics. All rights reserved.
            </p>
            <div className="flex flex-wrap gap-4 sm:gap-6 text-sm">
              <a
                href="https://www.foregenomics.com/privacy-policy"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Privacy Policy
              </a>
              <a
                href="https://www.foregenomics.com/site-terms-conditions"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Terms of Service
              </a>
              <a
                href={
                  process.env.NODE_ENV === "production"
                    ? "mailto:parent.portal@foregenomics.com"
                    : "mailto:parent.portal-dev@foregenomics.com"
                }
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Contact Support
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
