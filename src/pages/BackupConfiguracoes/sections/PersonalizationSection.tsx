import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Check, ImagePlus, Trash2, UserRound } from 'lucide-react';
import { SectionCard } from '@/components/common/Card';
import { Avatar } from '@/components/common/Avatar';
import { Button } from '@/components/common/Button';
import { useToast } from '@/components/common/Toast';
import { useAvatarPhoto } from '@/hooks/useData';
import { deleteSetting, resizeImageFile, setSetting, SETTING_KEYS } from '@/services/settingsService';
import { errorMessage } from '@/services/errors';
import { NAME_MAX_LENGTH, setProfileName, useProfile } from '@/services/profile';
import { InviteButton } from '@/components/mimo/InviteButton';

export function PersonalizationSection() {
  const toast = useToast();
  const photo = useAvatarPhoto();
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const profile = useProfile();
  const [name, setName] = useState(profile.name);
  useEffect(() => setName(profile.name), [profile.name]);

  const saveName = (event: FormEvent) => {
    event.preventDefault();
    setProfileName(name);
    toast.success(name.trim() ? 'Nome atualizado' : 'Nome removido', name.trim() ? `Bem-vinda(o), ${name.trim().split(' ')[0]}!` : undefined);
  };

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
    <SectionCard title="Personalização" subtitle="Seu nome e sua foto, guardados apenas neste aparelho." icon={UserRound}>
      <form onSubmit={saveName} className="mb-5 border-b border-line pb-5">
        <label htmlFor="profile-name" className="field-label">
          Seu nome
        </label>
        <div className="flex gap-2">
          <input id="profile-name" className="input" value={name} maxLength={NAME_MAX_LENGTH} placeholder="Como você quer ser chamada(o)?" onChange={(e) => setName(e.target.value)} />
          <Button type="submit" variant="secondary" icon={Check} disabled={name.trim() === profile.name}>
            Salvar
          </Button>
        </div>
        <p className="field-hint">Aparece na saudação do Início, no menu e no nome dos backups.</p>
      </form>
      <div className="mb-5 flex flex-col gap-3 rounded-2xl bg-gradient-to-r from-blush to-lilac p-4 sm:flex-row sm:items-center">
        <p className="flex-1 text-sm text-ink">
          <strong>Estude junto!</strong> Mande o Mimo para uma amiga: ela cria o caderno dela, separado do seu.
        </p>
        <InviteButton variant="card" />
      </div>
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
