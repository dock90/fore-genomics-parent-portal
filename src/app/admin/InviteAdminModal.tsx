'use client';

import { useState } from 'react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
	ShieldIcon,
	MailIcon,
	CheckCircleIcon,
	AlertCircleIcon,
	PlusIcon,
} from 'lucide-react';
import { inviteAdmin } from '../actions';

interface InviteResult {
	success: boolean;
	message: string;
	email?: string;
}

export function InviteAdminModal() {
	const [email, setEmail] = useState('');
	const [message, setMessage] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [result, setResult] = useState<InviteResult | null>(null);
	const [isOpen, setIsOpen] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSubmitting(true);
		setResult(null);

		try {
			const formData = new FormData();
			formData.append('email', email);
			formData.append('message', message);

			const response = await inviteAdmin(formData);
			setResult(response);

			if (response.success) {
				setEmail('');
				setMessage('');
				// Keep modal open to show success message
			}
		} catch (error) {
			setResult({
				success: false,
				message: 'Failed to send invitation. Please try again.',
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleOpenChange = (open: boolean) => {
		setIsOpen(open);
		if (!open) {
			// Reset form when modal closes
			setEmail('');
			setMessage('');
			setResult(null);
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>
				<Button className="flex items-center gap-2">
					<PlusIcon className="h-4 w-4" />
					Invite New Admin
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<ShieldIcon className="h-5 w-5" />
						Invite New Admin
					</DialogTitle>
					<DialogDescription>
						Send an invitation to a new admin user. They will receive an email
						with sign-up instructions.
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<Label htmlFor="email">Email Address</Label>
						<Input
							id="email"
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder="admin@example.com"
							required
							className="mt-1"
						/>
					</div>

					<div>
						<Label htmlFor="message">Personal Message (Optional)</Label>
						<Textarea
							id="message"
							value={message}
							onChange={(e) => setMessage(e.target.value)}
							placeholder="Add a personal message to the invitation email..."
							className="mt-1"
							rows={3}
						/>
					</div>

				<div className="flex items-center gap-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
					<MailIcon className="h-4 w-4 text-gray-600 dark:text-gray-300" />
					<div className="text-sm text-gray-700 dark:text-gray-200">
						<p className="font-medium">What happens next?</p>
						<p className="text-xs mt-1 text-gray-600 dark:text-gray-300">
							An email invitation will be sent with a link to create their
							account. Admin privileges are granted automatically upon sign-up.
						</p>
					</div>
				</div>

					<div className="flex gap-3 pt-2">
						<Button
							type="submit"
							disabled={isSubmitting || !email.trim()}
							className="flex-1"
						>
							{isSubmitting ? 'Sending Invitation...' : 'Send Admin Invitation'}
						</Button>
						<Button
							type="button"
							variant="outline"
							onClick={() => handleOpenChange(false)}
							disabled={isSubmitting}
						>
							Cancel
						</Button>
					</div>
				</form>

				{/* Result Message */}
				{result && (
					<div
						className={`p-3 rounded-lg border ${
							result.success
								? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
								: 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
						}`}
					>
						<div className="flex items-center gap-2">
							{result.success ? (
								<CheckCircleIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
							) : (
								<AlertCircleIcon className="h-4 w-4 text-red-600 dark:text-red-400" />
							)}
							<div className="text-sm">
								<p
									className={`font-medium ${
										result.success
											? 'text-green-800 dark:text-green-200'
											: 'text-red-800 dark:text-red-200'
									}`}
								>
									{result.success ? 'Invitation Sent!' : 'Invitation Failed'}
								</p>
								<p
									className={`text-xs mt-1 ${
										result.success
											? 'text-green-700 dark:text-green-300'
											: 'text-red-700 dark:text-red-300'
									}`}
								>
									{result.message}
								</p>
							</div>
						</div>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
