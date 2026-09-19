"use client";

import { useEffect, useMemo, useState } from "react";
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
  PHI:"Eagles", TEN:"Titans", PIT:"Steelers", NE:"Patriots", MIN:"Vikings", CHI:"Bears",
  GB:"Packers", NYJ:"Jets", NO:"Saints", BAL:"Ravens", CIN:"Bengals", HOU:"Texans",
  CLE:"Browns", TB:"Buccaneers", JAX:"Jaguars", DEN:"Broncos", LV:"Raiders", LAC:"Chargers",
  SEA:"Seahawks", ARI:"Cardinals", MIA:"Dolphins", SF:"49ers", WAS:"Commanders", DAL:"Cowboys",
  IND:"Colts", KC:"Chiefs", NYG:"Giants", LA:"Rams"
};

export default function Home() {
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const [supabase] = useState(() => configured ? createClient() : null);
  const [games, setGames] = useState(demoGames);
  const [picks, setPicks] = useState({});
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState("picks");
  const [leaders, setLeaders] = useState([]);

  useEffect(() => {
    const local = JSON.parse(localStorage.getItem("nfl-picks") || "{}");
    setPicks(local);
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => setUser(data.user || null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user || null));
    loadGames();
    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  async function loadGames() {
    if (!supabase) return;
    const { data } = await supabase.from("games").select("*").order("kickoff_time");
    if (data?.length) setGames(data);
  }

  async function signIn() {
    if (!supabase) return setMessage("Add Supabase keys to .env.local to enable accounts.");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin }
    });
    setMessage(error ? error.message : "Check your email for the sign-in link.");
  }

  async function choose(game, team) {
    if (new Date(game.kickoff_time) <= new Date()) return;
    const next = { ...picks, [game.id]: team };
    setPicks(next);
    localStorage.setItem("nfl-picks", JSON.stringify(next));
    if (supabase && user && !game.id.startsWith("demo-")) {
      await supabase.from("picks").upsert(
        { user_id: user.id, game_id: game.id, picked_team: team },
        { onConflict: "user_id,game_id" }
      );
    }
  }

  async function loadLeaderboard() {
    setTab("leaderboard");
    if (!supabase) {
      setLeaders([{ name: "Demo Player", correct: 0, total: Object.keys(picks).length }]);
      return;
    }
    const { data } = await supabase.from("leaderboard").select("*").order("correct", { ascending: false });
    setLeaders(data || []);
  }

  const completed = Object.keys(picks).length;
  const pct = Math.round((completed / games.length) * 100) || 0;

  return (
    <main>
      <header>
        <div>
          <div className="eyebrow">NFL PICK'EM</div>
          <h1>Sunday Picks</h1>
        </div>
        <div className="week">WEEK 2</div>
      </header>

      <nav>
        <button className={tab==="picks" ? "active" : ""} onClick={() => setTab("picks")}>My Picks</button>
        <button className={tab==="leaderboard" ? "active" : ""} onClick={loadLeaderboard}>Leaderboard</button>
      </nav>

      {!user && tab === "picks" && (
        <section className="login">
          <div>
            <strong>{configured ? "Sign in to save picks across devices" : "Demo mode"}</strong>
            <p>{configured ? "We'll email you a secure sign-in link." : "Picks save in this browser. Connect Supabase to enable real accounts and groups."}</p>
          </div>
          {configured && <div className="loginRow">
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" type="email" />
            <button onClick={signIn}>Sign in</button>
          </div>}
          {message && <small>{message}</small>}
        </section>
      )}

      {tab === "picks" ? (
        <>
          <section className="progress">
            <div><strong>{completed} of {games.length}</strong> picks made</div>
            <div className="bar"><span style={{width: `${pct}%`}} /></div>
          </section>

          <section className="games">
            {games.map(game => {
              const locked = new Date(game.kickoff_time) <= new Date();
              return (
                <article className="game" key={game.id}>
                  <div className="time">
                    {new Date(game.kickoff_time).toLocaleString([], {weekday:"short", hour:"numeric", minute:"2-digit"})}
                    {locked && <span> â¢ LOCKED</span>}
                  </div>
                  <div className="matchup">
                    {[game.away_team, game.home_team].map((team, i) => (
                      <button
                        key={team}
                        disabled={locked}
                        onClick={() => choose(game, team)}
                        className={picks[game.id] === team ? "team selected" : "team"}
                      >
                        <span className="abbr">{team}</span>
                        <span>{names[team] || team}</span>
                        <span className="check">{picks[game.id] === team ? "â" : ""}</span>
                      </button>
                    ))}
                  </div>
                  <div className="at">@</div>
                </article>
              );
            })}
          </section>
          <div className="save">{completed === games.length ? "â All picks are saved" : "Your picks save automatically"}</div>
        </>
      ) : (
        <section className="leaderboard">
          <h2>Weekly Leaderboard</h2>
          <p>Scores update as completed games receive a winner.</p>
          {leaders.length === 0 ? <div className="empty">No scores yet.</div> :
            leaders.map((l, i) => (
              <div className="leader" key={i}>
                <span className="rank">{i+1}</span>
                <strong>{l.name || "Player"}</strong>
                <span>{l.correct ?? 0} correct</span>
              </div>
            ))
          }
        </section>
      )}

      <footer>Pick winners. Beat your friends. That's it.</footer>
    </main>
  );
}
