import { useMemo } from 'react';
import { format, startOfMonth, endOfMonth, subMonths, addDays } from 'date-fns';
import { useListAppointments, useListClients, useListProducts, useListServices } from '@workspace/api-client-react';

export function useStats() {
  const { data: appointments = [], isLoading: loadingAppts, isError } = useListAppointments();
  const { data: clients = [], isLoading: loadingClients } = useListClients();
  const { data: services = [], isLoading: loadingServices } = useListServices();
  const { data: products = [], isLoading: loadingProducts } = useListProducts();

  const isLoading = loadingAppts || loadingClients || loadingServices || loadingProducts;

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

    const fatturato = completedThisMonth.reduce((sum, a) => {
      const svc = services.find(s => s.id === a.serviceId);
      return sum + (svc?.price ?? 0);
    }, 0);

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
      serviceCount[a.serviceId] = (serviceCount[a.serviceId] ?? 0) + 1;
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

    const upcomingByDay = Array.from({ length: 5 }, (_, i) => {
      const dateStr = format(addDays(now, i), 'yyyy-MM-dd');
      return {
        dateStr,
        appts: appointments
          .filter(a => a.date === dateStr && a.status !== 'annullato')
          .sort((a, b) => a.time.localeCompare(b.time)),
      };
    }).filter(d => d.appts.length > 0);

    const lowStockProducts = products.filter(p => p.quantity <= p.minThreshold);

    return {
      today,
      fatturato,
      thisMonthCount,
      prevMonthCount,
      monthGrowthPct,
      noShowRate,
      newClientsThisMonth,
      topServices,
      maxServiceCount,
      todaysAppointments,
      upcomingByDay,
      lowStockProducts,
    };
  }, [appointments, clients, services, products]);

  return {
    isLoading,
    isError,
    appointments,
    clients,
    services,
    products,
    ...stats,
  };
}
