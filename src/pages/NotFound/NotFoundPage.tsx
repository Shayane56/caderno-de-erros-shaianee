import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';

export default function NotFoundPage() {
  return (
    <div className="card">
      <EmptyState
        icon={Compass}
        title="Página não encontrada"
        description="O endereço acessado não existe no Caderno de Erros."
        action={
          <Link to="/" className="font-semibold text-rose-pink hover:text-rose-deep">
            Voltar ao painel
          </Link>
        }
      />
    </div>
  );
}
