"use client";

import { useEffect, useState } from "react";
import { createClient } from "../lib/supabase";

const demoGames = [
  { id: "demo-1", away_team: "PHI", home_team: "TEN", kickoff_time: "2026-09-20T17:00:00Z", winner: null },
  { id: "demo-2", away_team: "PIT", home_team: "NE", kickoff_time: "2026-09-20T17:00:00Z", winner: null },
  { id: "demo-3", away_team: "MIN", home_team: "CHI", kickoff_time: "2026-09-20T17:00:00Z", winner: null },
  { id: "demo-4", away_team: "GB", home_team: "NYJ", kickoff_time: "2026-09-20T17:00:00Z", winner: null },
  { id: "demo-5", away_team: "NO", home_team: "BAL", kickoff_time: "2026-09-20T17:00:00Z", winner: null },
  { id: "demo-6", away_team: "CIN", home_team: "HOU", kickoff_time: "2026-09-20T17:00:00Z", winner: null },
  { id: "demo-7", away_team: "CLE", home_team: "TB", kickoff_time: "2026-09-20T17:00:00Z", winner: null },
  { id: "demo-8", away_team: "JAX", home_team: "DEN", kickoff_time: "2026-09-20T20:05:00Z", winner: null },
  { id: "demo-9", away_team: "LV", home_team: "LAC", kickoff_time: "2026-09-20T20:05:00Z", winner: null },
  { id: "demo-10", away_team: "SEA", home_team: "ARI", kickoff_time: "2026-09-20T20:25:00Z", winner: null },
  { id: "demo-11", away_team: "MIA", home_team: "SF", kickoff_time: "2026-09-20T20:25:00Z", winner: null },
  { id: "demo-12", away_team: "WAS", home_team: "DAL", kickoff_time: "2026-09-20T20:25:00Z", winner: null },
  { id: "demo-13", away_team: "IND", home_team: "KC", kickoff_time: "2026-09-21T00:20:00Z", winner: null },
  { id: "demo-14", away_team: "NYG", home_team: "LA", kickoff_time: "2026-09-22T00:15:00Z", winner: null }
];

const names = {
  PHI: "Eagles",
  TEN: "Titans",
  PIT: "Steelers",
  NE: "Patriots",
  MIN: "Vikings",
  CHI: "Bears",
  GB: "Packers",
  NYJ: "Jets",
  NO: "Saints",
  BAL: "Ravens",
  CIN: "Bengals",
  HOU: "Texans",
  CLE: "Browns",
  TB: "Buccaneers",
  JAX: "Jaguars",
  DEN: "Broncos",
  LV: "Raiders",
  LAC: "Chargers",
  SEA: "Seahawks",
  ARI: "Cardinals",
  MIA: "Dolphins",
  SF: "49ers",
  WAS: "Commanders",
  DAL: "Cowboys",
  IND: "Colts",
  KC: "Chiefs",
  NYG: "Giants",
  LA: "Rams"
};

