"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  Calendar,
  Clock,
  ExternalLink,
  LoaderCircle,
  LogOut,
  Play,
  Plus,
  Save,
  Shield,
  Square,
  ToggleLeft,
  ToggleRight,
  UserCheck,
  UserX,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ADMIN_KEY = "queries-war-admin-token";

export default function AdminPage() {
  const [token] = useState<string | undefined>(() =>
    typeof window === "undefined" ? undefined : localStorage.getItem(ADMIN_KEY) ?? undefined,
  );
  const [selected, setSelected] = useState<Id<"contests">>();
  const [message, setMessage] = useState<string>();

  useEffect(() => {
    if (!token) location.replace("/admin/login");
  }, [token]);

  const validSession = useQuery(
    api.admin.check,
    token ? { adminToken: token } : "skip",
  );
  const contests = useQuery(
    api.contests.adminList,
    token && validSession === true ? { adminToken: token } : "skip",
  );
  const stats = useQuery(
    api.admin.dashboard,
    token && validSession === true ? { adminToken: token } : "skip",
  );
  const contest = useMemo(
    () => contests?.find((item) => item._id === selected) ?? contests?.[0],
    [contests, selected],
  );

  const liveScores = useQuery(
    api.admin.liveScores,
    token && validSession === true && contest
      ? { adminToken: token, contestId: contest._id }
      : "skip",
  );

  const update = useMutation(api.contests.adminUpdate);
  const start = useMutation(api.contests.adminStart);
  const create = useMutation(api.contests.adminCreate);
  const setLeaderboardVisible = useMutation(api.admin.setLeaderboardVisible);
  const setDisqualified = useMutation(api.admin.setDisqualified);
  const logout = useMutation(api.admin.logout);

  useEffect(() => {
    if (validSession === false) {
      localStorage.removeItem(ADMIN_KEY);
      location.replace("/admin/login?expired=1");
    }
  }, [validSession]);

  if (!token || validSession !== true || contests === undefined || stats === undefined) {
    return (
      <main className="flex min-h-svh items-center justify-center gap-2 text-muted-foreground">
        <LoaderCircle className="animate-spin" />
        Loading admin dashboard…
      </main>
    );
  }

  async function toggleContest() {
    if (!contest) return;
    const isStopping = contest.isActive;
    const promptMessage = isStopping
      ? `Are you sure you want to TURN OFF "${contest.title}"? Active participants will be stopped from submitting new queries.`
      : `Are you sure you want to START "${contest.title}" now? Any other active contest will be deactivated.`;

    if (!window.confirm(promptMessage)) return;

    try {
      if (isStopping) {
        await update({
          adminToken: token!,
          contestId: contest._id,
          title: contest.title,
          startTime: contest.startTime,
          endTime: contest.endTime,
          durationSeconds: contest.durationSeconds,
          isActive: false,
          leaderboardVisible: contest.leaderboardVisible,
        });
        setMessage("Contest turned off.");
      } else {
        await start({ adminToken: token!, contestId: contest._id });
        setMessage("Contest started live.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update contest.");
    }
  }

  async function handleSaveContest(title: string, durationMins: number, startTimeIso: string) {
    if (!contest || !token) return;
    setMessage(undefined);

    try {
      const parsedStart = new Date(startTimeIso).getTime();
      const parsedDurationSec = Math.max(60, durationMins * 60);
      const parsedEnd = parsedStart + parsedDurationSec * 1000;

      await update({
        adminToken: token,
        contestId: contest._id,
        title: title.trim(),
        startTime: parsedStart,
        endTime: parsedEnd,
        durationSeconds: parsedDurationSec,
        isActive: contest.isActive,
        leaderboardVisible: contest.leaderboardVisible,
      });
      setMessage("Contest configuration saved.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not save changes.");
    }
  }

  async function handleLeaderboardToggle(visible: boolean) {
    if (!contest || !token) return;
    try {
      await setLeaderboardVisible({
        adminToken: token,
        contestId: contest._id,
        leaderboardVisible: visible,
      });
      setMessage(visible ? "Leaderboard is now public." : "Leaderboard is now hidden.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update leaderboard.");
    }
  }

  async function handleToggleDisqualify(
    participantId: Id<"participants">,
    currentDisqualified: boolean,
    participantName: string,
  ) {
    if (!token) return;
    const actionLabel = currentDisqualified
      ? `lift disqualification for ${participantName}`
      : `DISQUALIFY ${participantName}`;

    if (!window.confirm(`Are you sure you want to ${actionLabel}?`)) return;

    try {
      await setDisqualified({
        adminToken: token,
        participantId,
        isDisqualified: !currentDisqualified,
      });
      setMessage(!currentDisqualified ? "Participant disqualified." : "Disqualification lifted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update disqualification.");
    }
  }

  async function createContest() {
    const now = Date.now();
    try {
      const id = await create({
        adminToken: token!,
        title: "New SQL Contest",
        startTime: now + 3600_000, // default scheduled 1 hour in future
        endTime: now + 3600_000 + 3600_000,
        durationSeconds: 3600,
      });
      setSelected(id);
      setMessage("New contest created. Configure start time and launch when ready.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create contest.");
    }
  }

  async function signOut() {
    await logout({ adminToken: token! });
    localStorage.removeItem(ADMIN_KEY);
    location.replace("/admin/login");
  }

  return (
    <main className="min-h-svh bg-muted/30 pb-12">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Shield />
            </div>
            <div>
              <p className="font-heading text-xl font-semibold">Admin control room</p>
              <p className="text-xs text-muted-foreground">Queries War operations</p>
            </div>
          </div>
          <Button variant="outline" onClick={signOut}>
            <LogOut /> Sign out
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-6 p-5 md:p-8">
        <div className="grid gap-4 sm:grid-cols-4">
          {[
            ["Contests", stats.contestCount],
            ["Active now", stats.activeContestCount],
            ["Participants", stats.participantCount],
            ["Submissions", stats.submissionCount],
          ].map(([label, value]) => (
            <Card key={label}>
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-2 font-heading text-3xl font-semibold">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <Card className="h-fit">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Contests</CardTitle>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={createContest}
                  aria-label="Create contest"
                >
                  <Plus />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {contests.map((item) => (
                <button
                  key={item._id}
                  onClick={() => setSelected(item._id)}
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${
                    item._id === contest?._id
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium truncate">{item.title}</span>
                    {item.isActive ? (
                      <ToggleRight className="size-5 text-primary shrink-0" />
                    ) : (
                      <ToggleLeft className="size-5 text-muted-foreground shrink-0" />
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.isActive ? "Live" : "Inactive"} ·{" "}
                    {new Date(item.startTime).toLocaleDateString()}
                  </p>
                </button>
              ))}
            </CardContent>
          </Card>

          <div className="space-y-6">
            {contest && (
              <EditContestCard
                key={contest._id}
                contest={contest}
                onSave={handleSaveContest}
                onToggleContest={toggleContest}
                onLeaderboardToggle={handleLeaderboardToggle}
                message={message}
              />
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Live scores & anti-cheat monitoring</CardTitle>
              </CardHeader>
              <CardContent>
                {liveScores === undefined ? (
                  <p className="text-sm text-muted-foreground">Loading live scores…</p>
                ) : liveScores.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No participants yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="p-3">Rank</th>
                          <th className="p-3">Participant</th>
                          <th className="p-3">Score</th>
                          <th className="p-3">Subs</th>
                          <th className="p-3">Tab switches</th>
                          <th className="p-3">Paste attempts</th>
                          <th className="p-3">ID check</th>
                          <th className="p-3">Status</th>
                          <th className="p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {liveScores.map((row) => (
                          <tr key={row.participantId} className="border-b last:border-0 hover:bg-muted/40">
                            <td className="p-3 font-mono">#{row.rank}</td>
                            <td className="p-3">
                              <Link
                                href={`/admin/dashboard/${row.participantId}`}
                                className="font-medium hover:underline text-primary flex items-center gap-1.5"
                              >
                                {row.name}
                                <ExternalLink className="size-3" />
                              </Link>
                              <p className="text-xs text-muted-foreground">{row.email}</p>
                            </td>
                            <td className="p-3 font-semibold text-primary">{row.totalScore}</td>
                            <td className="p-3">{row.submissionCount}</td>
                            <td className="p-3">
                              {row.tabSwitchCount > 0 ? (
                                <Badge variant={row.tabSwitchCount >= 3 ? "destructive" : "secondary"}>
                                  {row.tabSwitchCount}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">0</span>
                              )}
                            </td>
                            <td className="p-3">
                              {row.pasteAttemptCount > 0 ? (
                                <Badge variant={row.pasteAttemptCount >= 3 ? "destructive" : "secondary"}>
                                  {row.pasteAttemptCount}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">0</span>
                              )}
                            </td>
                            <td className="p-3">
                              {row.hasIdentityPhoto ? (
                                <Badge variant="secondary">Verified</Badge>
                              ) : row.identityVerificationSkipped ? (
                                <Badge variant="outline">Skipped</Badge>
                              ) : (
                                <span className="text-muted-foreground text-xs">Pending</span>
                              )}
                            </td>
                            <td className="p-3">
                              {row.isDisqualified ? (
                                <Badge variant="destructive">Disqualified</Badge>
                              ) : row.isFinished ? (
                                <Badge variant="outline">Finished</Badge>
                              ) : (
                                <Badge variant="secondary">In progress</Badge>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              <Button
                                variant={row.isDisqualified ? "outline" : "destructive"}
                                size="sm"
                                onClick={() =>
                                  handleToggleDisqualify(
                                    row.participantId,
                                    row.isDisqualified,
                                    row.name,
                                  )
                                }
                              >
                                {row.isDisqualified ? (
                                  <>
                                    <UserCheck className="size-3.5 mr-1" /> Requalify
                                  </>
                                ) : (
                                  <>
                                    <UserX className="size-3.5 mr-1" /> Disqualify
                                  </>
                                )}
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}

interface ContestLike {
  _id: Id<"contests">;
  title: string;
  startTime: number;
  endTime: number;
  durationSeconds: number;
  isActive: boolean;
  leaderboardVisible: boolean;
}

function EditContestCard({
  contest,
  onSave,
  onToggleContest,
  onLeaderboardToggle,
  message,
}: {
  contest: ContestLike;
  onSave: (title: string, durationMins: number, startTimeIso: string) => Promise<void>;
  onToggleContest: () => void;
  onLeaderboardToggle: (checked: boolean) => void;
  message?: string;
}) {
  const [title, setTitle] = useState(contest.title);
  const [durationMins, setDurationMins] = useState(Math.round(contest.durationSeconds / 60));
  const [startTime, setStartTime] = useState(() => {
    const date = new Date(contest.startTime);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  });
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(title, durationMins, startTime);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">Contest configuration & control</CardTitle>
          <Badge variant={contest.isActive ? "default" : "secondary"}>
            {contest.isActive ? "Live Now" : "Inactive"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-3">
          <label className="grid gap-1.5 text-xs font-medium sm:col-span-3">
            Title
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-9 rounded-md border bg-background px-3 font-normal text-sm"
            />
          </label>
          <label className="grid gap-1.5 text-xs font-medium">
            Duration (minutes)
            <div className="relative">
              <input
                required
                type="number"
                min="1"
                max="1440"
                value={durationMins}
                onChange={(e) => setDurationMins(Number(e.target.value))}
                className="h-9 w-full rounded-md border bg-background pl-8 pr-3 font-normal text-sm"
              />
              <Clock className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            </div>
          </label>
          <label className="grid gap-1.5 text-xs font-medium sm:col-span-2">
            Scheduled Start Time
            <div className="relative">
              <input
                required
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="h-9 w-full rounded-md border bg-background pl-8 pr-3 font-normal text-sm"
              />
              <Calendar className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            </div>
          </label>
          <div className="sm:col-span-3 flex flex-wrap items-center justify-between gap-3 pt-2">
            <Button type="submit" size="sm" variant="secondary" disabled={isSaving}>
              <Save className="size-4 mr-1.5" />
              {isSaving ? "Saving…" : "Save configuration"}
            </Button>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant={contest.isActive ? "destructive" : "default"}
                size="sm"
                onClick={onToggleContest}
              >
                {contest.isActive ? (
                  <>
                    <Square className="size-4 mr-1.5" /> Turn off contest
                  </>
                ) : (
                  <>
                    <Play className="size-4 mr-1.5" /> Start contest now
                  </>
                )}
              </Button>
              <label className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs cursor-pointer bg-background">
                <input
                  type="checkbox"
                  checked={contest.leaderboardVisible ?? true}
                  onChange={(event) =>
                    onLeaderboardToggle(event.target.checked)
                  }
                />
                Show leaderboard
              </label>
            </div>
          </div>
        </form>

        {message && (
          <p className="rounded-md bg-muted p-2.5 text-xs text-muted-foreground">
            {message}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
