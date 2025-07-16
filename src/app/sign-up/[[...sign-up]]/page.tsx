"use client";

import { SignUp } from '@clerk/nextjs'
import { useSearchParams } from 'next/navigation'

export default function Page() {
  const searchParams = useSearchParams()
  const redirectUrl = searchParams.get('redirect_url')

  return (
    <div className='flex justify-center pt-8'>
      <SignUp
        redirectUrl={redirectUrl || undefined}
        appearance={{
            elements: {
                formButtonPrimary: 'bg-[#1D87FA] border-none !shadow-none hover:bg-[#1D87FA]/70',
            }
        }}
      />
    </div>
  )
}