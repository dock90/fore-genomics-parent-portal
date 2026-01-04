'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Calendar, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DatePickerMobileProps {
	value: string; // ISO date string (YYYY-MM-DD)
	onChange: (value: string) => void;
	placeholder?: string;
	minDate?: Date;
	maxDate?: Date;
	className?: string;
	error?: boolean;
}

const MONTHS = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December',
];

export function DatePickerMobile({
	value,
	onChange,
	placeholder = 'Select date',
	minDate,
	maxDate,
	className,
	error,
}: DatePickerMobileProps) {
	const [open, setOpen] = useState(false);
	const [selectedMonth, setSelectedMonth] = useState<number>(() => {
		if (value) {
			return new Date(value).getMonth();
		}
		return new Date().getMonth();
	});
	const [selectedDay, setSelectedDay] = useState<number>(() => {
		if (value) {
			return new Date(value).getDate();
		}
		return new Date().getDate();
	});
	const [selectedYear, setSelectedYear] = useState<number>(() => {
		if (value) {
			return new Date(value).getFullYear();
		}
		return new Date().getFullYear();
	});

	// Generate year options
	const years = useMemo(() => {
		const currentYear = new Date().getFullYear();
		const minYear = minDate ? minDate.getFullYear() : currentYear - 100;
		const maxYear = maxDate ? maxDate.getFullYear() : currentYear + 10;
		const yearList: number[] = [];
		for (let y = maxYear; y >= minYear; y--) {
			yearList.push(y);
		}
		return yearList;
	}, [minDate, maxDate]);

	// Generate days for selected month/year
	const days = useMemo(() => {
		const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
		return Array.from({ length: daysInMonth }, (_, i) => i + 1);
	}, [selectedMonth, selectedYear]);

	// Update internal state when value prop changes
	useEffect(() => {
		if (value) {
			const date = new Date(value);
			setSelectedMonth(date.getMonth());
			setSelectedDay(date.getDate());
			setSelectedYear(date.getFullYear());
		}
	}, [value]);

	// Format display value
	const displayValue = useMemo(() => {
		if (!value) return null;
		const date = new Date(value);
		return date.toLocaleDateString('en-US', {
			month: 'long',
			day: 'numeric',
			year: 'numeric',
		});
	}, [value]);

	const handleConfirm = () => {
		// Ensure day is valid for month
		const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
		const validDay = Math.min(selectedDay, daysInMonth);

		const date = new Date(selectedYear, selectedMonth, validDay);
		const isoDate = date.toISOString().split('T')[0];
		onChange(isoDate);
		setOpen(false);
	};

	const handleClear = () => {
		onChange('');
		setOpen(false);
	};

	return (
		<Drawer open={open} onOpenChange={setOpen}>
			<DrawerTrigger asChild>
				<button
					type="button"
					className={cn(
						'flex h-14 w-full items-center justify-between rounded-xl border-2 bg-white px-4 text-left text-lg transition-all',
						error
							? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
							: 'border-slate-200 hover:border-slate-300 focus:border-sky-500 focus:ring-sky-500/20',
						className
					)}
				>
					<div className="flex items-center gap-3">
						<Calendar
							className={cn(
								'h-5 w-5',
								displayValue ? 'text-sky-500' : 'text-slate-400'
							)}
						/>
						<span
							className={cn(
								displayValue ? 'text-slate-900' : 'text-slate-400'
							)}
						>
							{displayValue || placeholder}
						</span>
					</div>
					<ChevronDown className="h-5 w-5 text-slate-400" />
				</button>
			</DrawerTrigger>

			<DrawerContent className="pb-safe">
				<div className="mx-auto w-full max-w-md">
					{/* Header */}
					<div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
						<Button variant="ghost" size="sm" onClick={handleClear}>
							Clear
						</Button>
						<h3 className="font-semibold text-slate-900">Select Date</h3>
						<Button variant="ghost" size="sm" onClick={handleConfirm}>
							Done
						</Button>
					</div>

					{/* Picker Wheels */}
					<div className="flex h-[280px] items-center justify-center gap-2 px-4 py-6">
						{/* Month Picker */}
						<PickerWheel
							items={MONTHS}
							selectedIndex={selectedMonth}
							onSelect={setSelectedMonth}
							width="flex-1"
						/>

						{/* Day Picker */}
						<PickerWheel
							items={days.map(String)}
							selectedIndex={selectedDay - 1}
							onSelect={(index) => setSelectedDay(index + 1)}
							width="w-20"
						/>

						{/* Year Picker */}
						<PickerWheel
							items={years.map(String)}
							selectedIndex={years.indexOf(selectedYear)}
							onSelect={(index) => setSelectedYear(years[index])}
							width="w-24"
						/>
					</div>
				</div>
			</DrawerContent>
		</Drawer>
	);
}

