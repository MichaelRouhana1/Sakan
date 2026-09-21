import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  CheckCircle2,
  Clock3,
  Copy,
  ExternalLink,
  Mail,
  MessageCircle,
  RefreshCw,
  Search,
  UserRound,
  Wrench,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { H } from "../h";
import { NeuButton, NeuSurface } from "../NeuPrimitives";
import { listExpiryFollowups, markExpiryFollowupContacted } from "./followupSource";
import {
  hostName,
  queueLabel,
  whatsappContact,
  type ExpiryFollowup,
  type FollowupQueue,
} from "./followupTypes";

const QUEUES: FollowupQueue[] = ["all", "awaiting_host", "renewal_stalled", "resolved"];

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function cleanPhone(value: string) {
  return value.replace(/[^0-9]/g, "");
}

function queueIcon(queue: ExpiryFollowup["queue"]) {
  if (queue === "resolved") return CheckCircle2;
  if (queue === "renewal_stalled") return Wrench;
  return Clock3;
}

export function ExpiredPage() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const router = useRouter();
  const client = useQueryClient();
  const [queue, setQueue] = useState<FollowupQueue>("all");
  const [query, setQuery] = useState("");
  const [flash, setFlash] = useState<string | null>(null);
  const deepId = firstParam(params.id);
  const followups = useQuery({
    queryKey: ["admin", "expiry-followups"],
    queryFn: listExpiryFollowups,
  });
  const contacted = useMutation({
    mutationFn: markExpiryFollowupContacted,
    onSuccess: async () => {
      setFlash("Follow-up marked as contacted.");
      await client.invalidateQueries({ queryKey: ["admin", "expiry-followups"] });
    },
  });

  const rows = followups.data ?? [];
  const counts = useMemo(
    () =>
      Object.fromEntries(
        QUEUES.map((value) => [
          value,
          value === "all" ? rows.length : rows.filter((row) => row.queue === value).length,
        ]),
      ) as Record<FollowupQueue, number>,
    [rows],
  );
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (queue !== "all" && row.queue !== queue) return false;
      if (!needle) return true;
      return [row.title, row.area, row.listingId, hostName(row), row.email]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
    });
  }, [queue, query, rows]);

  async function copy(value: string, message: string) {
    await Clipboard.setStringAsync(value);
    setFlash(message);
  }

  function openWhatsApp(row: ExpiryFollowup) {
    const number = whatsappContact(row);
    if (!number || typeof window === "undefined") return;
    window.open(`https://wa.me/${cleanPhone(number)}`, "_blank", "noopener,noreferrer");
  }

  return (
    <H className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      <H className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <H>
          <H as="p" className="font-display text-[11px] font-semibold uppercase tracking-[0.22em] text-moss">
            Manual host outreach
          </H>
          <H as="h1" className="mt-1 font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Expiry follow-up
          </H>
          <H as="p" className="mt-2 max-w-2xl text-sm leading-relaxed text-clay-700">
            Review silent hosts and stalled renewals. Contact happens personally from a staff number; this queue never sends a WhatsApp message.
          </H>
        </H>
        <NeuButton tone="moss" onClick={() => void followups.refetch()} disabled={followups.isFetching}>
          <RefreshCw size={15} /> {followups.isFetching ? "Refreshing…" : "Refresh"}
        </NeuButton>
      </H>

      <H className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {QUEUES.map((value) => (
          <H
            as="button"
            type="button"
            key={value}
            onClick={() => setQueue(value)}
            className={`cursor-pointer rounded-neu bg-clay-100 p-4 text-left transition-shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-moss ${queue === value ? "shadow-neu-in" : "shadow-neu-sm"}`}
          >
            <H as="span" className="block text-2xl font-semibold text-clay-900">{counts[value]}</H>
            <H as="span" className="mt-1 block text-xs font-medium text-clay-700">{queueLabel(value)}</H>
          </H>
        ))}
      </H>

      <NeuSurface inset className="flex items-center gap-3 px-4 py-3">
        <Search size={17} className="text-clay-700" />
        <H
          as="input"
          value={query}
          onChange={(event: { target: { value: string } }) => setQuery(event.target.value)}
          placeholder="Search listing, host, area, or ID"
          aria-label="Search expiry follow-ups"
          className="min-w-0 flex-1 bg-transparent text-sm text-clay-900 outline-none placeholder:text-clay-500"
        />
      </NeuSurface>

      {flash ? <H as="p" role="status" className="rounded-neu-md bg-clay-100 px-4 py-2.5 text-sm text-moss shadow-neu-in-sm">{flash}</H> : null}

      {followups.isLoading ? <NeuSurface inset className="px-6 py-16 text-center text-sm text-clay-700">Loading follow-ups…</NeuSurface> : null}
      {followups.isError ? (
        <NeuSurface inset className="px-6 py-16 text-center">
          <H as="p" className="font-display text-lg font-semibold">Could not load the follow-up queue</H>
          <H as="p" className="mt-2 text-sm text-clay-700">Check the API connection, then try again.</H>
        </NeuSurface>
      ) : null}
      {!followups.isLoading && !followups.isError && visible.length === 0 ? (
        <NeuSurface inset className="px-6 py-16 text-center text-sm text-clay-700">No follow-ups in this view.</NeuSurface>
      ) : null}

      <H className="grid gap-4 xl:grid-cols-2">
        {visible.map((row) => {
          const Icon = queueIcon(row.queue);
          const phone = whatsappContact(row);
          const highlighted = deepId === row.listingId;
          return (
            <NeuSurface key={`${row.listingId}-${row.cycleExpiresAt}`} className={`overflow-hidden ${highlighted ? "outline outline-2 outline-moss" : ""}`}>
              <H className="flex flex-col gap-4 p-5 sm:flex-row">
                <H className="h-24 w-full shrink-0 overflow-hidden rounded-neu-md bg-clay-200 shadow-neu-in-sm sm:w-32">
                  {row.coverUrl ? <H as="img" src={row.coverUrl} alt="" className="h-full w-full object-cover" /> : null}
                </H>
                <H className="min-w-0 flex-1">
                  <H className="flex items-start justify-between gap-3">
                    <H>
                      <H as="p" className="truncate font-display text-lg font-semibold text-clay-900">{row.title}</H>
                      <H as="p" className="mt-1 text-xs text-clay-700">{row.area} · ${row.monthlyRentUsd}/month</H>
                    </H>
                    <H className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-clay-100 px-2.5 py-1 text-[11px] font-semibold text-moss shadow-neu-in-sm">
                      <Icon size={13} /> {queueLabel(row.queue)}
                    </H>
                  </H>
                  <H className="mt-4 grid gap-2 text-sm text-clay-700 sm:grid-cols-2">
                    <H className="flex items-center gap-2"><UserRound size={14} /> {hostName(row)}</H>
                    <H className="flex items-center gap-2"><Mail size={14} /> {row.email || "No email"}</H>
                    <H>Expired {formatDate(row.cycleExpiresAt)}</H>
                    <H>Escalated {formatDate(row.escalatedAt)}</H>
                  </H>
                </H>
              </H>

              <H className="border-t border-clay-300/60 px-5 py-4">
                <H as="p" className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-clay-600">Delivery history</H>
                <H className="flex flex-wrap gap-2">
                  {row.deliveryHistory.map((delivery, index) => (
                    <H key={`${delivery.kind}-${delivery.channel}-${index}`} className="rounded-full bg-clay-100 px-2.5 py-1 text-[11px] text-clay-700 shadow-neu-in-sm" title={delivery.error || undefined}>
                      {delivery.channel} · {delivery.kind.replaceAll("_", " ")} · {delivery.status}
                    </H>
                  ))}
                </H>
              </H>

              <H className="flex flex-wrap items-center gap-2 border-t border-clay-300/60 px-5 py-4">
                {phone ? (
                  <>
                    <NeuButton tone="moss" onClick={() => openWhatsApp(row)}><MessageCircle size={15} /> Open WhatsApp</NeuButton>
                    <NeuButton onClick={() => void copy(phone, "Contact number copied.")}><Copy size={15} /> Copy number</NeuButton>
                  </>
                ) : null}
                <NeuButton onClick={() => void copy(row.listingId, "Listing ID copied.")}><Copy size={15} /> Copy ID</NeuButton>
                <NeuButton onClick={() => router.push(`/admin/listings?id=${row.listingId}` as never)}><ExternalLink size={15} /> Listing</NeuButton>
                {!row.contacted ? (
                  <NeuButton tone="moss" disabled={contacted.isPending} onClick={() => void contacted.mutateAsync(row)}>
                    <CheckCircle2 size={15} /> Mark contacted
                  </NeuButton>
                ) : <H as="span" className="text-xs font-semibold text-moss">Contacted</H>}
              </H>
            </NeuSurface>
          );
        })}
      </H>
    </H>
  );
}
