'use client';

import * as React from 'react';
import * as SheetPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

import { clsx } from "clsx";

const Sheet = SheetPrimitive.Root;

const SheetTrigger = SheetPrimitive.Trigger;

const SheetClose = SheetPrimitive.Close;

const SheetPortal = SheetPrimitive.Portal;

const SheetOverlay = React.forwardRef<
	React.ElementRef<typeof SheetPrimitive.Overlay>,
	React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
	<SheetPrimitive.Overlay
		className={clsx(
			'fixed inset-0 z-50 bg-black/80',
			className
		)}
		{...props}
		ref={ref}
	/>
));
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;

const sheetBaseClasses =
	'fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out';

const sheetSideClasses = {
	top: 'inset-x-0 top-0 border-b',
	bottom: 'inset-x-0 bottom-0 border-t',
	left: 'inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm',
	right: 'inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm',
} as const;

type SheetSide = keyof typeof sheetSideClasses;

interface SheetContentProps
	extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content> {
	side?: SheetSide;
	hideOverlay?: boolean;
}

const SheetContent = React.forwardRef<
	React.ElementRef<typeof SheetPrimitive.Content>,
	SheetContentProps
>(
	(
		{ side = 'right', className, children, hideOverlay = false, ...props },
		ref
	) => (
		<SheetPortal>
			{!hideOverlay && <SheetOverlay />}
			<SheetPrimitive.Content
				ref={ref}
				className={clsx(sheetBaseClasses, sheetSideClasses[side], className)}
				{...props}
			>
				<SheetPrimitive.Close className="absolute right-2 top-2 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
					<X className="h-5 w-5" />
					<span className="sr-only">Close</span>
				</SheetPrimitive.Close>
				{children}
			</SheetPrimitive.Content>
		</SheetPortal>
	)
);
SheetContent.displayName = SheetPrimitive.Content.displayName;

const SheetHeader = ({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) => (
	<div
		className={clsx(
			'flex flex-col space-y-2 text-center sm:text-left',
			className
		)}
		{...props}
	/>
);
SheetHeader.displayName = 'SheetHeader';

const SheetFooter = ({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) => (
	<div
		className={clsx(
			'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2',
			className
		)}
		{...props}
	/>
);
SheetFooter.displayName = 'SheetFooter';

const SheetTitle = React.forwardRef<
	React.ElementRef<typeof SheetPrimitive.Title>,
	React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
	<SheetPrimitive.Title
		ref={ref}
		className={clsx('text-lg font-semibold text-foreground', className)}
		{...props}
	/>
));
SheetTitle.displayName = SheetPrimitive.Title.displayName;

const SheetDescription = React.forwardRef<
	React.ElementRef<typeof SheetPrimitive.Description>,
	React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
	<SheetPrimitive.Description
		ref={ref}
		className={clsx('text-sm text-muted-foreground', className)}
		{...props}
	/>
));
SheetDescription.displayName = SheetPrimitive.Description.displayName;

export {
	Sheet,
	SheetPortal,
	SheetOverlay,
	SheetTrigger,
	SheetClose,
	SheetContent,
	SheetHeader,
	SheetFooter,
	SheetTitle,
	SheetDescription,
};
