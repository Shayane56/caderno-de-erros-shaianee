import { useRef, useState } from 'react';
import { ImagePlus, Trash2, UserRound } from 'lucide-react';
import { SectionCard } from '@/components/common/Card';
import { Avatar } from '@/components/common/Avatar';
import { Button } from '@/components/common/Button';
import { useToast } from '@/components/common/Toast';
import { useAvatarPhoto } from '@/hooks/useData';
import { deleteSetting, resizeImageFile, setSetting, SETTING_KEYS } from '@/services/settingsService';
import { errorMessage } from '@/services/errors';

export function PersonalizationSection() {
  const toast = useToast();
  const photo = useAvatarPhoto();
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setLoading(true);
    try {
      const dataUrl = await resizeImageFile(file);
      await setSetting(SETTING_KEYS.avatarPhoto, dataUrl);
      toast.success('Foto atualizada');
    } catch (error) {
      toast.error('Não foi possível usar esta imagem', errorMessage(error));
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <SectionCard title="Personalização" subtitle="Troque o avatar ilustrado por uma fotografia." icon={UserRound}>
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <Avatar photo={photo} size={84} className="shadow-soft" />
        <div className="space-y-2">
          <input ref={inputRef} type="file" accept="image/*" className="sr-only" id="avatar-file" onChange={(e) => void onFile(e.target.files?.[0])} />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" icon={ImagePlus} loading={loading} onClick={() => inputRef.current?.click()}>
              {photo ? 'Trocar foto' : 'Usar uma foto'}
            </Button>
            {photo && (
              <Button size="sm" variant="ghost" icon={Trash2} onClick={() => void deleteSetting(SETTING_KEYS.avatarPhoto).then(() => toast.success('Avatar ilustrado restaurado'))}>
                Remover foto
              </Button>
            )}
          </div>
          <p className="text-xs text-ink-muted">A imagem é recortada em formato quadrado e salva apenas neste dispositivo.</p>
        </div>
      </div>
    </SectionCard>
  );
}