/**
 * iOS-style picker wheel component
 */
interface PickerWheelProps {
	items: string[];
	selectedIndex: number;
	onSelect: (index: number) => void;
	width?: string;
}

function PickerWheel({
	items,
	selectedIndex,
	onSelect,
	width = 'flex-1',
}: PickerWheelProps) {
	const ITEM_HEIGHT = 44;
	const VISIBLE_ITEMS = 5;

	return (
		<div
			className={cn(
				'relative h-full overflow-hidden rounded-lg bg-slate-50',
				width
			)}
		>
			{/* Selection highlight */}
			<div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 h-11 -translate-y-1/2 border-y border-slate-200 bg-white/50" />

			{/* Scrollable list */}
			<div
				className="h-full overflow-y-auto scrollbar-hide snap-y snap-mandatory"
				style={{
					paddingTop: `${(ITEM_HEIGHT * (VISIBLE_ITEMS - 1)) / 2}px`,
					paddingBottom: `${(ITEM_HEIGHT * (VISIBLE_ITEMS - 1)) / 2}px`,
				}}
				onScroll={(e) => {
					const scrollTop = e.currentTarget.scrollTop;
					const index = Math.round(scrollTop / ITEM_HEIGHT);
					if (index !== selectedIndex && index >= 0 && index < items.length) {
						onSelect(index);
					}
				}}
				ref={(el) => {
					if (el && selectedIndex >= 0) {
						el.scrollTop = selectedIndex * ITEM_HEIGHT;
					}
				}}
			>
				{items.map((item, index) => {
					const isSelected = index === selectedIndex;
					return (
						<div
							key={`${item}-${index}`}
							className={cn(
								'flex h-11 snap-center items-center justify-center text-lg transition-all',
								isSelected
									? 'font-semibold text-slate-900'
									: 'text-slate-400'
							)}
							onClick={() => onSelect(index)}
						>
							{item}
						</div>
					);
				})}
			</div>
		</div>
	);
}

/**
 * Simple date input for desktop fallback
 */
interface DateInputProps {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	min?: string;
	max?: string;
	className?: string;
	error?: boolean;
}

export function DateInput({
	value,
	onChange,
	placeholder,
	min,
	max,
	className,
	error,
}: DateInputProps) {
	return (
		<div className="relative">
			<input
				type="date"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				min={min}
				max={max}
				placeholder={placeholder}
				className={cn(
					'h-14 w-full rounded-xl border-2 bg-white px-4 text-lg transition-all',
					error
						? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
						: 'border-slate-200 focus:border-sky-500 focus:ring-sky-500/20',
					className
				)}
			/>
		</div>
	);
}

/**
 * Responsive date picker that uses mobile drawer on small screens
 */
interface ResponsiveDatePickerProps extends DatePickerMobileProps {
	breakpoint?: number;
}

export function ResponsiveDatePicker({
	breakpoint = 640,
	...props
}: ResponsiveDatePickerProps) {
	const [isMobile, setIsMobile] = useState(false);

	useEffect(() => {
		const checkMobile = () => {
			setIsMobile(window.innerWidth < breakpoint);
		};

		checkMobile();
		window.addEventListener('resize', checkMobile);
		return () => window.removeEventListener('resize', checkMobile);
	}, [breakpoint]);

	if (isMobile) {
		return <DatePickerMobile {...props} />;
	}

	return (
		<DateInput
			value={props.value}
			onChange={props.onChange}
			min={props.minDate?.toISOString().split('T')[0]}
			max={props.maxDate?.toISOString().split('T')[0]}
			className={props.className}
			error={props.error}
		/>
	);
}

