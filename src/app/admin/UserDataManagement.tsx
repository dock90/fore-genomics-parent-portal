'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { UserIcon } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { deleteUserProfile, deleteConsent, deleteChild, deleteQuestionnaire, deleteUser } from './_actions'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'

interface UserData {
  id: string
  email: string
  role: string
  createdAt: string | Date
  profile?: {
    id: string
    firstName: string
    lastName: string
    address: string
    city: string
    state: string
    zipCode: string
  } | null
  consents: Array<{
    id: string
    accepted: boolean
    signerName?: string | null
    signatureDate?: string | Date | null
  }>
  children: Array<{
    id: string
    firstName: string | null
    lastName: string | null
    dob: string | Date | null
    dueDate: string | Date | null
  }>
  questionnaires: Array<{
    id: string
    createdAt: string | Date
  }>
}

interface UserDataManagementProps {
  users: UserData[]
}

// Function to format date strings as local dates (prevents timezone issues)
function formatLocalDate(dateString: string | Date | null, formatStr: string): string {
  if (!dateString) return 'Not provided';
  
  // If it's already a YYYY-MM-DD string, parse it as local date
  if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return format(date, formatStr);
  }
  
  // Fallback for other date formats
  return format(new Date(dateString), formatStr);
}

export function UserDataManagement({ users }: UserDataManagementProps) {
  const router = useRouter()

  const handleDeleteProfile = async (profileId: string) => {
    const formData = new FormData()
    formData.append('profileId', profileId)
    await deleteUserProfile(formData)
    router.refresh()
  }

  const handleDeleteConsent = async (consentId: string) => {
    const formData = new FormData()
    formData.append('consentId', consentId)
    await deleteConsent(formData)
    router.refresh()
  }

  const handleDeleteChild = async (childId: string) => {
    const formData = new FormData()
    formData.append('childId', childId)
    await deleteChild(formData)
    router.refresh()
  }

  const handleDeleteQuestionnaire = async (questionnaireId: string) => {
    const formData = new FormData()
    formData.append('questionnaireId', questionnaireId)
    await deleteQuestionnaire(formData)
    router.refresh()
  }

  const handleDeleteUser = async (userId: string, userEmail: string, userName: string) => {
    const formData = new FormData()
    formData.append('userId', userId)
    formData.append('userEmail', userEmail)
    await deleteUser(formData)
    router.refresh()
  }

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserIcon className="h-5 w-5" />
          User Data Management
        </CardTitle>
        <CardDescription>
          Manage user profiles, consents, and related data
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {users.map((user) => (
            <div key={user.id} className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">
                    {user.profile ? `${user.profile.firstName} ${user.profile.lastName} (${user.email})` : user.email}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Role: {user.role} | Created: {new Date(user.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <ConfirmDialog
                    title="Delete User?"
                    description={`Are you sure you want to delete ${user.profile?.firstName} ${user.profile?.lastName} (${user.email})? This will permanently delete the user and all their data including profile, consents, children, questionnaires, and orders. This action cannot be undone.`}
                    onConfirm={() => handleDeleteUser(user.id, user.email, `${user.profile?.firstName} ${user.profile?.lastName}`)}
                  >
                    <Button size="sm" variant="destructive" className="text-white">
                      Delete User
                    </Button>
                  </ConfirmDialog>
                </div>
              </div>

              {/* User Profile */}
              {user.profile && (
                <div className="bg-muted/50 p-3 rounded">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">Profile</h4>
                    <ConfirmDialog
                      title="Delete Profile?"
                      description="Are you sure you want to delete this user profile? This cannot be undone."
                      onConfirm={() => handleDeleteProfile(user.profile!.id)}
                    >
                      <Button size="sm" variant="destructive" className="text-white">
                        Delete Profile
                      </Button>
                    </ConfirmDialog>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {user.profile.address}, {user.profile.city}, {user.profile.state} {user.profile.zipCode}
                  </p>
                </div>
              )}

              {/* Consents */}
              {user.consents.length > 0 && (
                <div className="bg-muted/50 p-3 rounded">
                  <h4 className="font-medium mb-2">Consents ({user.consents.length})</h4>
                  <div className="space-y-2">
                    {user.consents.map((consent) => (
                      <div key={consent.id} className="flex items-center justify-between bg-background p-2 rounded">
                        <div className="text-sm">
                          <p>Accepted: {consent.accepted ? 'Yes' : 'No'}</p>
                          <p>Signed by: {consent.signerName || 'Unknown'}</p>
                          <p>Date: {consent.signatureDate ? new Date(consent.signatureDate).toLocaleDateString() : 'Not signed'}</p>
                        </div>
                        <ConfirmDialog
                          title="Delete Consent?"
                          description="Are you sure you want to delete this consent record? This cannot be undone."
                          onConfirm={() => handleDeleteConsent(consent.id)}
                        >
                          <Button size="sm" variant="destructive" className="text-white">
                            Delete
                          </Button>
                        </ConfirmDialog>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Children */}
              {user.children.length > 0 && (
                <div className="bg-muted/50 p-3 rounded">
                  <h4 className="font-medium mb-2">Children ({user.children.length})</h4>
                  <div className="space-y-2">
                    {user.children.map((child) => (
                      <div key={child.id} className="flex items-center justify-between bg-background p-2 rounded">
                        <div className="text-sm">
                          <p>
                            {child.firstName && child.lastName 
                              ? `${child.firstName} ${child.lastName}` 
                              : 'Unborn Child'
                            } - {
                              child.dob 
                                ? `DOB: ${formatLocalDate(child.dob, 'MMM dd, yyyy')}`
                                : child.dueDate 
                                ? `Due: ${formatLocalDate(child.dueDate, 'MMM dd, yyyy')}`
                                : 'No date provided'
                            }
                          </p>
                        </div>
                        <ConfirmDialog
                          title="Delete Child?"
                          description={`Are you sure you want to delete ${child.firstName && child.lastName ? `${child.firstName} ${child.lastName}` : 'this child'}? This cannot be undone.`}
                          onConfirm={() => handleDeleteChild(child.id)}
                        >
                          <Button size="sm" variant="destructive" className="text-white">
                            Delete
                          </Button>
                        </ConfirmDialog>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Questionnaires */}
              {user.questionnaires.length > 0 && (
                <div className="bg-muted/50 p-3 rounded">
                  <h4 className="font-medium mb-2">Questionnaires ({user.questionnaires.length})</h4>
                  <div className="space-y-2">
                    {user.questionnaires.map((questionnaire) => (
                      <div key={questionnaire.id} className="flex items-center justify-between bg-background p-2 rounded">
                        <div className="text-sm">
                          <p>Completed: {new Date(questionnaire.createdAt).toLocaleDateString()}</p>
                        </div>
                        <ConfirmDialog
                          title="Delete Questionnaire?"
                          description="Are you sure you want to delete this questionnaire? This cannot be undone."
                          onConfirm={() => handleDeleteQuestionnaire(questionnaire.id)}
                        >
                          <Button size="sm" variant="destructive" className="text-white">
                            Delete
                          </Button>
                        </ConfirmDialog>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
} 