import FollowForm from './FollowForm';

export const dynamic = 'force-dynamic';

export default async function FollowPage({
  searchParams,
}: {
  searchParams: Promise<{ thanks?: string }>;
}) {
  const { thanks } = await searchParams;
  return <FollowForm initialDone={thanks === '1'} />;
}
