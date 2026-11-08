export interface MotivationalMessage {
  id: number;
  text: string;
  theme:
    | 'disciplina'
    | 'constancia'
    | 'persistencia'
    | 'superacao'
    | 'aprendizado'
    | 'evolucao'
    | 'preparacao'
    | 'aprovacao';
}

export const MOTIVATIONAL_MESSAGES: MotivationalMessage[] = [
  { id: 1, theme: 'aprendizado', text: 'Cada erro corrigido é um passo a mais em direção à aprovação.' },
  { id: 2, theme: 'evolucao', text: 'Você não precisa ser perfeita hoje. Precisa evoluir um pouco a cada dia.' },
  { id: 3, theme: 'aprendizado', text: 'Quem aprende com os próprios erros chega mais preparado à prova.' },
  { id: 4, theme: 'aprovacao', text: 'A aprovação é construída nos dias em que você decide não desistir.' },
  {
    id: 5,
    theme: 'aprendizado',
    text: 'Não tenha medo de errar nas questões. Tenha compromisso em não repetir os mesmos erros.',
  },
  { id: 6, theme: 'disciplina', text: 'Disciplina é continuar mesmo quando a motivação não aparece.' },
  { id: 7, theme: 'constancia', text: 'Constância vence intensidade. Um pouco todos os dias leva longe.' },
  { id: 8, theme: 'persistencia', text: 'Persistir é escolher o seu objetivo de novo, todos os dias.' },
  { id: 9, theme: 'superacao', text: 'O conteúdo que hoje parece difícil será, em breve, um dos seus pontos fortes.' },
  { id: 10, theme: 'aprendizado', text: 'Errar no treino é o privilégio de quem quer acertar na prova.' },
  { id: 11, theme: 'evolucao', text: 'Compare-se apenas com quem você era ontem. É aí que está a sua evolução.' },
  { id: 12, theme: 'preparacao', text: 'Cada questão resolvida é um ensaio para o dia da sua aprovação.' },
  { id: 13, theme: 'aprovacao', text: 'A sua posse começa a ser conquistada nas pequenas escolhas de hoje.' },
  { id: 14, theme: 'disciplina', text: 'Organização transforma esforço em resultado.' },
  { id: 15, theme: 'constancia', text: 'Não é sobre estudar muito em um dia, é sobre não parar nos outros.' },
  { id: 16, theme: 'persistencia', text: 'Dias difíceis também contam. Eles constroem a sua resistência.' },
  { id: 17, theme: 'superacao', text: 'Cada erro superado é a prova de que você é capaz de aprender qualquer coisa.' },
  { id: 18, theme: 'aprendizado', text: 'Entender por que você errou vale mais do que decorar a resposta certa.' },
  { id: 19, theme: 'evolucao', text: 'Progresso lento ainda é progresso. Continue.' },
  { id: 20, theme: 'preparacao', text: 'A banca cobra o que você revisa. Revise com estratégia.' },
  { id: 21, theme: 'aprovacao', text: 'O seu nome na lista de aprovados está sendo escrito agora, questão por questão.' },
  { id: 22, theme: 'disciplina', text: 'Motivação faz começar; hábito faz chegar.' },
  { id: 23, theme: 'constancia', text: 'Revisar é transformar o que você estudou em algo que você domina.' },
  { id: 24, theme: 'persistencia', text: 'Quem não desiste encontra, mais cedo ou mais tarde, o seu dia de aprovação.' },
  { id: 25, theme: 'superacao', text: 'Seus erros de hoje são os acertos que farão diferença na classificação.' },
  { id: 26, theme: 'aprendizado', text: 'Um erro registrado é um erro que já começou a ser vencido.' },
  { id: 27, theme: 'evolucao', text: 'Olhe para trás e perceba: você já sabe muito mais do que sabia.' },
  { id: 28, theme: 'preparacao', text: 'Preparação de verdade é feita de rotina, revisão e coragem para encarar os erros.' },
  { id: 29, theme: 'aprovacao', text: 'Acredite no processo: a aprovação é consequência de dias bem vividos de estudo.' },
  { id: 30, theme: 'disciplina', text: 'Foco no que depende de você: o seu estudo de hoje.' },
  { id: 31, theme: 'superacao', text: 'Você não está recomeçando do zero, está recomeçando da experiência.' },
  { id: 32, theme: 'constancia', text: 'Pequenas revisões diárias constroem grandes aprovações.' },
  { id: 33, theme: 'persistencia', text: 'Cansar é permitido. Desistir não faz parte do plano.' },
  { id: 34, theme: 'aprendizado', text: 'O caderno de erros é o mapa dos pontos que separam você da aprovação.' },
  { id: 35, theme: 'evolucao', text: 'Cada “superado” no seu caderno é uma vitória silenciosa. Celebre-as.' },
];
