import { StatusBar, TopBar } from './core';
import type { ScreenProps } from './types';

// =====================================================================
// Layout compartilhado das telas legais — só texto, sem CTA
// =====================================================================
type LegalPageProps = ScreenProps & {
  title: string;
  lastUpdate: string;
  children: React.ReactNode;
};

const LegalPage = ({ go, title, lastUpdate, children }: LegalPageProps) => (
  <div className="pg-screen" data-screen-label={`Legal · ${title}`}>
    <StatusBar />
    <TopBar onBack={() => go('landing')} title={title} />
    <div className="pg-page">
      <div className="pg-page-body" style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text)' }}>
        <div className="pg-h-eyebrow">DOCUMENTO LEGAL</div>
        <h1 className="pg-h-title">{title}</h1>
        <p className="pg-h-sub">Última atualização: {lastUpdate}</p>
        {children}
      </div>
    </div>
  </div>
);

// =====================================================================
// PRIVACY POLICY — LGPD compliant pra MVP
// =====================================================================
export const PrivacyPolicy = ({ go }: ScreenProps) => (
  <LegalPage go={go} title="Política de Privacidade" lastUpdate="08/06/2026">
    <h2 style={h2Style}>1. Quem somos</h2>
    <p>
      A PAGORA é um marketplace que conecta clientes a prestadores de frete, guincho e caçamba.
      Operamos no Brasil e seguimos a Lei Geral de Proteção de Dados (LGPD — Lei 13.709/2018).
    </p>

    <h2 style={h2Style}>2. Que dados coletamos</h2>
    <ul style={ulStyle}>
      <li>
        <strong>Lista de espera:</strong> email ou WhatsApp, cidade ou região. Coletamos apenas
        quando você se inscreve voluntariamente.
      </li>
      <li>
        <strong>Cadastro de prestador:</strong> nome, WhatsApp, serviços oferecidos, veículo e
        regiões atendidas. Coletamos para avaliar candidaturas.
      </li>
      <li>
        <strong>Solicitação de orçamento:</strong> endereços de origem/destino, tipo de carga,
        urgência. Coletamos no momento em que você usa o app para gerar orçamentos.
      </li>
      <li>
        <strong>Dados de navegação:</strong> agente do navegador, eventos de uso anonimizados
        (Google Analytics 4, Meta Pixel). Usamos para entender funil e otimizar produto.
      </li>
    </ul>

    <h2 style={h2Style}>3. Como usamos seus dados</h2>
    <ul style={ulStyle}>
      <li>Avisar você quando a PAGORA estiver ativa na sua região;</li>
      <li>Conectar pedidos a prestadores compatíveis com seu CEP/cidade;</li>
      <li>Encaminhar seu pedido ao prestador via WhatsApp (mensagem enviada por você);</li>
      <li>Aprovar (ou não) candidaturas de prestador;</li>
      <li>Medir conversão, sem combinar com dados sensíveis.</li>
    </ul>

    <h2 style={h2Style}>4. Com quem compartilhamos</h2>
    <p>Não vendemos dados. Compartilhamos com terceiros apenas o estritamente necessário:</p>
    <ul style={ulStyle}>
      <li>Supabase (infraestrutura de banco/auth) — armazena os dados acima;</li>
      <li>
        Cloudflare (hospedagem do site) — sem acesso a dados pessoais além do necessário pra
        entregar a página;
      </li>
      <li>Google e Meta (analytics) — recebem eventos pseudonimizados, sem PII direta.</li>
    </ul>

    <h2 style={h2Style}>5. Seus direitos (Art. 18 da LGPD)</h2>
    <p>Você pode, a qualquer momento:</p>
    <ul style={ulStyle}>
      <li>Confirmar quais dados temos sobre você;</li>
      <li>Solicitar acesso, correção ou exclusão dos seus dados;</li>
      <li>Pedir a portabilidade dos dados para outro fornecedor;</li>
      <li>Revogar consentimento e sair da lista de espera.</li>
    </ul>
    <p>
      Para exercer qualquer um desses direitos, escreva pra{' '}
      <a href="mailto:contato@pagora.com.br" style={linkStyle}>
        contato@pagora.com.br
      </a>{' '}
      com o assunto "LGPD". Respondemos em até 15 dias.
    </p>

    <h2 style={h2Style}>6. Retenção</h2>
    <p>
      Mantemos os dados enquanto sua relação com a PAGORA estiver ativa. Após pedido de exclusão,
      apagamos em até 30 dias, exceto quando obrigação legal exigir retenção maior (ex.: nota
      fiscal).
    </p>

    <h2 style={h2Style}>7. Segurança</h2>
    <p>
      Aplicamos Row-Level Security em todas as tabelas. Senhas e tokens são geridos pelo Supabase
      Auth. Sem acesso direto a dados pessoais via dashboard público.
    </p>

    <h2 style={h2Style}>8. Alterações</h2>
    <p>
      Podemos atualizar esta política. A data acima sempre reflete a versão vigente. Mudanças
      relevantes serão comunicadas pelo WhatsApp ou email cadastrado.
    </p>

    <h2 style={h2Style}>9. Contato</h2>
    <p>
      Encarregado de dados (DPO):{' '}
      <a href="mailto:contato@pagora.com.br" style={linkStyle}>
        contato@pagora.com.br
      </a>
    </p>
  </LegalPage>
);

