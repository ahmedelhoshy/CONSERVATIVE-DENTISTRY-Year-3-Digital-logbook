// Lets Cloud Storage security rules read the roster in Firestore (needed for tooth photos and atlas uploads).
// Grants roles/firebaserules.firestoreServiceAgent to the Firebase Storage service agent, once.
import { GoogleAuth } from 'google-auth-library';
const project = process.env.FB_PROJECT_ID;
const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
const client = await auth.getClient();
const crm = `https://cloudresourcemanager.googleapis.com/v1/projects/${project}`;
const note = (m) => console.log(`::notice title=Storage rules access::${m}`);
try {
  const { data: p } = await client.request({ url: crm });
  const member = `serviceAccount:service-${p.projectNumber}@gcp-sa-firebasestorage.iam.gserviceaccount.com`;
  const role = 'roles/firebaserules.firestoreServiceAgent';
  const { data: policy } = await client.request({ url: `${crm}:getIamPolicy`, method: 'POST', data: {} });
  let b = (policy.bindings || []).find((x) => x.role === role);
  if (b && b.members.includes(member)) { note('already granted'); process.exit(0); }
  if (!b) { b = { role, members: [] }; (policy.bindings = policy.bindings || []).push(b); }
  b.members.push(member);
  await client.request({ url: `${crm}:setIamPolicy`, method: 'POST', data: { policy } });
  note('granted now — photo and atlas uploads can check the roster');
} catch (e) {
  console.log(`::warning title=Storage rules access::could not grant (${e.response?.status || ''} ${e.response?.data?.error?.message || e.message})`);
}
