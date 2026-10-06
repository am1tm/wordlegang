import { handler, HttpError, requirePlayer } from "@/lib/auth";
import { everyonePlayed, loadGroup, resultFor } from "@/lib/board";
import { requireMembership } from "@/lib/groups";
import { allTimeSummary, dailyHighlights, weeklyRecap } from "@/lib/summary";
import { puzzleForDate, validPuzzleRange, weekStart } from "@/lib/wordle";

/**
 * Share text for the group. Any member can generate it.
 *   kind=day       today's highlights, once everyone has played
 *   kind=week      this Mon–Sun week, on Sunday once everyone has played
 *   kind=lastweek  the previous Mon–Sun week
 *   kind=all       all-time standings
 */
export const GET = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const player = await requirePlayer(req);
  const group = await requireMembership((await params).id, player.id);
  const url = new URL(req.url);

  const asked = Number(url.searchParams.get("today"));
  const { min, max } = validPuzzleRange();
  const today = asked >= min && asked <= max ? asked : puzzleForDate(new Date(), player.tz);

  const data = await loadGroup(group.id, today);
  const ctx = { groupName: group.name, joinUrl: `${url.origin}/j/${group.invite_code}` };
  const played = data.members.filter((m) => resultFor(data, m.id, today)).length;
  const waiting = `Unlocks when everyone has played (${played}/${data.members.length} so far)`;

  switch (url.searchParams.get("kind")) {
    case "day":
      if (!everyonePlayed(data, today)) throw new HttpError(409, waiting);
      return Response.json({ text: dailyHighlights(data, today, ctx) });
    case "week": {
      const start = weekStart(today);
      if (today !== start + 6) throw new HttpError(409, "This week's recap unlocks on Sunday");
      if (!everyonePlayed(data, today)) throw new HttpError(409, waiting);
      return Response.json({ text: weeklyRecap(data, start, ctx) });
    }
    case "lastweek": {
      const start = weekStart(today) - 7;
      const any = [...data.byPlayer.values()].flat().some((r) => r.puzzle >= start && r.puzzle <= start + 6);
      if (!any) throw new HttpError(409, "No games were played last week");
      return Response.json({ text: weeklyRecap(data, start, ctx) });
    }
    case "all":
      if (![...data.byPlayer.values()].some((rows) => rows.length)) throw new HttpError(409, "No games yet");
      return Response.json({ text: allTimeSummary(data, today, ctx) });
    default:
      throw new HttpError(400, "Unknown summary kind");
  }
});
