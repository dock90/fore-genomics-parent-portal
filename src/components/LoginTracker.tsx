'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';

export function LoginTracker() {
	const { isSignedIn, userId } = useAuth();
	const hasLoggedRef = useRef(false);

	useEffect(() => {
		// Only log once per session and only when signed in
		if (!isSignedIn || !userId || hasLoggedRef.current) {
			return;
		}

		// Check if we already logged this session
		const sessionKey = `login_logged_${userId}`;
		if (sessionStorage.getItem(sessionKey)) {
			hasLoggedRef.current = true;
			return;
		}

		// Log the login event
		const logLogin = async () => {
			try {
				await fetch('/api/auth/log', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ action: 'USER_LOGIN' }),
				});
				sessionStorage.setItem(sessionKey, 'true');
				hasLoggedRef.current = true;
			} catch (error) {
				// Silently fail - login tracking shouldn't block the user
			}
		};

		logLogin();
	}, [isSignedIn, userId]);

	return null;
}
