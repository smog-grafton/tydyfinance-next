import RecruitmentWorkspace from './components/RecruitmentWorkspace'
import { getRecruitmentWorkspace } from '@/lib/api/server'
import { notFound } from 'next/navigation'
import { Card, CardBody } from 'react-bootstrap'

const sections = ['applicants', 'operations', 'academy-evaluations', 'academy-templates', 'home-visits'] as const
type Section = (typeof sections)[number]
const titles: Record<Section, string> = { applicants: 'Driver Applicants', operations: 'Recruitment Operations', 'academy-evaluations': 'Academy Evaluations', 'academy-templates': 'Academy Templates', 'home-visits': 'Home Visits' }

const RecruitmentPage = async ({ params }: { params: { section: string } }) => {
  if (!sections.includes(params.section as Section)) notFound()
  const workspace = await getRecruitmentWorkspace()
  if (!workspace) return <Card><CardBody className="py-5 text-center"><h4 className="fw-bold mb-2">Recruitment access is restricted</h4><p className="mb-0 text-muted">Only authorized recruitment roles can view applicant workflows.</p></CardBody></Card>
  const section = params.section as Section
  return <RecruitmentWorkspace workspace={workspace} section={section} title={titles[section]} />
}

export default RecruitmentPage
