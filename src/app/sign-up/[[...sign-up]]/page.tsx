import { SignUp } from '@clerk/nextjs'

export default function Page() {
  return (
    <div className='flex justify-center pt-16'>
      <SignUp
        appearance={{
            elements: {
                formButtonPrimary: 'bg-[#1D87FA] border-none !shadow-none hover:bg-[#1D87FA]/70',
            }
        }}
      />
    </div>
  )
}