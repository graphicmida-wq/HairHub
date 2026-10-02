import { useMemo } from 'react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { getListStockMovementsQueryKey, useListAppointments, useListClients, useListProducts, useListServices, useListStockMovements } from '@workspace/api-client-react';
import { toPackages } from './stock';
import { addMinsToTime } from './utils';

export function useStats() {
  const { data: appointments = [], isLoading: loadingAppts, isError: errorAppts } = useListAppointments();
  const { data: clients = [], isLoading: loadingClients, isError: errorClients } = useListClients();
  const { data: services = [], isLoading: loadingServices, isError: errorServices } = useListServices();
  const { data: products = [], isLoading: loadingProducts, isError: errorProducts } = useListProducts();
  // This month's stock movements: product sales (also over the counter) and service usage
  const monthParams = {
    from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    to: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  };
  const { data: monthMovements = [] } = useListStockMovements(monthParams, {
    query: { queryKey: getListStockMovementsQueryKey(monthParams) },
  });

  const isLoading = loadingAppts || loadingClients || loadingServices || loadingProducts;
  const isError = errorAppts || errorClients || errorServices || errorProducts;

  const stats = useMemo(() => {
    const now = new Date();
    const today = format(now, 'yyyy-MM-dd');

    const thisMonthStart = format(startOfMonth(now), 'yyyy-MM-dd');
    const thisMonthEnd = format(endOfMonth(now), 'yyyy-MM-dd');
    const prevMonthStart = format(startOfMonth(subMonths(now, 1)), 'yyyy-MM-dd');
    const prevMonthEnd = format(endOfMonth(subMonths(now, 1)), 'yyyy-MM-dd');

    const inRange = (date: string, start: string, end: string) =>
      date >= start && date <= end;

    const thisMonthAppts = appointments.filter(
      a => inRange(a.date, thisMonthStart, thisMonthEnd) && a.status !== 'annullato'
    );

    const prevMonthAppts = appointments.filter(
      a => inRange(a.date, prevMonthStart, prevMonthEnd) && a.status !== 'annullato'
    );

    const completedThisMonth = thisMonthAppts.filter(a => a.status === 'completato');
    const monthSales = monthMovements.filter(m => m.reason === 'vendita');

    // Revenue of the month = services of completed appointments
    //   + products sold during those appointments + over-the-counter sales
    const servicesRevenue = completedThisMonth.reduce((sum, a) =>
      sum + (a.serviceIds ?? []).reduce((s2, sid, i) => {
        const v = a.servicePrices?.[i];
        if (typeof v === 'number' && Number.isFinite(v)) return s2 + v;
        return s2 + (services.find(s => s.id === sid)?.price ?? 0);
      }, 0), 0);
    const appointmentProductsRevenue = completedThisMonth.reduce((sum, a) =>
      sum + (a.soldProducts ?? []).reduce((s3, sp) => s3 + sp.quantity * sp.unitPrice, 0), 0);
    // Appointment sales are already counted with their appointment; cancelled sales net to zero
    const counterRevenue = monthSales
      .filter(m => m.appointmentId == null)
      .reduce((sum, m) => sum - m.quantity * (m.unitPrice ?? 0), 0);
    const fatturato = servicesRevenue + appointmentProductsRevenue + counterRevenue;

    const thisMonthCount = thisMonthAppts.length;
    const prevMonthCount = prevMonthAppts.length;
    const monthGrowthPct =
      prevMonthCount === 0
        ? null
        : Math.round(((thisMonthCount - prevMonthCount) / prevMonthCount) * 100);

    const noShowCount = thisMonthAppts.filter(a => a.status === 'no-show').length;
    const noShowRate =
      thisMonthCount === 0 ? 0 : Math.round((noShowCount / thisMonthCount) * 100);

    const firstAppointmentByClient: Record<string, string> = {};
    appointments.forEach(a => {
      const prev = firstAppointmentByClient[a.clientId];
      if (!prev || a.date < prev) {
        firstAppointmentByClient[a.clientId] = a.date;
      }
    });
    const newClientsThisMonth = Object.values(firstAppointmentByClient).filter(
      date => inRange(date, thisMonthStart, thisMonthEnd)
    ).length;

    const serviceCount: Record<string, number> = {};
    thisMonthAppts.forEach(a => {
      (a.serviceIds ?? []).forEach(sid => {
        serviceCount[sid] = (serviceCount[sid] ?? 0) + 1;
      });
    });
    const topServices = Object.entries(serviceCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([serviceId, count]) => ({
        service: services.find(s => s.id === serviceId),
        count,
      }))
      .filter(entry => entry.service !== undefined);
    const maxServiceCount = topServices[0]?.count ?? 1;

    const todaysAppointments = appointments
      .filter(a => a.date === today && a.status !== 'annullato')
      .sort((a, b) => a.time.localeCompare(b.time));

    // "Prossimi appuntamenti": what is left of today (running or still to come);
    // once today is over, the next day that has bookings
    const nowTime = format(now, 'HH:mm');
    const byTime = (a: { time: string }, b: { time: string }) => a.time.localeCompare(b.time);
    const booked = appointments.filter(a => a.status === 'prenotato');
    const restOfToday = booked
      .filter(a => a.date === today && addMinsToTime(a.time, a.durationMins) > nowTime)
      .sort(byTime);
    const nextDate = restOfToday.length > 0
      ? today
      : booked.map(a => a.date).filter(d => d > today).sort()[0];
    const upcoming = nextDate
      ? {
          dateStr: nextDate,
          appts: nextDate === today ? restOfToday : booked.filter(a => a.date === nextDate).sort(byTime),
          nowTime,
        }
      : null;

    const lowStockProducts = products.filter(p => p.quantity <= p.minThreshold);

    // "Vendite del mese" (sale movements are net of cancellations and corrections)
    const soldByProduct = new Map<string, { productId: string; name: string; brand: string; quantity: number }>();
    let soldPieces = 0;
    let productRevenue = 0;
    for (const m of monthSales) {
      soldPieces -= m.quantity;
      productRevenue -= m.quantity * (m.unitPrice ?? 0);
      const entry = soldByProduct.get(m.productId) ?? {
        productId: m.productId,
        name: products.find(p => p.id === m.productId)?.name ?? m.productName,
        brand: products.find(p => p.id === m.productId)?.brand ?? m.productBrand,
        quantity: 0,
      };
      entry.quantity -= m.quantity;
      soldByProduct.set(m.productId, entry);
    }
    const usedPackages = monthMovements
      .filter(m => m.reason === 'uso_servizio')
      .reduce((sum, m) => sum + (toPackages(-m.quantity, m.unit, products.find(p => p.id === m.productId)) ?? 0), 0);
    const topSold = [...soldByProduct.values()]
      .filter(p => p.quantity > 0.005)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 3);
    const salesOfMonth = { soldPieces, productRevenue, usedPackages, topSold };

    return {
      today,
      fatturato,
      fatturatoParts: { servicesRevenue, appointmentProductsRevenue, counterRevenue },
      thisMonthCount,
      prevMonthCount,
      monthGrowthPct,
      noShowRate,
      newClientsThisMonth,
      topServices,
      maxServiceCount,
      todaysAppointments,
      upcoming,
      lowStockProducts,
      salesOfMonth,
    };
  }, [appointments, clients, services, products, monthMovements]);

  return {
    isLoading,
    isError: !!isError,
    appointments,
    clients,
    services,
    products,
    ...stats,
  };
}
