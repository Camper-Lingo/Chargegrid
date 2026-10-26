
import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

import {
  BadgeDollarSign,
  CheckCircle2,
  Clock3,
  CreditCard,
  QrCode,
  RefreshCw,
  XCircle,
  Wallet,
  Gift,
  Coins,
  ArrowDownToLine,
} from 'lucide-react';

import {
  getFinance,
  type FinanceData,
} from '../services/api';

export default function Finance() {
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadFinance = useCallback(async (manual = false) => {
    try {
      if (manual) setRefreshing(true);

      const response = await getFinance();

      setData(response);
      setError('');
    } catch (err) {
      console.error('Erro ao carregar financeiro:', err);

      setError(
        err instanceof Error
          ? err.message
          : 'Erro ao carregar dados financeiros.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadFinance();

    const interval = window.setInterval(() => {
      void loadFinance();
    }, 10000);

    return () => window.clearInterval(interval);
  }, [loadFinance]);

  const formatMoney = (value: number) =>
    Number(value).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });

  const formatDate = (value: string | null) => {
    if (!value) return '—';

    return new Date(value).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading && !data) {
    return (
      <div className="placeholder-card">
        Carregando dados financeiros...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="finance-error">
        {error || 'Dados financeiros indisponíveis.'}

        <button
          type="button"
          onClick={() => void loadFinance(true)}
          disabled={refreshing}
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  const pix = data.methods.find(
    (item) => item.method === 'pix'
  );

  const card = data.methods.find(
    (item) => item.method === 'card'
  );

  const wallet = data.methods.find(
    (item) => item.method === 'wallet'
  );

  const walletData = data.wallet;

  const bonusDistributed = walletData
    ? walletData.total_topup_bonus + walletData.total_cashback
    : 0;

  return (
    <>
      {/* CABEÇALHO */}
      <div className="page-header">
        <div>
          <h1>Financeiro</h1>

          <p>
            Receitas, pagamentos e movimentações do Cartão Grid.
          </p>
        </div>

        <button
          className="finance-refresh"
          onClick={() => void loadFinance(true)}
          disabled={refreshing}
        >
          <RefreshCw
            size={17}
            className={refreshing ? 'spin' : ''}
          />

          {refreshing ? 'Atualizando...' : 'Atualizar'}
        </button>
      </div>

      {error && (
        <div className="finance-error">
          {error}
        </div>
      )}

      {/* INDICADORES PRINCIPAIS */}
      <div className="finance-kpis">
        <FinanceCard
          icon={<BadgeDollarSign size={22} />}
          label="Receita de carregamentos"
          value={formatMoney(data.summary.total_revenue)}
          description="PIX + cartão + Cartão Grid"
        />

        <FinanceCard
          icon={<CheckCircle2 size={22} />}
          label="Pagamentos aprovados"
          value={String(data.summary.approved_payments)}
          description="Carregamentos pagos"
        />

        <FinanceCard
          icon={<Clock3 size={22} />}
          label="Pendentes"
          value={String(data.summary.pending_payments)}
          description="Aguardando confirmação"
        />

        <FinanceCard
          icon={<XCircle size={22} />}
          label="Falhos"
          value={String(data.summary.failed_payments)}
          description="Transações não aprovadas"
        />
      </div>

      {/* RECEITA POR MÉTODO */}
      <div className="finance-transactions-header">
        <div>
          <h2>Receita por método de pagamento</h2>
          <p>
            Somente carregamentos com pagamento aprovado.
          </p>
        </div>
      </div>

      <div className="finance-grid">
        <div className="finance-section">
          <div className="finance-section-header">
            <div>
              <h2>PIX</h2>
              <p>Pagamentos de carregamentos via PIX</p>
            </div>

            <div className="finance-method-icon">
              <QrCode size={22} />
            </div>
          </div>

          <div className="finance-method-value">
            {formatMoney(pix?.revenue ?? 0)}
          </div>

          <div className="finance-method-footer">
            <span>Transações aprovadas</span>
            <strong>{pix?.payments ?? 0}</strong>
          </div>
        </div>

        <div className="finance-section">
          <div className="finance-section-header">
            <div>
              <h2>Cartão</h2>
              <p>Pagamentos de carregamentos via cartão</p>
            </div>

            <div className="finance-method-icon">
              <CreditCard size={22} />
            </div>
          </div>

          <div className="finance-method-value">
            {formatMoney(card?.revenue ?? 0)}
          </div>

          <div className="finance-method-footer">
            <span>Transações aprovadas</span>
            <strong>{card?.payments ?? 0}</strong>
          </div>
        </div>

        <div className="finance-section">
          <div className="finance-section-header">
            <div>
              <h2>Cartão Grid</h2>
              <p>Carregamentos pagos com saldo da carteira</p>
            </div>

            <div className="finance-method-icon">
              <Wallet size={22} />
            </div>
          </div>

          <div className="finance-method-value">
            {formatMoney(wallet?.revenue ?? 0)}
          </div>

          <div className="finance-method-footer">
            <span>Transações aprovadas</span>
            <strong>{wallet?.payments ?? 0}</strong>
          </div>
        </div>
      </div>

      {/* INDICADORES DA CARTEIRA */}
      <div className="finance-transactions-header">
        <div>
          <h2>Gestão do Cartão Grid</h2>

          <p>
            Depósitos antecipados, créditos promocionais e saldos.
            Esses valores não são somados à receita acima.
          </p>
        </div>
      </div>

      {walletData ? (
        <>
          <div className="finance-kpis">
            <FinanceCard
              icon={<ArrowDownToLine size={22} />}
              label="Depósitos na carteira"
              value={formatMoney(walletData.total_topups)}
              description="Dinheiro antecipado pelos clientes"
            />

            <FinanceCard
              icon={<Gift size={22} />}
              label="Bônus de recarga"
              value={formatMoney(walletData.total_topup_bonus)}
              description="Créditos promocionais concedidos"
            />

            <FinanceCard
              icon={<Coins size={22} />}
              label="GridBack distribuído"
              value={formatMoney(walletData.total_cashback)}
              description="Cashback concedido após pagamentos"
            />

            <FinanceCard
              icon={<Wallet size={22} />}
              label="Total de bônus concedidos"
              value={formatMoney(bonusDistributed)}
              description="Bônus de recarga + GridBack"
            />
          </div>

          <div className="finance-grid">
            <div className="finance-section">
              <div className="finance-section-header">
                <div>
                  <h2>Saldo pago estimado</h2>
                  <p>
                    Depósitos menos os débitos registrados
                    na carteira paga.
                  </p>
                </div>

                <div className="finance-method-icon">
                  <Wallet size={22} />
                </div>
              </div>

              <div className="finance-method-value">
                {formatMoney(walletData.paid_balance)}
              </div>

              <div className="finance-method-footer">
                <span>Calculado pelo histórico de lançamentos</span>
              </div>
            </div>

            <div className="finance-section">
              <div className="finance-section-header">
                <div>
                  <h2>Saldo bônus válido</h2>
                  <p>
                    Créditos promocionais não expirados
                    e ainda disponíveis.
                  </p>
                </div>

                <div className="finance-method-icon">
                  <Gift size={22} />
                </div>
              </div>

              <div className="finance-method-value">
                {formatMoney(walletData.bonus_balance)}
              </div>

              <div className="finance-method-footer">
                <span>Considera validade dos bônus</span>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="finance-error">
          Os indicadores da carteira ainda não foram
          disponibilizados pela API financeira.
        </div>
      )}

      {/* HISTÓRICO DOS PAGAMENTOS */}
      <div className="finance-transactions">
        <div className="finance-transactions-header">
          <div>
            <h2>Últimos pagamentos</h2>

            <p>
              Carregamentos pagos por PIX, cartão ou Cartão Grid.
            </p>
          </div>
        </div>

        {data.recent_payments.length === 0 ? (
          <div className="finance-empty">
            Nenhum pagamento registrado.
          </div>
        ) : (
          <div className="finance-table-wrapper">
            <table className="finance-table">
              <thead>
                <tr>
                  <th>Pagamento</th>
                  <th>Sessão</th>
                  <th>Cliente</th>
                  <th>Método</th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th>Data</th>
                </tr>
              </thead>

              <tbody>
                {data.recent_payments.map((payment) => (
                  <tr key={payment.id}>
                    <td>#{payment.id}</td>

                    <td>#{payment.session_id}</td>

                    <td>#{payment.customer_id}</td>

                    <td>
                      <div className="finance-payment-method">
                        {payment.payment_method === 'pix' ? (
                          <QrCode size={16} />
                        ) : payment.payment_method === 'wallet' ? (
                          <Wallet size={16} />
                        ) : (
                          <CreditCard size={16} />
                        )}

                        {payment.payment_method === 'pix'
                          ? 'PIX'
                          : payment.payment_method === 'wallet'
                            ? 'Cartão Grid'
                            : 'Cartão'}
                      </div>
                    </td>

                    <td className="finance-value">
                      {formatMoney(payment.amount)}
                    </td>

                    <td>
                      <span
                        className={`finance-status ${payment.status}`}
                      >
                        {payment.status === 'approved'
                          ? 'Aprovado'
                          : payment.status === 'pending'
                            ? 'Pendente'
                            : 'Falhou'}
                      </span>
                    </td>

                    <td>
                      {formatDate(
                        payment.paid_at ?? payment.created_at
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

interface FinanceCardProps {
  icon: ReactNode;
  label: string;
  value: string;
  description: string;
}

function FinanceCard({
  icon,
  label,
  value,
  description,
}: FinanceCardProps) {
  return (
    <div className="finance-card">
      <div className="finance-card-top">
        <div className="finance-card-icon">
          {icon}
        </div>

        <span>{label}</span>
      </div>

      <strong>{value}</strong>
      <p>{description}</p>
    </div>
  );
}
