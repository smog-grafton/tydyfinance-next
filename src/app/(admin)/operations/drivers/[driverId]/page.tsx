import DriverProfile from './components/DriverProfile'
import { getApprovedDriver } from '@/lib/api/server'
import { notFound } from 'next/navigation'

const DriverProfilePage = async ({ params }: { params: { driverId: string } }) => {
  const profile = await getApprovedDriver(params.driverId)
  if (!profile) notFound()
  return <DriverProfile profile={profile} />
}

export default DriverProfilePage
