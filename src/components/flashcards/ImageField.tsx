import { useRef, useState } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { useToast } from '@/components/common/Toast';
import { dataUrlSizeKb, imageFileToDataUrl } from '@/services/imageService';
import { errorMessage } from '@/services/errors';

interface ImageFieldProps {
  value: string | null;
  onChange: (value: string | null) => void;
  label: string;
}

/** Imagem opcional de um lado do cartão (enviar arquivo ou colar com Ctrl+V no texto). */
export function ImageField({ value, onChange, label }: ImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setLoading(true);
    try {
      onChange(await imageFileToDataUrl(file));
    } catch (error) {
      toast.error('Não foi possível usar esta imagem', errorMessage(error));
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input ref={inputRef} type="file" accept="image/*" className="sr-only" aria-label={label} onChange={(e) => void onFile(e.target.files?.[0])} tabIndex={-1} />
      {value ? (
        <div className="flex items-center gap-3 rounded-2xl bg-canvas p-2 pr-3">
          <img src={value} alt="" className="h-14 w-14 rounded-xl object-cover ring-1 ring-line" />
          <span className="text-xs text-ink-muted">{dataUrlSizeKb(value)} KB</span>
          <Button size="sm" variant="ghost" icon={ImagePlus} onClick={() => inputRef.current?.click()} loading={loading}>
            Trocar
          </Button>
          <Button size="sm" variant="ghost" icon={Trash2} onClick={() => onChange(null)} className="text-red-600 hover:bg-red-50 hover:text-red-700" aria-label={`Remover ${label.toLowerCase()}`}>
            Remover
          </Button>
        </div>
      ) : (
        <>
          <Button size="sm" variant="outline" icon={ImagePlus} onClick={() => inputRef.current?.click()} loading={loading}>
            {label}
          </Button>
          <span className="text-xs text-ink-soft">ou cole um print (Ctrl+V) no texto</span>
        </>
      )}
    </div>
  );
}
