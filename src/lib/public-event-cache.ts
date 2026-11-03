export type PublicEvent = {
  title: string;
  date: string;
  time: string;
  location: string;
  category: string;
  price: string;
  amount: number;
  image: string;
};

type EventDetailResponse = { event?: unknown | null };

const detailRequests = new Map<string, Promise<EventDetailResponse>>();

export function getEventDetailCacheKey(slug: string) {
  return `ticketia:event:${slug}`;
}

export function prefetchPublicEvent(slug: string) {
  if (typeof window === "undefined") return;
  const key = getEventDetailCacheKey(slug);
  if (sessionStorage.getItem(key)) return;
  const existingRequest = detailRequests.get(slug);
  if (existingRequest) return;
  const request = fetch(`/api/public-events/${encodeURIComponent(slug)}`)
    .then(async (response) => {
      if (!response.ok) throw new Error("Unable to prefetch event.");
      const result = await response.json() as EventDetailResponse;
      sessionStorage.setItem(key, JSON.stringify(result));
      return result;
    })
    .finally(() => detailRequests.delete(slug));
  detailRequests.set(slug, request);
}
