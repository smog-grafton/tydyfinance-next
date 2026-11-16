import NewApplicantForm from './components/NewApplicantForm'
import { getRecruitmentWorkspace } from '@/lib/api/server'
import { Card, CardBody } from 'react-bootstrap'

const NewApplicantPage = async () => {
  const workspace = await getRecruitmentWorkspace()
  if (!workspace) return <Card><CardBody className="py-5 text-center"><h4 className="fw-bold mb-2">Recruitment access is restricted</h4><p className="mb-0 text-muted">Only authorized recruitment roles can register applicants.</p></CardBody></Card>

  return <><div className="mb-3"><h4 className="mb-1 fw-bold">New driver applicant</h4><p className="mb-0 text-muted">Recruitment starts as a draft. Submission remains blocked until consent and a trusted contact are recorded.</p></div><NewApplicantForm entities={workspace.entities} /></>
}

export default NewApplicantPage
