'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from "@/lib/utils";

export interface ChoiceOption<T extends string = string> {
	value: T;
	label: string;
	description?: string;
	icon?: React.ReactNode;
	disabled?: boolean;
}

interface ChoiceCardsProps<T extends string = string> {
	options: ChoiceOption<T>[];
	value: T | null;
	onChange: (value: T) => void;
	columns?: 1 | 2;
	size?: 'sm' | 'md' | 'lg';
	className?: string;
}

export function ChoiceCards<T extends string = string>({
	options,
	value,
	onChange,
	columns = 1,
	size = 'md',
	className,
}: ChoiceCardsProps<T>) {
	const sizeClasses = {
		sm: 'p-3 min-h-[56px]',
		md: 'p-4 min-h-[72px]',
		lg: 'p-5 min-h-[88px]',
	};

	const gridClasses = {
		1: 'grid-cols-1',
		2: 'grid-cols-2',
	};

	return (
		<div className={cn('grid gap-3', gridClasses[columns], className)}>
			{options.map((option) => {
				const isSelected = value === option.value;

				return (
					<motion.button
						key={option.value}
						type="button"
						onClick={() => !option.disabled && onChange(option.value)}
						disabled={option.disabled}
						whileTap={{ scale: option.disabled ? 1 : 0.98 }}
						className={cn(
							'relative flex items-center gap-4 rounded-xl border-2 text-left transition-all duration-200',
							sizeClasses[size],
							isSelected
								? 'border-primary bg-secondary shadow-md shadow-primary/10'
								: 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
							option.disabled && 'cursor-not-allowed opacity-50'
						)}
					>
						{/* Icon */}
						{option.icon && (
							<div
								className={cn(
									'flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg text-2xl',
									isSelected ? 'bg-secondary' : 'bg-slate-100'
								)}
							>
								{option.icon}
							</div>
						)}

						{/* Content */}
						<div className="flex-1 min-w-0">
							<p
								className={cn(
									'font-medium',
									isSelected ? 'text-secondary-foreground' : 'text-slate-900'
								)}
							>
								{option.label}
							</p>
							{option.description && (
								<p
									className={cn(
										'text-sm mt-0.5',
										isSelected ? 'text-secondary-foreground' : 'text-slate-500'
									)}
								>
									{option.description}
								</p>
							)}
						</div>

						{/* Checkmark */}
						<div
							className={cn(
								'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all',
								isSelected
									? 'border-primary bg-primary'
									: 'border-slate-300 bg-white'
							)}
						>
							{isSelected && (
								<motion.div
									initial={{ scale: 0 }}
									animate={{ scale: 1 }}
									transition={{ type: 'spring', stiffness: 500, damping: 30 }}
								>
									<Check className="h-3.5 w-3.5 text-white" />
								</motion.div>
							)}
						</div>
					</motion.button>
				);
			})}
		</div>
	);
}

/**
 * Multi-select version of ChoiceCards
 */
interface MultiChoiceCardsProps<T extends string = string> {
	options: ChoiceOption<T>[];
	values: T[];
	onChange: (values: T[]) => void;
	columns?: 1 | 2;
	size?: 'sm' | 'md' | 'lg';
	className?: string;
	maxSelections?: number;
}

