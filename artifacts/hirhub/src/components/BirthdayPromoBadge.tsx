import React from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Cake } from 'lucide-react';
import type { Client } from '@workspace/api-client-react';
import { cn } from '../lib/utils';
import { promoFor, shortDate, usePromoUsedMark } from '../lib/birthdays';

/**
 * The birthday promotion promised in the wishes, shown where the visit is handled,
 * so nobody forgets to apply it (the discount itself is applied on the price, by hand).
 */
export const BirthdayPromoBadge = ({ client, date, className }: { client: Client | undefined; date: string; className?: string }) => {
  const mark = usePromoUsedMark();
  const promo = promoFor(client, date);
  if (!client || !promo) return null;
  const used = !!promo.usedAt;
  return (
    <div
      className={cn(
        'rounded-xl border px-3 py-2.5 flex items-start gap-2.5',
        used ? 'bg-stone-50 border-stone-200' : 'bg-amber-50 border-amber-200',
        className,
      )}
    >
      <Cake className={cn('w-4 h-4 mt-0.5 shrink-0', used ? 'text-stone-400' : 'text-amber-700')} />
      <div className="flex-1 min-w-0 text-sm">
        {used ? (
          <p className="text-stone-600">
            Promo compleanno già usata il {format(new Date(promo.usedAt!), 'd MMMM', { locale: it })}
          </p>
        ) : (
          <>
            <p className="font-semibold text-amber-800">Promo compleanno</p>
            <p className="text-stone-700">{promo.promo} · entro il {shortDate(promo.until)}</p>
          </>
        )}
      </div>
      <button
        type="button"
        disabled={mark.isPending}
        onClick={() => mark.mutate({ data: { clientId: client.id, used: !used } })}
        className="shrink-0 text-sm text-stone-600 hover:text-stone-900 underline underline-offset-2 disabled:opacity-50"
      >
        {used ? 'Annulla' : 'Segna come usata'}
      </button>
    </div>
  );
};
