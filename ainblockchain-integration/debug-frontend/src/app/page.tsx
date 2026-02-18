'use client';

import { useSession } from 'next-auth/react';
import AuthGate from '@/components/AuthGate';
import ConfigPanel from '@/components/ConfigPanel';
import WalletInfo from '@/components/WalletInfo';
import SetupAppButton from '@/components/SetupAppButton';
import SectionCollapsible from '@/components/SectionCollapsible';
import TopicBrowser from '@/components/TopicBrowser';
import ExploreForm from '@/components/ExploreForm';
import ExplorationViewer from '@/components/ExplorationViewer';
import FrontierMapViz from '@/components/FrontierMapViz';
import FrontierView from '@/components/FrontierView';
import AccessPanel from '@/components/AccessPanel';

export default function DashboardPage() {
  const { data: session, status } = useSession();

  return (
    <main className="min-h-screen p-4 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-white">
        AIN Knowledge Debug Dashboard
      </h1>

      <SectionCollapsible title="Auth & Wallet" defaultOpen={true}>
        <div className="space-y-4">
          <AuthGate />
          {status === 'authenticated' && (
            <>
              <ConfigPanel />
              <WalletInfo />
              <SetupAppButton />
            </>
          )}
        </div>
      </SectionCollapsible>

      {status === 'authenticated' && (
        <>
          <SectionCollapsible title="Topics" defaultOpen={false}>
            <TopicBrowser />
          </SectionCollapsible>

          <SectionCollapsible title="Explore" defaultOpen={false}>
            <ExploreForm />
          </SectionCollapsible>

          <SectionCollapsible title="Explorations" defaultOpen={false}>
            <ExplorationViewer />
          </SectionCollapsible>

          <SectionCollapsible title="Frontier" defaultOpen={false}>
            <div className="space-y-6">
              <FrontierMapViz />
              <hr className="border-gray-700" />
              <FrontierView />
            </div>
          </SectionCollapsible>

          <SectionCollapsible title="Access (x402)" defaultOpen={false}>
            <AccessPanel />
          </SectionCollapsible>
        </>
      )}
    </main>
  );
}
