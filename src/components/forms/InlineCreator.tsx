import { useEffect, useRef, useState } from 'react';
import { Check, X } from 'lucide-react';
import { Button, IconButton } from '@/components/common/Button';

interface InlineCreatorProps {
  label: string;
  placeholder: string;
  onCreate: (name: string) => Promise<void>;
  onCancel: () => void;
}

/** Campo para criar matéria/tópico sem sair do formulário. */
export function InlineCreator({ label, placeholder, onCreate, onCancel }: InlineCreatorProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => inputRef.current?.focus(), []);

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      await onCreate(name);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível criar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-slide-up rounded-2xl border border-dashed border-rose-antique/60 bg-blush/40 p-3">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          aria-label={label}
          className="input h-10 py-2"
          placeholder={placeholder}
          value={name}
          maxLength={120}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void submit();
            }
            if (e.key === 'Escape') {
              e.preventDefault();
              e.stopPropagation();
              onCancel();
            }
          }}
        />
        <Button size="sm" icon={Check} onClick={() => void submit()} loading={saving} className="h-10">
          Criar
        </Button>
        <IconButton icon={X} label="Cancelar" onClick={onCancel} />
      </div>
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
