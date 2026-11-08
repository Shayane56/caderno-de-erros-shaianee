import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ChevronDown, FolderPlus, Library, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import type { Subject, Topic } from '@/types';
import { useAppData } from '@/hooks/useData';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button, IconButton } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { PageLoader } from '@/components/common/Spinner';
import { useToast } from '@/components/common/Toast';
import { InlineCreator } from '@/components/forms/InlineCreator';
import { DeleteStructureDialog } from '@/components/modals/DeleteStructureDialog';
import { createSubject, renameSubject } from '@/services/subjectService';
import { createTopic, renameTopic } from '@/services/topicService';
import { errorMessage } from '@/services/errors';
import { countBySubject, countByTopic, type GroupCount } from '@/utils/statistics';
import { normalizeText, pluralize } from '@/utils/text';
import { cn } from '@/utils/cn';

function InlineRename({ initial, label, onSave, onCancel }: { initial: string; label: string; onSave: (name: string) => Promise<void>; onCancel: () => void }) {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(value);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-1.5">
        <input
          autoFocus
          aria-label={label}
          className="input h-9 py-1.5 text-sm"
          value={value}
          maxLength={120}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void save();
            if (e.key === 'Escape') onCancel();
          }}
        />
        <IconButton size="sm" icon={Check} label="Salvar nome" tone="pink" onClick={() => void save()} disabled={saving} />
        <IconButton size="sm" icon={X} label="Cancelar" onClick={onCancel} />
      </div>
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

function Counts({ group }: { group?: GroupCount }) {
  const g = group ?? { total: 0, pending: 0, superado: 0 };
  return (
    <span className="text-xs text-ink-muted">
      <strong className="font-semibold text-ink">{pluralize(g.total, 'erro', 'erros')}</strong>
      {g.total > 0 && (
        <>
          {' '}
          · {g.pending} pendente{g.pending === 1 ? '' : 's'} · {g.superado} superado{g.superado === 1 ? '' : 's'}
        </>
      )}
    </span>
  );
}

