import { useMemo } from 'react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { getListStockMovementsQueryKey, useListAppointments, useListServices, useListStockMovements } from '@workspace/api-client-react';
import { counterRevenueOf, productsRevenueOf, servicesRevenueOf } from './useStats';

export const TREND_MONTHS = 6;

/**
 * Month by month values behind the Dashboard figures, drawn as mini-charts in
 * the Premium look: the last six months, the current one (still running) last.
 * Same rules as useStats. The stock movements of the period are only fetched
 * when `enabled`, so the classic look loads nothing more.
 */
export function useKpiTrends(enabled: boolean) {
  const { data: appointments = [] } = useListAppointments();
  const { data: services = [] } = useListServices();
  const params = {
    from: format(startOfMonth(subMonths(new Date(), TREND_MONTHS - 1)), 'yyyy-MM-dd'),
    to: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  };
  const { data: movements = [] } = useListStockMovements(params, {
    query: { queryKey: getListStockMovementsQueryKey(params), enabled },
  });

  return useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: TREND_MONTHS }, (_, i) => {
      const d = subMonths(now, TREND_MONTHS - 1 - i);
      return { start: format(startOfMonth(d), 'yyyy-MM-dd'), end: format(endOfMonth(d), 'yyyy-MM-dd') };
    });

    const firstVisit: Record<string, string> = {};
    appointments.forEach(a => {
      const prev = firstVisit[a.clientId];
      if (!prev || a.date < prev) firstVisit[a.clientId] = a.date;
    });
    const firstVisits = Object.values(firstVisit);

    const revenue: number[] = [];
    const count: number[] = [];
    const noShowRate: number[] = [];
    const newClients: number[] = [];
    for (const { start, end } of months) {
      const inMonth = (date: string) => date >= start && date <= end;
      const appts = appointments.filter(a => inMonth(a.date) && a.status !== 'annullato');
      const completed = appts.filter(a => a.status === 'completato');
      const sales = movements.filter(m => m.reason === 'vendita' && inMonth(m.date));
      revenue.push(
        completed.reduce((sum, a) => sum + servicesRevenueOf(a, services) + productsRevenueOf(a), 0)
        + counterRevenueOf(sales),
      );
      count.push(appts.length);
      const noShows = appts.filter(a => a.status === 'no-show').length;
      noShowRate.push(appts.length === 0 ? 0 : (noShows / appts.length) * 100);
      newClients.push(firstVisits.filter(inMonth).length);
    }
    return { revenue, count, noShowRate, newClients };
  }, [appointments, services, movements]);
}
