
export type SeasonalEventInput = {
  id: number;
  title: string;
  description: string | null;
  eventType: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
};

export type SeasonalEventResult = {
  id: number;
  title: string;
  description: string | null;
  eventType: string;
  startDate: string;
  endDate: string;
  daysUntilStart: number;
  isOngoing: boolean;
  impactStatus: "UPCOMING" | "ONGOING" | "ENDED";
};

function startOfDay(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
}

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function calculateSeasonalEvents(
  events: SeasonalEventInput[],
  referenceDate = new Date()
): SeasonalEventResult[] {
  const today = startOfDay(referenceDate);

  return events
    .filter((event) => event.isActive)
    .map((event) => {
      const start = startOfDay(new Date(event.startDate));
      const end = startOfDay(new Date(event.endDate));

      const daysUntilStart = Math.ceil(
        (start.getTime() - today.getTime()) /
          (1000 * 60 * 60 * 24)
      );

      const isOngoing =
        today >= start && today <= end;

      let impactStatus: SeasonalEventResult["impactStatus"];

      if (isOngoing) {
        impactStatus = "ONGOING";
      } else if (today < start) {
        impactStatus = "UPCOMING";
      } else {
        impactStatus = "ENDED";
      }

      return {
        id: event.id,
        title: event.title,
        description: event.description,
        eventType: event.eventType,
        startDate: formatDate(start),
        endDate: formatDate(end),
        daysUntilStart,
        isOngoing,
        impactStatus,
      };
    })
    .filter((event) => event.impactStatus !== "ENDED")
    .sort((a, b) => a.daysUntilStart - b.daysUntilStart);
}
