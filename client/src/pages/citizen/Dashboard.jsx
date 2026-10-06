import Layout from '../../components/Layout.jsx';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

/** Citizen home. Reporting and tracking complaints arrive in milestone M2. */
export default function Dashboard() {
  const { user } = useAuth();
  return (
    <Layout area="citizen">
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold">Hello, {user.fullName.split(' ')[0]}</h1>
          <p className="text-ink/70">See something broken in your neighbourhood? Tell your municipality.</p>
        </div>
        <Card className="space-y-3">
          <Button disabled className="w-full sm:w-auto">
            Report an issue
          </Button>
          <Alert>Reporting and tracking complaints are coming in the next milestone (M2). Your account is ready.</Alert>
        </Card>
      </div>
    </Layout>
  );
}
