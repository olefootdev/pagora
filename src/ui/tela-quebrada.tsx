// =====================================================================
// PAGORA — Quando uma tela não carrega
// =====================================================================
// Descoberto testando o app offline: navegar para uma tela cujo módulo ainda
// não tinha sido baixado deixava a página **inteiramente em branco**. Sem
// mensagem, sem barra, sem saída — a pessoa só vê branco e fecha o app.
//
// E não é problema só de offline. Toda tela é `lazy`, então basta o download
// de um pedaço falhar para o mesmo branco aparecer:
//
//   - 3G que cai no meio do carregamento;
//   - deploy novo enquanto a aba está aberta — os arquivos têm hash no nome,
//     e o hash antigo deixa de existir no servidor.
//
// O React só interrompe a subárvore quebrada se houver um limite de erro no
// caminho. Não havia nenhum no app inteiro.
// =====================================================================

import { Component, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
  /** Muda quando a rota muda: erro de uma tela não pode contaminar a próxima. */
  chave: string;
};

type State = { erro: Error | null };

export class LimiteDeErro extends Component<Props, State> {
  override state: State = { erro: null };

  static getDerivedStateFromError(erro: Error): State {
    return { erro };
  }

  override componentDidUpdate(anterior: Props): void {
    // Trocou de rota: a tela nova merece uma chance, mesmo que a anterior
    // tenha quebrado.
    if (anterior.chave !== this.props.chave && this.state.erro) {
      this.setState({ erro: null });
    }
  }

  override render(): ReactNode {
    const { erro } = this.state;
    if (!erro) return this.props.children;

    // "Failed to fetch dynamically imported module" é o erro de pedaço que
    // não baixou. Recarregar resolve quando há rede — e quando não há, pelo
    // menos a pessoa entende o que aconteceu em vez de encarar o branco.
    const ehModulo = /dynamically imported|importing a module|Failed to fetch/i.test(erro.message);

    return (
      <div className="px-quebrada" role="alert">
        <h1 className="px-quebrada-t">
          {ehModulo ? 'Esta tela não carregou' : 'Algo deu errado aqui'}
        </h1>
        <p className="px-quebrada-s">
          {ehModulo
            ? 'Parece que a conexão falhou no meio do caminho. Com sinal de volta, recarregar resolve.'
            : 'O resto do app continua funcionando. Recarregar costuma resolver.'}
        </p>
        <div className="px-quebrada-acoes">
          <button className="px-btn px-btn--primary" onClick={() => window.location.reload()}>
            Recarregar
          </button>
          <button
            className="px-btn px-btn--outline"
            onClick={() => {
              window.location.hash = '#/inicio';
              window.location.reload();
            }}
          >
            Ir para o início
          </button>
        </div>
      </div>
    );
  }
}
