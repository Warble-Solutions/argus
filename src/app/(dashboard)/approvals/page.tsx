import { getApprovals } from '@/lib/actions/data'
import ApprovalsClient from './ApprovalsClient'

export default async function ApprovalsPage() {
  const approvals = await getApprovals()
  return <ApprovalsClient approvals={approvals} />
}