export function MultiChoiceCards<T extends string = string>({
	options,
	values,
	onChange,
	columns = 1,
	size = 'md',
	className,
	maxSelections,
}: MultiChoiceCardsProps<T>) {
	const sizeClasses = {
		sm: 'p-3 min-h-[56px]',
		md: 'p-4 min-h-[72px]',
		lg: 'p-5 min-h-[88px]',
	};

	const gridClasses = {
		1: 'grid-cols-1',
		2: 'grid-cols-2',
	};

	const handleToggle = (optionValue: T) => {
		if (values.includes(optionValue)) {
			onChange(values.filter((v) => v !== optionValue));
		} else {
			if (maxSelections && values.length >= maxSelections) {
				// Replace oldest selection
				onChange([...values.slice(1), optionValue]);
			} else {
				onChange([...values, optionValue]);
			}
		}
	};

	return (
		<div className={cn('grid gap-3', gridClasses[columns], className)}>
			{options.map((option) => {
				const isSelected = values.includes(option.value);
				const isDisabled =
					option.disabled ||
					(maxSelections !== undefined &&
						values.length >= maxSelections &&
						!isSelected);

				return (
					<motion.button
						key={option.value}
						type="button"
						onClick={() => !isDisabled && handleToggle(option.value)}
						disabled={isDisabled}
						whileTap={{ scale: isDisabled ? 1 : 0.98 }}
						className={cn(
							'relative flex items-center gap-4 rounded-xl border-2 text-left transition-all duration-200',
							sizeClasses[size],
							isSelected
								? 'border-primary bg-secondary shadow-md shadow-primary/10'
								: 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
							isDisabled && !isSelected && 'cursor-not-allowed opacity-50'
						)}
					>
						{/* Icon */}
						{option.icon && (
							<div
								className={cn(
									'flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg text-2xl',
									isSelected ? 'bg-secondary' : 'bg-slate-100'
								)}
							>
								{option.icon}
							</div>
						)}

						{/* Content */}
						<div className="flex-1 min-w-0">
							<p
								className={cn(
									'font-medium',
									isSelected ? 'text-secondary-foreground' : 'text-slate-900'
								)}
							>
								{option.label}
							</p>
							{option.description && (
								<p
									className={cn(
										'text-sm mt-0.5',
										isSelected ? 'text-secondary-foreground' : 'text-slate-500'
									)}
								>
									{option.description}
								</p>
							)}
						</div>

						{/* Checkbox */}
						<div
							className={cn(
								'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded border-2 transition-all',
								isSelected
									? 'border-primary bg-primary'
									: 'border-slate-300 bg-white'
							)}
						>
							{isSelected && (
								<motion.div
									initial={{ scale: 0 }}
									animate={{ scale: 1 }}
									transition={{ type: 'spring', stiffness: 500, damping: 30 }}
								>
									<Check className="h-3.5 w-3.5 text-white" />
								</motion.div>
							)}
						</div>
					</motion.button>
				);
			})}
		</div>
	);
}

/**
 * Simple icon choice for compact selections (like sex selection)
 */
interface IconChoiceProps<T extends string = string> {
	options: {
		value: T;
		label: string;
		icon: React.ReactNode;
	}[];
	value: T | null;
	onChange: (value: T) => void;
	className?: string;
}

export function IconChoice<T extends string = string>({
	options,
	value,
	onChange,
	className,
}: IconChoiceProps<T>) {
	return (
		<div className={cn('flex gap-4', className)}>
			{options.map((option) => {
				const isSelected = value === option.value;

				return (
					<motion.button
						key={option.value}
						type="button"
						onClick={() => onChange(option.value)}
						whileTap={{ scale: 0.95 }}
						className={cn(
							'flex flex-1 flex-col items-center gap-3 rounded-2xl border-2 p-6 transition-all duration-200',
							isSelected
								? 'border-primary bg-secondary shadow-lg shadow-primary/15'
								: 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
						)}
					>
						<div
							className={cn(
								'flex h-16 w-16 items-center justify-center rounded-full text-4xl transition-colors',
								isSelected ? 'bg-secondary' : 'bg-slate-100'
							)}
						>
							{option.icon}
						</div>
						<span
							className={cn(
								'font-medium text-lg',
								isSelected ? 'text-secondary-foreground' : 'text-slate-700'
							)}
						>
							{option.label}
						</span>
						{isSelected && (
							<motion.div
								initial={{ scale: 0 }}
								animate={{ scale: 1 }}
								className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary"
							>
								<Check className="h-4 w-4 text-white" />
							</motion.div>
						)}
					</motion.button>
				);
			})}
		</div>
	);
}

