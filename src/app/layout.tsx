import type { Metadata, Viewport } from 'next';
import { Roboto, Caveat, Jost, Hanken_Grotesk } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';
import { ConditionalHeader } from '@/components/ConditionalHeader';
import { LoginTracker } from '@/components/LoginTracker';

const roboto = Roboto({
	subsets: ['latin'],
	weight: ['300', '400', '500', '700'],
	variable: '--font-roboto',
	display: 'swap',
});

const caveat = Caveat({
	subsets: ['latin'],
	weight: ['400', '500', '600', '700'],
	variable: '--font-caveat',
	display: 'swap',
});

// Geometric display sans — mirrors the foregenomics.com marketing headings
const jost = Jost({
	subsets: ['latin'],
	weight: ['300', '400', '500', '600'],
	variable: '--font-jost',
	display: 'swap',
});

// Modern grotesque — used for refined UI / form text in the auth experience
const hankenGrotesk = Hanken_Grotesk({
	subsets: ['latin'],
	weight: ['300', '400', '500', '600', '700'],
	variable: '--font-hanken',
	display: 'swap',
});

export const metadata: Metadata = {
	title: 'Fore Genomics Health Hub',
	description: 'Genetic health hub for your family',
};

export const viewport: Viewport = {
	width: 'device-width',
	initialScale: 1,
	maximumScale: 1,
	userScalable: false,
	viewportFit: 'cover',
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<ClerkProvider dynamic>
			<html lang="en">
				<body
					className={`${roboto.variable} ${caveat.variable} ${jost.variable} ${hankenGrotesk.variable} antialiased font-sans`}
				>
					<ConditionalHeader />
					<LoginTracker />
					<main className="min-h-screen px-1 sm:px-0">{children}</main>
				</body>
			</html>
		</ClerkProvider>
	);
}
