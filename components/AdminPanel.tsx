"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase";
import { ArrowLeft, Upload, Loader2, Trash2 } from "lucide-react";

export default function AdminPanel() {
  const db = supabaseBrowser();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [titles, setTitles] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({title:"",type:"movie",genre:"",year:"",synopsis:"",maturity_rating:"PG-13",duration_minutes:"",featured:false,published:true,downloadable:false});
  const [poster, setPoster] = useState<File|null>(null);
  const [backdrop, setBackdrop] = useState<File|null>(null);
  const [video, setVideo] = useState<File|null>(null);

  const refresh = async () => {
    const {data} = await db.from("movies").select("*").order("created_at",{ascending:false});
    setTitles(data || []);
  };
  
useEffect(() => {
  let live = true;

  (async () => {
    try {
      const { data: { session } } = await db.auth.getSession();

      if (!session) {
        if (live) {
          setChecking(false);
          setAllowed(false);
        }
        return;
      }

      const response = await fetch("/api/admin/check", {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      const responseText = await response.text();

      console.log("ADMIN CHECK STATUS:", response.status);
      console.log("ADMIN CHECK RESPONSE:", responseText);

      const result = responseText.trim()
        ? JSON.parse(responseText)
        : {};

      if (!response.ok) {
        throw new Error(`Admin check failed: ${response.status}`);
      }

      if (live) {
        setAllowed(!!result.admin);
        setChecking(false);

        if (result.admin) {
          await refresh();
        }
      }
    } catch (error) {
      console.error("ADMIN ACCESS CHECK FAILED:", error);

      if (live) {
        setAllowed(false);
        setChecking(false);
      }
    }
  })();

  return () => {
    live = false;
  };
}, []);


  const update = (key:string,value:any) => setForm(f=>({...f,[key]:value}));
  const upload = async (file:File, folder:string) => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
    const path = `${crypto.randomUUID()}.${ext}`;
    const {error} = await db.storage.from(folder).upload(path,file,{upsert:false,contentType:file.type});
    if(error) throw error;
    if(folder === "posters") return db.storage.from("posters").getPublicUrl(path).data.publicUrl;
    return path;
  };
  const submit = async (e:React.FormEvent) => {
    e.preventDefault(); setBusy(true);setMessage("");
    try {
      if(!poster) throw new Error("Please choose a poster image.");
      const posterUrl = await upload(poster,"posters");
      const backdropUrl = backdrop ? await upload(backdrop,"posters") : posterUrl;
      const videoPath = video ? await upload(video,"videos") : null;
      const {error} = await db.from("movies").insert({
        title:form.title, type:form.type, genre:form.genre || null,
        year:form.year ? Number(form.year) : null, synopsis:form.synopsis || null,
        maturity_rating:form.maturity_rating || null,
        duration_minutes:form.duration_minutes ? Number(form.duration_minutes) : null,
        featured:form.featured,published:form.published,downloadable:form.downloadable && !!videoPath,
        poster_url:posterUrl,backdrop_url:backdropUrl,video_path:videoPath
      });
      if(error) throw error;
      setMessage("Title added successfully.");
      setForm({title:"",type:"movie",genre:"",year:"",synopsis:"",maturity_rating:"PG-13",duration_minutes:"",featured:false,published:true,downloadable:false});
      setPoster(null);setBackdrop(null);setVideo(null);
      const el = document.getElementById("admin-form") as HTMLFormElement; el?.reset();
      await refresh();
    } catch(err:any) {setMessage(err.message || "Upload failed.");}
    finally {setBusy(false);}
  };
  const remove = async (id:string) => {
    if(!confirm("Delete this catalogue entry? This does not delete the files in Storage.")) return;
    const {error} = await db.from("movies").delete().eq("id",id);
    setMessage(error?.message || "Title deleted."); refresh();
  };
  if(checking) return <main className="admin-shell"><Loader2 className="spin"/> Checking administrator access...</main>;
  if(!allowed) return <main className="admin-shell"><div className="admin-card"><Link href="/" className="back-link"><ArrowLeft size={16}/> Back to Flicher</Link><h1>Administrator access</h1><p>Sign in with an account that has the admin role. The first admin must be promoted in the Supabase SQL editor.</p><Link className="gold-btn" href="/">Return to Flicher and sign in</Link></div></main>;
  return <main className="admin-shell"><div className="admin-wrap">
    <Link href="/" className="back-link"><ArrowLeft size={16}/> Back to Flicher</Link>
    <div className="admin-title"><div className="brand">FLI<span>CHER</span><span className="brand-dot">.</span></div><div className="eyebrow">CONTENT CONTROL CENTRE</div><h1>Admin dashboard</h1><p>Add and manage your licensed movie and series catalogue.</p></div>
    <div className="admin-card"><h2>Add a title</h2><form id="admin-form" onSubmit={submit}>
      <div className="admin-grid">
        <label>Title *<input required value={form.title} onChange={e=>update("title",e.target.value)}/></label>
        <label>Type<select value={form.type} onChange={e=>update("type",e.target.value)}><option value="movie">Movie</option><option value="series">Series</option></select></label>
        <label>Genre<input value={form.genre} onChange={e=>update("genre",e.target.value)} placeholder="Action, Drama"/></label>
        <label>Release year<input type="number" min="1888" max="2100" value={form.year} onChange={e=>update("year",e.target.value)}/></label>
        <label>Age rating<input value={form.maturity_rating} onChange={e=>update("maturity_rating",e.target.value)}/></label>
        <label>Duration (minutes)<input type="number" min="1" value={form.duration_minutes} onChange={e=>update("duration_minutes",e.target.value)}/></label>
      </div>
      <label>Synopsis<textarea rows={4} value={form.synopsis} onChange={e=>update("synopsis",e.target.value)}/></label>
      <div className="admin-grid">
        <label>Poster image *<input required type="file" accept="image/*" onChange={e=>setPoster(e.target.files?.[0]||null)}/></label>
        <label>Backdrop image<input type="file" accept="image/*" onChange={e=>setBackdrop(e.target.files?.[0]||null)}/></label>
        <label>Video file (optional)<input type="file" accept="video/*" onChange={e=>setVideo(e.target.files?.[0]||null)}/></label>
      </div>
      <div className="checks"><label><input type="checkbox" checked={form.featured} onChange={e=>update("featured",e.target.checked)}/> Featured on homepage</label><label><input type="checkbox" checked={form.published} onChange={e=>update("published",e.target.checked)}/> Publish immediately</label><label><input type="checkbox" checked={form.downloadable} onChange={e=>update("downloadable",e.target.checked)}/> Allow downloads (licensed files only)</label></div>
      <p className="upload-note">Large video files may exceed browser or storage limits. For production, use resumable uploads or a dedicated video platform/CDN.</p>
      {message && <p className="admin-message">{message}</p>}
      <button className="gold-btn" disabled={busy}>{busy?<Loader2 className="spin"/>:<Upload size={17}/>} {busy?"Uploading...":"Add to catalogue"}</button>
    </form></div>
    <div className="admin-card"><h2>Catalogue ({titles.length})</h2>{titles.length===0?<p>No titles yet.</p>:titles.map(t=><div className="admin-title-row" key={t.id}><div><strong>{t.title}</strong><small>{t.type} · {t.published?"Published":"Draft"} · {t.video_path?"Video attached":"No video"}</small></div><button onClick={()=>remove(t.id)} aria-label={`Delete ${t.title}`}><Trash2 size={17}/></button></div>)}</div>
  </div></main>;
}
