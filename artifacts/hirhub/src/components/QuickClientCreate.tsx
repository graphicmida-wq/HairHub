import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import type { Client } from "@workspace/api-client-react";
import { ApiError, customFetch, getListClientsQueryKey, useCreateClient } from "@workspace/api-client-react";

import { useIsMobile } from "../hooks/use-mobile";
import { useDebouncedValue } from "../hooks/use-debounced-value";
import { cn } from "../lib/utils";
import { toast } from "./Toast";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "./ui/drawer";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Spinner } from "./ui/spinner";

// Same fetch as the generated hooks: base URL and session cookie included
async function fetchClientByPhone(phone: string, signal?: AbortSignal): Promise<Client | null> {
  const params = new URLSearchParams({ phone });
  try {
    return await customFetch<Client>(`/api/clients/by-phone?${params}`, { signal });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

function clientLabel(c: Client): string {
  return `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim();
}

export function QuickClientCreate({
  open,
  onOpenChange,
  onClientReady,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClientReady: (client: Client) => void;
}) {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();

  const [firstName, setFirstName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [duplicateFromCreate, setDuplicateFromCreate] = React.useState<Client | null>(null);

  React.useEffect(() => {
    if (!open) {
      setFirstName("");
      setPhone("");
      setDuplicateFromCreate(null);
    }
  }, [open]);

  const debouncedPhone = useDebouncedValue(phone, 250);
  const digits = React.useMemo(() => debouncedPhone.replace(/\D+/g, ""), [debouncedPhone]);

  const { data: duplicateFromLookup, isFetching: isCheckingPhone } = useQuery({
    queryKey: ["client-by-phone", digits],
    enabled: open && digits.length >= 6,
    queryFn: ({ signal }) => fetchClientByPhone(debouncedPhone, signal),
    staleTime: 10_000,
  });

  const duplicateClient = duplicateFromCreate ?? duplicateFromLookup ?? null;

  const { mutate: createClient, isPending } = useCreateClient({
    mutation: {
      onSuccess: (created) => {
        queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
        toast.show("Cliente aggiunto");
        onClientReady(created);
        onOpenChange(false);
      },
      onError: (err: unknown) => {
        const data = (err as { data?: unknown })?.data as
          | { message?: string; existingClient?: Client }
          | undefined;
        if (data?.existingClient) {
          setDuplicateFromCreate(data.existingClient);
          return;
        }
        toast.show(data?.message ?? (err as { message?: string })?.message ?? "Errore durante il salvataggio", "error");
      },
    },
  });

  // Only the name is needed: the phone can be added later from the client card
  const canSubmit = firstName.trim() !== "" && !duplicateClient && !isPending;

  const handleSelectDuplicate = () => {
    if (!duplicateClient) return;
    onClientReady(duplicateClient);
    onOpenChange(false);
  };

  const form = (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        // The dialog is portaled, but React still bubbles submit to the parent form (e.g. Nuovo Appuntamento)
        e.stopPropagation();
        createClient({
          data: {
            firstName: firstName.trim(),
            lastName: "",
            phone: phone.trim(),
            email: "",
            dob: null,
            notes: null,
            allergies: null,
            hairSpecs: null,
          },
        });
      }}
      className="flex flex-col gap-4"
    >
      <div className="grid gap-2">
        <Label htmlFor="quick-client-firstName">Nome</Label>
        <Input
          id="quick-client-firstName"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          required
          autoComplete="given-name"
        />
      </div>
      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="quick-client-phone">Telefono <span className="font-normal text-muted-foreground">(facoltativo)</span></Label>
          {isCheckingPhone ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Spinner className="h-3 w-3" />
              <span>Verifica…</span>
            </div>
          ) : null}
        </div>
        <Input
          id="quick-client-phone"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value);
            setDuplicateFromCreate(null);
          }}
          inputMode="tel"
          autoComplete="tel"
        />
      </div>

      {duplicateClient ? (
        <Alert className="border-amber-200 bg-amber-50 text-amber-900">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Numero già presente</AlertTitle>
          <AlertDescription>
            <div className="flex items-center justify-between gap-3">
              <span className="truncate">{clientLabel(duplicateClient)}</span>
              <Button type="button" variant="outline" onClick={handleSelectDuplicate}>
                Seleziona
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className={cn(isMobile ? "" : "pt-2")}> 
        <Button type="submit" className="w-full" disabled={!canSubmit}>
          {isPending ? "Salvataggio…" : "Crea e seleziona"}
        </Button>
      </div>
    </form>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Nuovo cliente</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-4">{form}</div>
          <DrawerFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annulla
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuovo cliente</DialogTitle>
        </DialogHeader>
        {form}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