// =====================================================================
// TERMS OF USE
// =====================================================================
export const Terms = ({ go }: ScreenProps) => (
  <LegalPage go={go} title="Termos de Uso" lastUpdate="08/06/2026">
    <h2 style={h2Style}>1. Aceitação</h2>
    <p>
      Ao usar a PAGORA — seja como cliente, prestador ou visitante — você concorda com estes termos.
      Se discordar de qualquer ponto, não use o serviço.
    </p>

    <h2 style={h2Style}>2. O que a PAGORA é</h2>
    <p>
      Uma plataforma de intermediação que conecta clientes a prestadores de serviços de logística
      (frete, guincho, caçamba). <strong>Não somos transportadora.</strong> Não executamos os
      serviços, não emitimos nota fiscal pelo serviço prestado, não temos custódia sobre carga.
    </p>

    <h2 style={h2Style}>3. Como funciona</h2>
    <ul style={ulStyle}>
      <li>Cliente descreve o serviço e recebe propostas;</li>
      <li>Prestador envia orçamento via WhatsApp;</li>
      <li>Cliente e prestador negociam e fecham diretamente;</li>
      <li>Pagamento é direto cliente↔prestador. Hoje a PAGORA não cobra do cliente.</li>
    </ul>

    <h2 style={h2Style}>4. Responsabilidades</h2>
    <p>
      <strong>Cliente</strong> é responsável por descrever a carga corretamente, pagar o prestador
      pelo serviço contratado e cumprir compromissos de horário e local.
    </p>
    <p>
      <strong>Prestador</strong> é responsável pela execução segura do serviço, manutenção regular
      do veículo, cumprimento das obrigações fiscais e trabalhistas, posse das autorizações
      necessárias (CNH compatível, ANTT quando aplicável, alvará de caçamba), e por eventual seguro
      de carga.
    </p>
    <p>
      <strong>PAGORA</strong> é responsável por manter o ambiente de intermediação no ar, tratar
      dados conforme a Política de Privacidade e mediar disputas razoáveis. Não nos
      responsabilizamos por valores, atrasos, danos à carga ou qualquer descumprimento de acordo
      entre cliente e prestador.
    </p>

    <h2 style={h2Style}>5. Condutas proibidas</h2>
    <ul style={ulStyle}>
      <li>Cadastrar dados falsos ou usar identidade de terceiros;</li>
      <li>Aliciar prestadores cadastrados pra plataformas concorrentes;</li>
      <li>Usar a PAGORA pra fins ilícitos (carga ilegal, transporte de pessoas, etc.);</li>
      <li>Ataques automatizados (scraping, DOS, criação massiva de contas).</li>
    </ul>
    <p>Violar essas regras leva à suspensão imediata sem aviso prévio.</p>

    <h2 style={h2Style}>6. Propriedade intelectual</h2>
    <p>
      Marca, logotipo, interface e identidade visual da PAGORA são propriedade exclusiva. Qualquer
      reprodução requer autorização por escrito.
    </p>

    <h2 style={h2Style}>7. Modificações do serviço</h2>
    <p>
      Podemos alterar funcionalidades, preços e regras a qualquer momento. Mudanças significativas
      serão comunicadas com 7 dias de antecedência via canais cadastrados.
    </p>

    <h2 style={h2Style}>8. Foro</h2>
    <p>
      Estes termos seguem a legislação brasileira. Disputas que não resolvermos extrajudicialmente
      vão pra comarca de São Paulo/SP.
    </p>

    <h2 style={h2Style}>9. Contato</h2>
    <p>
      <a href="mailto:contato@pagora.com.br" style={linkStyle}>
        contato@pagora.com.br
      </a>
    </p>
  </LegalPage>
);

// =====================================================================
// Styles
// =====================================================================
const h2Style: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 700,
  marginTop: 24,
  marginBottom: 8,
  color: 'var(--text)',
};
const ulStyle: React.CSSProperties = {
  margin: '8px 0 16px',
  paddingLeft: 18,
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
};
const linkStyle: React.CSSProperties = {
  color: 'var(--green-700)',
  textDecoration: 'underline',
};
