# Fore Genomics Parent Portal

## Getting Started

Install dependencies: `npm install`

Run `vercel pull` to get env variables for local dev.

Run the development server: `npm run dev`

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

Retests Reaedy -> DNA + collection Kit

revariantfxc VCF, Variance,

- Info for each kit:
  - When it was updated last, document uploaded etc. on the admin side
- Status in the admin, overview, just need data available in the admin dashboard,
- Quality of life stuff, UPS tracking widget live tracker
- Order ID, state intio Slack orders channel, Webhook, so that orders and patients can be references, Shopify and stuff prepenmds order numbers
- \_SHP and \_ADM
- \_1 = # of kits
- TRF and consents are created, initials first -Lastname_FirstName
- Google -> Lynx
- Automate the Physician signing as much as possible
- rename restests to resamples
- take reminder email / nudge off of Clerk if the yahvent signed up after 6 hours in clerk, and send it through KLaviyo.
- # https://healthhub.foregenomics.com/ change to healthhub in clerk

- Add webhook in Clerk
  - Fix to make sure we are notifying Klaviyo of an account created
- Align web font from website to Clerk
- add webhook to alert when users have created an account & pendijng enrollment (enrollment complete) so we can alert them indepdently and for this new nudge to enter their child information, so that we can use the trigger for this new flow for Enrollment Completed,
- When an order is switched to Shipped To User, and tracking information from Lab in order is put, then create a new trigger, Tracking Info Created + personal info acount info, good news kit is on its way, include tracking details
  - Inbound/Outbound tracking information ikn thjis email
- Inbound Trigger tracking information for Fedex/Webhook API task - Email # 4 Your childs sample is on its way to the lab
- Fedex Webhook to when its dwelivered to lab then firre email #5
- Email #6 - Two triggers come from healthhub for here - Complete report delivered no counseling necessary (status in HH), report counseling required
