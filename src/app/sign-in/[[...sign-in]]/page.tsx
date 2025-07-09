import { SignIn } from '@clerk/nextjs'

export default function Page() {
  return (
    <div className='flex justify-center pt-8'>
      <SignIn
        appearance={{
          elements: {
            formButtonPrimary: 'bg-[#1D87FA] border-none !shadow-none hover:bg-[#1D87FA]/70',
          }
        }}
      />
    </div>
  )
}