import ApplicantCommandCenter from './components/ApplicantCommandCenter'
import { getRecruitmentApplicant } from '@/lib/api/server'
import { notFound } from 'next/navigation'

const ApplicantPage = async ({ params }: { params: { applicationId: string } }) => {
  const profile = await getRecruitmentApplicant(params.applicationId)
  if (!profile) notFound()

  return <ApplicantCommandCenter profile={profile} />
}

export default ApplicantPage
