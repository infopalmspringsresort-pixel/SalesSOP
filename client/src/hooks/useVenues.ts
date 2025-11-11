import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Venue } from "@shared/schema-client";

export function useVenues() {
  const query = useQuery<Venue[]>({
    queryKey: ["/api/rooms/venues"],
  });

  const venues = useMemo(() => {
    const data = query.data || [];
    return data
      .filter((venue) => Boolean(venue?.name))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [query.data]);

  return {
    ...query,
    data: venues,
  };
}

