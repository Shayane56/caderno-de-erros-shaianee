import { useState, type FormEvent } from 'react';
import { ArrowRight } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { NAME_MAX_LENGTH, setProfileName, skipProfile, useProfile } from '@/services/profile';
import { BrandMark } from './BrandMark';

/** Boas-vindas na primeira vez que o caderno é aberto neste aparelho: pergunta o nome. */
export function WelcomeDialog() {
  const profile = useProfile();
  const [name, setName] = useState('');
  const open = !profile.name && !profile.skipped;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (name.trim()) setProfileName(name);
  };

  return (
    <Modal
      open={open}
      onClose={skipProfile}
      size="sm"
      title="Boas-vindas ao Mimo 💗"
      description="Seu cantinho de estudos: caderno de erros, questões e flashcards. Tudo fica guardado neste aparelho."
      icon={<BrandMark />}
      footer={
        <>
          <Button variant="ghost" onClick={skipProfile}>
            Agora não
          </Button>
          <Button type="submit" form="welcome-form" iconRight={ArrowRight} disabled={!name.trim()}>
            Começar
          </Button>
        </>
      }
    >
      <form id="welcome-form" onSubmit={submit}>
        <label htmlFor="welcome-name" className="field-label">
          Qual é o seu nome?
        </label>
        <input
          id="welcome-name"
          className="input"
          value={name}
          maxLength={NAME_MAX_LENGTH}
          autoComplete="given-name"
          placeholder="Ex.: Maria Souza"
          onChange={(e) => setName(e.target.value)}
          data-autofocus
        />
        <p className="field-hint">Ele aparece na saudação do Painel e no menu. Dá para trocar depois em Backup e Configurações → Personalização.</p>
      </form>
    </Modal>
  );
}
