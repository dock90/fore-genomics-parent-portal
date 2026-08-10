import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

export default function SsoCallbackPage() {
  return (
    <>
      <AuthenticateWithRedirectCallback
        continueSignUpUrl="/sign-in/continue"
        signInForceRedirectUrl="/sign-in/sso-complete"
        signUpForceRedirectUrl="/sign-in/sso-complete"
      />
      <div id="clerk-captcha" />
    </>
  );
}
