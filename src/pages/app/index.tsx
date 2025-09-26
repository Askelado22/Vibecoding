import { GetServerSideProps } from 'next';
import { useState } from 'react';
import { Layout } from '../../components/Layout';
import { ToastProvider } from '../../components/ToastProvider';
import { WorkTab } from '../../components/WorkTab';
import { ListTab } from '../../components/ListTab';
import { AdminTab } from '../../components/AdminTab';
import { MyItemsTab } from '../../components/MyItemsTab';
import { prisma } from '../../lib/repositories/prisma';
import { getTokenName, verifyToken } from '../../lib/auth';
import { isUserRole } from '../../lib/constants';

interface AppPageProps {
  user: {
    id: string;
    email: string;
    role: 'admin' | 'worker';
    displayName: string;
  };
}

export default function AppPage({ user }: AppPageProps) {
  const [activeTab, setActiveTab] = useState(user.role === 'admin' ? 'work' : 'work');

  return (
    <ToastProvider>
      <Layout activeTab={activeTab} onTabChange={setActiveTab} user={user}>
        {activeTab === 'work' && <WorkTab user={user} />}
        {activeTab === 'personal' && <MyItemsTab user={user} />}
        {activeTab === 'list' && <ListTab user={user} />}
        {activeTab === 'admin' && user.role === 'admin' && <AdminTab />}
      </Layout>
    </ToastProvider>
  );
}

export const getServerSideProps: GetServerSideProps<AppPageProps> = async (context) => {
  const token = context.req.cookies?.[getTokenName()];
  if (!token) {
    return {
      redirect: {
        destination: '/login',
        permanent: false
      }
    };
  }
  const payload = verifyToken(token);
  if (!payload) {
    return {
      redirect: {
        destination: '/login',
        permanent: false
      }
    };
  }

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) {
    return {
      redirect: {
        destination: '/login',
        permanent: false
      }
    };
  }

  const role = isUserRole(user.role) ? user.role : 'worker';

  return {
    props: {
      user: {
        id: user.id,
        email: user.email,
        role,
        displayName: user.displayName
      }
    }
  };
};
