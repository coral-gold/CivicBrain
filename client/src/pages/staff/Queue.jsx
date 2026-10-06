import Layout from '../../components/Layout.jsx';
import Alert from '../../components/ui/Alert.jsx';
import Badge from '../../components/ui/Badge.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

const ROLE_LABEL = { OFFICER: 'Officer', ADMIN: 'Admin', SUPER_ADMIN: 'Super admin' };

/** Staff home. The ranked complaint queue arrives in milestone M3. */
export default function Queue() {
  const { user } = useAuth();
  return (
    <Layout area="staff">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold">Complaint queue</h1>
          <Badge tone="civic">{ROLE_LABEL[user.role]}</Badge>
          {user.role === 'OFFICER' && <Badge>Ward {user.assignedWard ?? '—'}</Badge>}
        </div>
        <Alert>The ranked queue, action plans and map are coming in milestones M3 and M4. You are signed in as staff.</Alert>
      </div>
    </Layout>
  );
}