export default function Home() {
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const [supabase] = useState(() =>
    configured ? createClient() : null
  );

  const [games, setGames] = useState(demoGames);
  const [picks, setPicks] = useState({});
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
const [name, setName] = useState("");
const [profileSaved, setProfileSaved] = useState(false);
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState("picks");
  const [leaders, setLeaders] = useState([]);

  useEffect(() => {
    const local = JSON.parse(
      localStorage.getItem("nfl-picks") || "{}"
    );

    setPicks(local);

    if (!supabase) return;

supabase.auth.getUser().then(async ({ data }) => {
  if (data.user) {
    setUser(data.user);
  } else {
    await signIn();
  }
});

    const { data: listener } =
      supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user || null);
      });

    loadGames();

    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  async function loadGames() {
  if (!supabase) return;

  const { data: gameData } = await supabase
    .from("games")
    .select("*")
    .order("kickoff_time");

  if (gameData?.length) {
    setGames(gameData);
  }

  const { data: { user: currentUser } } =
    await supabase.auth.getUser();

  if (currentUser) {
    const { data: pickData } = await supabase
      .from("picks")
      .select("game_id, picked_team")
      .eq("user_id", currentUser.id);

    const savedPicks = {};

    (pickData || []).forEach((pick) => {
      savedPicks[pick.game_id] = pick.picked_team;
    });

    setPicks(savedPicks);
    localStorage.setItem(
      "nfl-picks",
      JSON.stringify(savedPicks)
    );
  }
}

  async function signIn() {
  if (!supabase) {
    setMessage("Supabase is not configured.");
    return;
  }

  const { error } = await supabase.auth.signInAnonymously();

  if (error) {
    setMessage(error.message);
  } else {
    setMessage("Signed in!");
  }
}
async function saveProfile() {
  if (!supabase || !user || !name.trim()) return;

  const { error } = await supabase.from("profiles").upsert(
    {
      user_id: user.id,
      name: name.trim(),
    },
    {
      onConflict: "user_id",
    }
  );

  if (error) {
    setMessage(error.message);
    return;
  }

  setProfileSaved(true);
  setMessage("Name saved!");
  loadLeaderboard();
}
  async function choose(game, team) {
    if (new Date(game.kickoff_time) <= new Date()) return;

    const next = {
      ...picks,
      [game.id]: team
    };

    setPicks(next);
    localStorage.setItem("nfl-picks", JSON.stringify(next));

    if (
      supabase &&
      user &&
      !game.id.startsWith("demo-")
    ) {
      await supabase.from("picks").upsert(
        {
          user_id: user.id,
          game_id: game.id,
          picked_team: team
        },
        {
          onConflict: "user_id,game_id"
        }
      );
    }
  }

  async function loadLeaderboard() {
    setTab("leaderboard");

    if (!supabase) {
      setLeaders([
        {
          name: "Demo Player",
          correct: 0,
          total: Object.keys(picks).length
        }
      ]);
      return;
    }

    const { data: profiles } = await supabase
  .from("profiles")
  .select("user_id, name");

const { data: allPicks } = await supabase
  .from("picks")
  .select("user_id, game_id, picked_team");

const leaderboard = (profiles || []).map((profile) => {
  const userPicks = (allPicks || []).filter(
    (pick) => pick.user_id === profile.user_id
  );

  return {
    user_id: profile.user_id,
    name: profile.name || "Player",
    correct: 0,
    total: userPicks.length,
  };
});

setLeaders(leaderboard);
  }

  const completed = games.filter(
  (game) => Boolean(picks[game.id])
).length;
  const pct = games.length
    ? Math.round((completed / games.length) * 100)
    : 0;

  return (
    <main>
      <header className="hero">
        <div>
          <div className="eyebrow">NFL PICK&apos;EM</div>
          <h1>Weekly Picks</h1>
          <p className="subtitle">
            Pick every winner before kickoff.
          </p>
        </div>

        <div className="week">WEEK 2</div>
      </header>

      <nav className="tabs">
        <button
          className={tab === "picks" ? "active" : ""}
          onClick={() => setTab("picks")}
        >
          My Picks
        </button>

        <button
          className={tab === "leaderboard" ? "active" : ""}
          onClick={loadLeaderboard}
        >
          Leaderboard
        </button>
      </nav>

      {!user && tab === "picks" && (
        <section className="login">
          <div>
            <strong>
              {configured
                ? "Save your picks"
                : "Demo mode"}
            </strong>

            <p>
  Your picks are saved automatically.
</p>
          </div>

         

          {message && (
            <small className="message">{message}</small>
          )}
        </section>
      )}

      {tab === "picks" ? (
        <>
          <section className="progress">
            <div className="progressTop">
              <strong>
                {completed} of {games.length} picks
              </strong>

              <span>{pct}% complete</span>
            </div>

            <div className="bar">
              <span style={{ width: `${pct}%` }} />
            </div>
          </section>

          <section className="games">
            {games.map((game) => {
              const locked =
                new Date(game.kickoff_time) <= new Date();

              return (
                <article className="game" key={game.id}>
                  <div className="time">
                    <span>
                      {new Date(
                        game.kickoff_time
                      ).toLocaleString([], {
                        weekday: "short",
                        hour: "numeric",
                        minute: "2-digit"
                      })}
                    </span>

                    {locked && (
                      <span className="locked">
                        LOCKED
                      </span>
                    )}
                  </div>

                  <div className="matchup">
                    {[game.away_team, game.home_team].map(
                      (team, index) => {
                        const selected =
                          picks[game.id] === team;

                        return (
                          <div
                            className="teamWrap"
                            key={team}
                          >
                            <button
                              disabled={locked}
                              onClick={() =>
                                choose(game, team)
                              }
                              className={
                                selected
                                  ? "team selected"
                                  : "team"
                              }
                            >
                              <span className="abbr">
                                {team}
                              </span>

                              <span className="teamName">
                                {names[team] || team}
                              </span>

                              <span className="check">
                                {selected ? "✓" : ""}
                              </span>
                            </button>

                            {index === 0 && (
                              <span className="at">@</span>
                            )}
                          </div>
                        );
                      }
                    )}
                  </div>
                </article>
              );
            })}
          </section>
<div className="save">
  <strong>Player name</strong>

  <input
    type="text"
    value={name}
    onChange={(e) => setName(e.target.value)}
    placeholder="Enter your name"
  />

  <button onClick={saveProfile}>
    {profileSaved ? "Name saved ✓" : "Save name"}
  </button>
</div>
          <div className="save">
            {completed === games.length
              ? "✓ All picks are saved"
              : "Your picks save automatically"}
          </div>
        </>
      ) : (
        <section className="leaderboard">
          <h2>Weekly Leaderboard</h2>

          <p>
            Scores update as games are completed.
          </p>

          {leaders.length === 0 ? (
            <div className="empty">
              No scores yet.
            </div>
          ) : (
            leaders.map((leader, index) => (
              <div className="leader" key={index}>
                <span className="rank">
                  {index + 1}
                </span>

                <strong>
                  {leader.name || "Player"}
                </strong>

                <span>
                  {leader.correct ?? 0} correct
                </span>
              </div>
            ))
          )}
        </section>
      )}

      <footer>
        Pick winners. Beat your friends. That&apos;s it.
      </footer>
    </main>
  );
}
