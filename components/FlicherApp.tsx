"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Play, Plus, Check, Menu, X, LogIn, LogOut, User, Film, Tv, Download, Loader2 } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase";

type Movie = {
  id: string; title: string; synopsis: string | null; type: "movie" | "series";
  genre: string | null; year: number | null; maturity_rating: string | null;
  duration_minutes: number | null; poster_url: string | null; backdrop_url: string | null;
  featured: boolean; video_path: string | null; published: boolean;
};

export default function FlicherApp() {
  const [items, setItems] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [selected, setSelected] = useState<Movie | null>(null);
  const [watchUrl, setWatchUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [saved, setSaved] = useState<string[]>([]);
  const [message, setMessage] = useState("");

  const db = useMemo(() => supabaseBrowser(), []);

  useEffect(() => {
    let alive = true;
    db.from("movies").select("*").eq("published", true).order("created_at", { ascending: false })
      .then(({ data }) => { if (alive) { setItems((data || []) as Movie[]); setLoading(false); } });
    db.auth.getUser().then(({ data }) => { if (alive) setUser(data.user); });
    const { data: listener } = db.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => { alive = false; listener.subscription.unsubscribe(); };
  }, [db]);

  useEffect(() => {
    if (!user) { setSaved([]); return; }
    db.from("watchlist").select("movie_id").eq("user_id", user.id)
      .then(({ data }) => setSaved((data || []).map((r: any) => r.movie_id)));
  }, [db, user]);

  const filtered = items.filter(m => {
    const matchText = `${m.title} ${m.genre || ""} ${m.synopsis || ""}`.toLowerCase().includes(query.toLowerCase());
    const matchCategory = category === "All" || (category === "Movies" ? m.type === "movie" : category === "Series" ? m.type === "series" : (m.genre || "").toLowerCase().includes(category.toLowerCase()));
    return matchText && matchCategory;
  });
  const featured = items.find(m => m.featured) || items[0];
  const toggleSaved = async (movie: Movie) => {
    if (!user) { setMessage("Sign in to save titles to My List."); setAuthOpen(true); return; }
    if (saved.includes(movie.id)) {
      await db.from("watchlist").delete().eq("movie_id", movie.id).eq("user_id", user.id);
      setSaved(s => s.filter(id => id !== movie.id));
    } else {
      await db.from("watchlist").insert({ movie_id: movie.id, user_id: user.id });
      setSaved(s => [...s, movie.id]);
    }
  };
  const signIn = async (register: boolean) => {
    setBusy(true); setMessage("");
    const result = register
      ? await db.auth.signUp({ email, password })
      : await db.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (result.error) setMessage(result.error.message);
    else { setMessage(register ? "Check your email to confirm your account." : "Welcome back!"); if (!register) setAuthOpen(false); }
  };
  const signOut = async () => { await db.auth.signOut(); setUser(null); };
  const play = async (movie: Movie, download = false) => {
    if (!user) { setMessage("Please sign in to watch or download."); setAuthOpen(true); return; }
    if (!movie.video_path) { setMessage("This title does not have a video file yet."); return; }
    setBusy(true); setMessage("");
    const { data: sessionData } = await db.auth.getSession();
    const response = await fetch(`/api/media/${movie.id}${download ? "?download=1" : ""}`, {
      headers: { Authorization: `Bearer ${sessionData.session?.access_token || ""}` }
    });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) { setMessage(data.error || "Could not open this video."); return; }
    if (download) window.location.href = data.url;
    else { setWatchUrl(data.url); setSelected(movie); }
  };
  const openMovie = (movie: Movie) => { setSelected(movie); setWatchUrl(""); };

  return <main>
    <header className="topbar">
      <a className="brand" href="#"><span>FLI</span>CHER<span className="brand-dot">.</span></a>
      <nav className="desktop-nav"><a href="#home">Home</a><a href="#catalogue" onClick={() => setCategory("Movies")}>Movies</a><a href="#catalogue" onClick={() => setCategory("Series")}>Series</a><a href="#my-list" onClick={() => setCategory("All")}>My List</a></nav>
      <div className="top-actions">
        <label className="searchbox"><Search size={17}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search titles..." /></label>
        {user ? <button className="user-pill" onClick={signOut}><User size={15}/><span>{user.email?.split("@")[0]}</span><LogOut size={15}/></button> : <button className="outline-btn" onClick={() => setAuthOpen(true)}>Sign in</button>}
        <button className="mobile-menu" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu">{mobileOpen ? <X/> : <Menu/>}</button>
      </div>
    </header>
    {mobileOpen && <div className="mobile-nav"><a href="#home" onClick={() => setMobileOpen(false)}>Home</a><a href="#catalogue" onClick={() => {setCategory("Movies");setMobileOpen(false)}}>Movies</a><a href="#catalogue" onClick={() => {setCategory("Series");setMobileOpen(false)}}>Series</a></div>}

<section
  id="home"
  className="hero"
  style={
    featured?.backdrop_url
      ? {
          backgroundImage: `linear-gradient(90deg, #080808 4%, rgba(8,8,8,.82) 43%, rgba(8,8,8,.12)), linear-gradient(0deg,#080808,transparent 55%), url("${featured.backdrop_url}")`,
        }
      : undefined
  }
>      <div className="hero-content">
        <div className="eyebrow"><span className="gold-line"/> PREMIUM ENTERTAINMENT</div>
<h1>
  {featured?.title || (
    <>
      YOUR NEXT
      <br />
      FAVOURITE STORY
    </>
  )}
</h1>        <div className="meta"><span>{featured?.year || "NEW RELEASES"}</span><span>{featured?.maturity_rating || "HD"}</span><span>{featured?.genre || "MOVIES & SERIES"}</span></div>
        <p>{featured?.synopsis || "Discover a world of unforgettable movies and series. Find your next favourite story and enjoy entertainment in one place."}</p>
        <div className="hero-buttons">
          {featured && <button className="gold-btn" onClick={() => {openMovie(featured)}}><Play size={18} fill="currentColor"/> Explore title</button>}
          <a className="dark-btn" href="#catalogue"><Film size={17}/> Browse catalogue</a>
        </div>
      </div>
      <div className="hero-label">F L I C H E R <span>ORIGINAL ENTERTAINMENT</span></div>
    </section>

    {message && <div className="notice" role="status">{message}<button onClick={() => setMessage("")}>×</button></div>}
    <section id="catalogue" className="catalogue section-wrap">
      <div className="section-heading"><div><div className="eyebrow">CURATED FOR YOU</div><h2>Explore <span>the collection</span></h2></div>
        <div className="filters">{["All","Movies","Series","Action","Drama","Comedy","Romance","Thriller"].map(c => <button key={c} className={category === c ? "filter active" : "filter"} onClick={() => setCategory(c)}>{c}</button>)}</div>
      </div>
      {loading ? <div className="loading"><Loader2 className="spin"/> Loading FLICHER catalogue...</div> : filtered.length === 0 ? <div className="empty"><Film size={30}/><h3>No titles found yet</h3><p>New movies and series will appear here when an administrator publishes them.</p></div> :
        <div className="movie-grid">{filtered.map(movie => <article className="movie-card" key={movie.id}>
          <button className="poster-button" onClick={() => openMovie(movie)} aria-label={`View ${movie.title}`}>
            {movie.poster_url ? <img src={movie.poster_url} alt={`${movie.title} poster`}/> : <div className="poster-placeholder"><Film size={34}/><span>FLICHER</span></div>}
            <span className="poster-play"><Play fill="currentColor"/></span>
            <span className="type-tag">{movie.type === "series" ? "SERIES" : "MOVIE"}</span>
          </button>
          <div className="card-info"><div><h3>{movie.title}</h3><p>{[movie.year, movie.genre].filter(Boolean).join(" • ")}</p></div><button className="save-btn" onClick={() => toggleSaved(movie)} aria-label="Save to My List">{saved.includes(movie.id) ? <Check/> : <Plus/>}</button></div>
        </article>)}</div>}
    </section>

    {user && <section id="my-list" className="section-wrap my-list"><div className="section-heading"><div><div className="eyebrow">YOUR PERSONAL COLLECTION</div><h2>My <span>List</span></h2></div></div>
      <div className="saved-row">{items.filter(m => saved.includes(m.id)).map(m => <button key={m.id} onClick={() => openMovie(m)}>{m.title}</button>)}{saved.length === 0 && <p>Your saved titles will appear here. Use the + button on any title.</p>}</div>
    </section>}

    <footer><a className="brand" href="#">FLI<span>CHER</span><span className="brand-dot">.</span></a><p>Stories worth watching.</p><small>© {new Date().getFullYear()} FLICHER. All rights reserved. Only licensed content may be distributed.</small><a className="admin-link" href="/admin">Admin dashboard</a></footer>

    {selected && <div className="modal-backdrop" onClick={() => {setSelected(null);setWatchUrl("")}}>
      <div className="detail-modal" onClick={e => e.stopPropagation()}>
        <button className="close-modal" onClick={() => {setSelected(null);setWatchUrl("")}}><X/></button>
        {watchUrl ? <video className="video-player" controls autoPlay playsInline src={watchUrl}/> : selected.backdrop_url ? <img className="detail-backdrop" src={selected.backdrop_url} alt=""/> : <div className="detail-backdrop placeholder"/>}
        <div className="detail-content"><div className="eyebrow">{selected.type === "series" ? "SERIES" : "FEATURE FILM"}</div><h2>{selected.title}</h2><p className="meta">{[selected.year, selected.maturity_rating, selected.genre, selected.duration_minutes ? `${selected.duration_minutes} min` : null].filter(Boolean).join(" • ")}</p><p>{selected.synopsis || "Discover this title on FLICHER."}</p>
          <div className="hero-buttons"><button className="gold-btn" disabled={busy} onClick={() => play(selected)}><Play size={17} fill="currentColor"/> {busy ? "Loading..." : "Watch now"}</button><button className="dark-btn" onClick={() => toggleSaved(selected)}>{saved.includes(selected.id) ? <Check/> : <Plus/>} My List</button><button className="dark-btn" disabled={busy} onClick={() => play(selected, true)}><Download size={17}/> Download</button></div>
          <p className="fine-print">Downloads are available only when the administrator has enabled a downloadable licensed video file. Your device and browser may determine where the file is saved.</p>
        </div>
      </div>
    </div>}

    {authOpen && <div className="modal-backdrop" onClick={() => setAuthOpen(false)}><div className="auth-modal" onClick={e => e.stopPropagation()}>
      <button className="close-modal" onClick={() => setAuthOpen(false)}><X/></button><div className="brand auth-brand">FLI<span>CHER</span><span className="brand-dot">.</span></div><h2>Welcome to Flicher</h2><p>Sign in or create an account to start watching.</p>
      <label>Email address<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"/></label><label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters"/></label>
      {message && <p className="form-message">{message}</p>}<button className="gold-btn full" disabled={busy || !email || password.length < 6} onClick={() => signIn(false)}><LogIn size={17}/> Sign in</button><button className="text-btn" disabled={busy || !email || password.length < 6} onClick={() => signIn(true)}>New here? Create an account</button>
    </div></div>}
  </main>;
}
