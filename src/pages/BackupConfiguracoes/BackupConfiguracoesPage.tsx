import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { DatabaseBackup, Info } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { ExportSection } from './sections/ExportSection';
import { ImportSection } from './sections/ImportSection';
import { SnapshotsSection } from './sections/SnapshotsSection';
import { SyncSection } from './sections/SyncSection';
import { PersonalizationSection } from './sections/PersonalizationSection';
import { DeviceSection } from './sections/DeviceSection';
import { AppearanceSection } from './sections/AppearanceSection';

export default function BackupConfiguracoesPage() {
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) return;
    const el = document.getElementById(location.hash.slice(1));
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [location.hash]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Backup e Configurações"
        eyebrow="Seus dados em segurança"
        icon={DatabaseBackup}
        subtitle="Exporte cópias, restaure informações, sincronize entre dispositivos e personalize cores, tema escuro e o visual dos flashcards."
      />
      <div className="flex items-start gap-3 rounded-3xl bg-blush/50 p-4 text-sm text-rose-ink ring-1 ring-petal">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <p>
          Seus registros ficam salvos neste dispositivo (IndexedDB) e continuam disponíveis após fechar o navegador. Faça backups
          regularmente — eles são a sua garantia caso troque de aparelho ou limpe os dados do navegador.
        </p>
      </div>
      <div id="aparencia" className="scroll-mt-24">
        <AppearanceSection />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="min-w-0 space-y-6">
          <ExportSection />
          <ImportSection />
          <SnapshotsSection />
        </div>
        <div className="min-w-0 space-y-6">
          <SyncSection />
          <DeviceSection />
          <PersonalizationSection />
        </div>
      </div>
    </div>
  );
}