export default function MateriasTopicosPage() {
  const data = useAppData();
  const toast = useToast();
  const [creatingSubject, setCreatingSubject] = useState(false);
  const [creatingTopicFor, setCreatingTopicFor] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [toDelete, setToDelete] = useState<{ kind: 'subject'; item: Subject } | { kind: 'topic'; item: Topic } | null>(null);

  const subjectCounts = useMemo(() => new Map(countBySubject(data.errors, data.subjects).map((g) => [g.id, g])), [data]);
  const topicCounts = useMemo(() => new Map(countByTopic(data.errors, data.topics, data.subjects).map((g) => [g.id, g])), [data]);

  const visibleSubjects = useMemo(() => {
    const q = normalizeText(query);
    if (!q) return data.subjects;
    return data.subjects.filter(
      (s) => normalizeText(s.name).includes(q) || data.topics.some((t) => t.subjectId === s.id && normalizeText(t.name).includes(q)),
    );
  }, [data.subjects, data.topics, query]);

  if (data.loading) return <PageLoader />;

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleCreateSubject = async (name: string) => {
    const subject = await createSubject(name);
    toast.success('Matéria criada', subject.name);
    setCreatingSubject(false);
    setExpanded((prev) => new Set(prev).add(subject.id));
    setCreatingTopicFor(subject.id);
  };

  const handleCreateTopic = async (subjectId: string, name: string) => {
    const topic = await createTopic(subjectId, name);
    toast.success('Tópico criado', topic.name);
    setCreatingTopicFor(null);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Matérias e Tópicos"
        eyebrow="Estrutura de estudos"
        icon={Library}
        subtitle="Personalize livremente as matérias e os tópicos do seu concurso. Duplicações são bloqueadas automaticamente."
        actions={
          <Button icon={FolderPlus} onClick={() => setCreatingSubject(true)}>
            Nova matéria
          </Button>
        }
      />

      {creatingSubject && (
        <InlineCreator label="Nome da nova matéria" placeholder="Ex.: Direito Constitucional" onCreate={handleCreateSubject} onCancel={() => setCreatingSubject(false)} />
      )}

      {data.subjects.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Library}
            title="Nenhuma matéria cadastrada"
            description="Cadastre as disciplinas do seu edital — por exemplo, Direito Constitucional, Direito Administrativo ou Língua Portuguesa — e depois os tópicos de cada uma."
            action={
              !creatingSubject && (
                <Button icon={FolderPlus} onClick={() => setCreatingSubject(true)}>
                  Cadastrar primeira matéria
                </Button>
              )
            }
          />
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-rose-antique" aria-hidden />
            <input
              type="search"
              className="input pl-11"
              placeholder="Buscar matéria ou tópico…"
              aria-label="Buscar matéria ou tópico"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <p className="px-1 text-sm text-ink-muted">
            {pluralize(data.subjects.length, 'matéria', 'matérias')} · {pluralize(data.topics.length, 'tópico', 'tópicos')}
          </p>
          <ul className="space-y-3">
            {visibleSubjects.map((subject) => {
              const topics = data.topics.filter((t) => t.subjectId === subject.id);
              const isOpen = expanded.has(subject.id) || !!query;
              return (
                <li key={subject.id} className="card">
                  <div className="flex items-center gap-3 p-4 sm:px-5">
                    <button
                      type="button"
                      onClick={() => toggle(subject.id)}
                      aria-expanded={isOpen}
                      aria-label={`${isOpen ? 'Recolher' : 'Expandir'} tópicos de ${subject.name}`}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blush to-petal text-rose-pink transition hover:brightness-95"
                    >
                      <ChevronDown className={cn('h-5 w-5 transition', !isOpen && '-rotate-90')} aria-hidden />
                    </button>
                    {renaming === subject.id ? (
                      <InlineRename
                        initial={subject.name}
                        label="Novo nome da matéria"
                        onSave={async (name) => {
                          await renameSubject(subject.id, name);
                          toast.success('Matéria renomeada');
                          setRenaming(null);
                        }}
                        onCancel={() => setRenaming(null)}
                      />
                    ) : (
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-display text-lg font-semibold text-ink">{subject.name}</p>
                        <p>
                          <span className="text-xs text-ink-muted">{pluralize(topics.length, 'tópico', 'tópicos')} · </span>
                          <Counts group={subjectCounts.get(subject.id)} />
                        </p>
                      </div>
                    )}
                    {renaming !== subject.id && (
                      <div className="flex shrink-0 items-center gap-0.5">
                        {(subjectCounts.get(subject.id)?.total ?? 0) > 0 && (
                          <Link to={`/erros?materia=${subject.id}`} className="hidden rounded-xl px-2.5 py-1.5 text-xs font-semibold text-rose-pink hover:bg-blush sm:inline-flex">
                            Ver erros
                          </Link>
                        )}
                        <IconButton size="sm" icon={Pencil} label={`Renomear ${subject.name}`} onClick={() => setRenaming(subject.id)} />
                        <IconButton size="sm" icon={Trash2} tone="danger" label={`Excluir ${subject.name}`} onClick={() => setToDelete({ kind: 'subject', item: subject })} />
                      </div>
                    )}
                  </div>

                  {isOpen && (
                    <div className="border-t border-line px-4 pb-4 pt-3 sm:px-5">
                      {topics.length === 0 && creatingTopicFor !== subject.id && <p className="py-2 text-sm text-ink-muted">Nenhum tópico nesta matéria ainda.</p>}
                      <ul className="divide-y divide-line">
                        {topics.map((topic) => (
                          <li key={topic.id} className="flex items-center gap-3 py-2.5 pl-1 sm:pl-12">
                            {renaming === topic.id ? (
                              <InlineRename
                                initial={topic.name}
                                label="Novo nome do tópico"
                                onSave={async (name) => {
                                  await renameTopic(topic.id, name);
                                  toast.success('Tópico renomeado');
                                  setRenaming(null);
                                }}
                                onCancel={() => setRenaming(null)}
                              />
                            ) : (
                              <>
                                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-medium" aria-hidden />
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-semibold text-ink">{topic.name}</p>
                                  <Counts group={topicCounts.get(topic.id)} />
                                </div>
                                <div className="flex shrink-0 items-center gap-0.5">
                                  {(topicCounts.get(topic.id)?.total ?? 0) > 0 && (
                                    <Link
                                      to={`/erros?materia=${subject.id}&topico=${topic.id}`}
                                      className="hidden rounded-xl px-2.5 py-1.5 text-xs font-semibold text-rose-pink hover:bg-blush sm:inline-flex"
                                    >
                                      Ver erros
                                    </Link>
                                  )}
                                  <IconButton size="sm" icon={Pencil} label={`Renomear ${topic.name}`} onClick={() => setRenaming(topic.id)} />
                                  <IconButton size="sm" icon={Trash2} tone="danger" label={`Excluir ${topic.name}`} onClick={() => setToDelete({ kind: 'topic', item: topic })} />
                                </div>
                              </>
                            )}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-2 sm:pl-12">
                        {creatingTopicFor === subject.id ? (
                          <InlineCreator
                            label={`Nome do novo tópico de ${subject.name}`}
                            placeholder="Ex.: Controle de constitucionalidade"
                            onCreate={(name) => handleCreateTopic(subject.id, name)}
                            onCancel={() => setCreatingTopicFor(null)}
                          />
                        ) : (
                          <Button variant="ghost" size="sm" icon={Plus} onClick={() => setCreatingTopicFor(subject.id)}>
                            Novo tópico
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          {visibleSubjects.length === 0 && <p className="text-center text-sm text-ink-muted">Nenhuma matéria ou tópico corresponde à busca.</p>}
        </>
      )}

      <DeleteStructureDialog target={toDelete} subjects={data.subjects} topics={data.topics} onClose={() => setToDelete(null)} />
    </div>
  );
}
