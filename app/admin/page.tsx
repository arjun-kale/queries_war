"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ExternalLink, LoaderCircle, LogOut, Play, Plus, Shield, Square, ToggleLeft, ToggleRight, UserX, UserCheck } from "lucide-react";
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
      location.replace("/admin/login");
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
    try {
      if (contest.isActive) {
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
      } else {
        await start({ adminToken: token!, contestId: contest._id });
      }
      setMessage(contest.isActive ? "Contest turned off." : "Contest started now.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update contest.");
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

  async function handleToggleDisqualify(participantId: Id<"participants">, currentDisqualified: boolean) {
    if (!token) return;
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
        startTime: now,
        endTime: now + 315360000000,
        durationSeconds: 3600,
      });
      setSelected(id);
      setMessage("Contest created. Start it when ready.");
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
    <main className="min-h-svh bg-muted/30">
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
                  className={`w-full rounded-lg border p-3 text-left ${
                    item._id === contest?._id
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{item.title}</span>
                    {item.isActive ? (
                      <ToggleRight className="size-5 text-primary" />
                    ) : (
                      <ToggleLeft className="size-5 text-muted-foreground" />
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.isActive ? "Live" : "Off"}
                  </p>
                </button>
              ))}
            </CardContent>
          </Card>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Contest control</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-4">
                <Button size="lg" onClick={toggleContest}>
                  {contest?.isActive ? (
                    <>
                      <Square /> Turn off contest
                    </>
                  ) : (
                    <>
                      <Play /> Start contest
                    </>
                  )}
                </Button>
                <label className="flex items-center gap-3 rounded-lg border p-3 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={contest?.leaderboardVisible ?? true}
                    onChange={(event) =>
                      handleLeaderboardToggle(event.target.checked)
                    }
                  />
                  Show leaderboard
                </label>
                {message && (
                  <p className="text-sm text-muted-foreground">{message}</p>
                )}
              </CardContent>
            </Card>
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
                                onClick={() => handleToggleDisqualify(row.participantId, row.isDisqualified)}
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

