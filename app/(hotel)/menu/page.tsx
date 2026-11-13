"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { Modal, Switch, VegMark } from "@/components/ui";
import { del, get, patch, post, type Category, type FoodType, type Item } from "@/lib/api";
import { inr } from "@/lib/format";
import { check, LIMITS, rupees } from "@/lib/validate";
import { useApp } from "@/lib/store";

type Draft = { id: string | null; category_id: string; name: string; description: string; price: number; half_price: number; food_type: FoodType };

export default function MenuPage() {
  const { run, toast } = useApp();
  const [cats, setCats] = useState<Category[] | null>(null);
  const [cat, setCat] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [err, setErr] = useState("");
  const [delItem, setDelItem] = useState<Item | null>(null);
  const [newCat, setNewCat] = useState<string | null>(null);
  // One request at a time from any dialog: a second click must not add the same dish twice.
  const [busy, setBusy] = useState(false);
  const [tried, setTried] = useState(false);
  const once = async (work: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try { await work(); } finally { setBusy(false); }
  };

  const load = useCallback(async () => {
    const c = await run(get<Category[]>("/v1/hotel/menu"));
    if (c) setCats(c);
  }, [run]);
  useEffect(() => { void load(); }, [load]);

  if (!cats) return <div className="empty">Loading menu…</div>;
  const all = cats.flatMap((c) => c.items.map((i) => ({ ...i, cat: c.name })));
  const items = all.filter((i) => (!cat || i.category_id === cat) && (!q || i.name.toLowerCase().includes(q.toLowerCase())));
  const off = all.filter((i) => !i.is_available).length;

  const edit = (i?: Item) => {
    setErr("");
    setTried(false);
    if (!cats.length) return toast("Add a category first");
    setDraft(i ? { id: i.id, category_id: i.category_id, name: i.name, description: i.description, price: i.price, half_price: i.half_price, food_type: i.food_type }
      : { id: null, category_id: cat ?? cats[0].id, name: "", description: "", price: 0, half_price: 0, food_type: "veg" });
  };
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d));
  // Field errors, shown under each field after the first Save.
  const dishErrs = draft
    ? {
        name: check.required(draft.name, "the dish name"),
        price: draft.price ? check.price(draft.price) : "Enter the price.",
        half: draft.half_price && draft.half_price >= draft.price ? "Half price must be less than the full price." : "",
      }
    : { name: "", price: "", half: "" };
  const dishErr = (k: keyof typeof dishErrs) => (tried && dishErrs[k] ? <div className="err">{dishErrs[k]}</div> : null);
  const save = () => once(async () => {
    if (!draft) return;
    setTried(true);
    if (Object.values(dishErrs).some(Boolean)) return setErr("Please fix the fields marked in red.");
    setErr("");
    const { id, ...body } = draft;
    const ok = await run(id ? patch<Item>(`/v1/hotel/menu/items/${id}`, { ...body, name: body.name.trim(), description: body.description.trim() }) : post<Item>("/v1/hotel/menu/items", { ...body, name: body.name.trim(), description: body.description.trim() }), id ? "Dish updated" : "Dish added");
    if (ok) { setDraft(null); void load(); }
  });
  const toggle = async (i: Item) => {
    // Optimistic: flip now, undo if the server says no.
    setCats((cs) => cs!.map((c) => ({ ...c, items: c.items.map((x) => (x.id === i.id ? { ...x, is_available: !x.is_available } : x)) })));
    const ok = await run(patch<Item>(`/v1/hotel/menu/items/${i.id}`, { is_available: !i.is_available }), `${i.name} is now ${i.is_available ? "sold out" : "available"}`);
    if (!ok) void load();
  };

  return (
    <>
      <div className="ph">
        <div>
          <h1>Menu</h1>
          <div className="muted sm">{all.length} dishes · {off} sold out. Changes show to customers straight away.</div>
        </div>
        <div className="row wrap">
          <button className="btn o" onClick={() => setNewCat("")}><Icon name="plus" size={18} /> Add category</button>
          <button className="btn" onClick={() => edit()}><Icon name="plus" size={18} /> Add dish</button>
        </div>
      </div>

      <div className="menu-lay">
        <div className="card cats" style={{ padding: 8 }}>
          <button className={`c ${!cat ? "on" : ""}`} onClick={() => setCat(null)}>All dishes<span className="xs muted">{all.length}</span></button>
          {cats.map((c) => (
            <button key={c.id} className={`c ${cat === c.id ? "on" : ""}`} onClick={() => setCat(c.id)}>{c.name}<span className="xs muted">{c.items.length}</span></button>
          ))}
        </div>
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--line)" }}>
            <input className="fld" aria-label="Search dishes" placeholder="Search dishes" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 340 }} />
          </div>
          <div className="tw">
            <table>
              <thead>
                <tr><th>Dish</th><th>Category</th><th className="num">Price</th><th>Available</th><th><span className="sr">Actions</span></th></tr>
              </thead>
              <tbody>
                {items.length ? items.map((i) => (
                  <tr key={i.id}>
                    <td>
                      <div className="row"><VegMark t={i.food_type} /><div><b style={{ fontWeight: 600 }}>{i.name}</b><div className="xs muted">{i.description}</div></div></div>
                    </td>
                    <td className="sm">{i.cat}</td>
                    <td className="num"><b>{inr(i.price)}</b>{i.half_price > 0 && <div className="xs muted">Half {inr(i.half_price)}</div>}</td>
                    <td>
                      <div className="row">
                        <Switch on={i.is_available} label={`Available: ${i.name}`} onChange={() => toggle(i)} />
                        <span className={`xs ${i.is_available ? "" : "muted"}`}>{i.is_available ? "Available" : "Sold out"}</span>
                      </div>
                    </td>
                    <td>
                      <div className="row" style={{ justifyContent: "flex-end", gap: 6 }}>
                        <button className="ib" onClick={() => edit(i)} aria-label={`Edit ${i.name}`}><Icon name="edit" size={18} /></button>
                        <button className="ib" onClick={() => setDelItem(i)} aria-label={`Delete ${i.name}`}><Icon name="trash" size={18} color="var(--danger)" /></button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={5}><div className="empty">{all.length ? "No dishes found." : "Your menu is empty. Add a category, then your dishes."}</div></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {draft && (
        <Modal onClose={() => setDraft(null)}>
          <h2>{draft.id ? "Edit dish" : "Add dish"}</h2>
          <div className="col" style={{ gap: 12, marginTop: 12 }}>
            <div><label className="fl" htmlFor="i_name">Dish name</label><input className="fld" id="i_name" maxLength={50} value={draft.name} onChange={(e) => set("name", e.target.value)} aria-invalid={tried && !!dishErrs.name} />{dishErr("name")}</div>
            <div className="grid2" style={{ gap: 12 }}>
              <div><label className="fl" htmlFor="i_price">Price (₹)</label><input className="fld" id="i_price" inputMode="numeric" maxLength={4} value={draft.price || ""} onChange={(e) => set("price", rupees(e.target.value, LIMITS.priceMax))} aria-invalid={tried && !!dishErrs.price} />{dishErr("price")}</div>
              <div><label className="fl" htmlFor="i_half">Half price (optional)</label><input className="fld" id="i_half" inputMode="numeric" maxLength={4} value={draft.half_price || ""} onChange={(e) => set("half_price", rupees(e.target.value, LIMITS.priceMax))} aria-invalid={tried && !!dishErrs.half} />{dishErr("half")}</div>
            </div>
            <div>
              <label className="fl" htmlFor="i_cat">Category</label>
              <select className="fld" id="i_cat" value={draft.category_id} onChange={(e) => set("category_id", e.target.value)}>
                {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div><label className="fl" htmlFor="i_desc">Short description</label><input className="fld" id="i_desc" maxLength={80} value={draft.description} onChange={(e) => set("description", e.target.value)} /></div>
            <div>
              <div className="fl">Food type</div>
              <div className="row">
                {(["veg", "nonveg"] as FoodType[]).map((t) => (
                  <button key={t} className={`chip ${draft.food_type === t ? "on" : ""}`} onClick={() => set("food_type", t)} aria-pressed={draft.food_type === t}>
                    <VegMark t={t} /> {t === "veg" ? "Veg" : "Non-veg"}
                  </button>
                ))}
              </div>
            </div>
            {err && <div className="err" role="alert">{err}</div>}
          </div>
          <div className="row" style={{ marginTop: 18 }}>
            <button className="btn o grow" disabled={busy} onClick={() => setDraft(null)}>Cancel</button>
            <button className="btn grow" disabled={busy} onClick={save}>{busy ? "Saving…" : "Save dish"}</button>
          </div>
        </Modal>
      )}

      {delItem && (
        <Modal onClose={() => setDelItem(null)}>
          <h2>Delete {delItem.name}?</h2>
          <p className="muted">This removes it from your menu. If you only want to pause it, switch off Available instead.</p>
          <div className="row">
            <button className="btn o grow" disabled={busy} onClick={() => setDelItem(null)}>Keep</button>
            <button className="btn red grow" disabled={busy} onClick={() => once(async () => { if (await run(del(`/v1/hotel/menu/items/${delItem.id}`).then(() => true), "Dish deleted")) { setDelItem(null); void load(); } })}>{busy ? "Deleting…" : "Delete"}</button>
          </div>
        </Modal>
      )}

      {newCat !== null && (
        <Modal onClose={() => setNewCat(null)}>
          <h2>Add category</h2>
          <label className="fl" htmlFor="c_name" style={{ marginTop: 12 }}>Category name</label>
          <input className="fld" id="c_name" placeholder="For example, Desserts" maxLength={30} value={newCat} onChange={(e) => setNewCat(e.target.value)} />
          <div className="row" style={{ marginTop: 18 }}>
            <button className="btn o grow" disabled={busy} onClick={() => setNewCat(null)}>Cancel</button>
            <button className="btn grow" disabled={busy} onClick={() => once(async () => {
              if (!newCat.trim()) return toast("Type a category name");
              if (cats.some((c) => c.name.toLowerCase() === newCat.trim().toLowerCase())) return toast("That category already exists");
              const c = await run(post<Category>("/v1/hotel/menu/categories", { name: newCat.trim(), sort: cats.length + 1 }), "Category added");
              if (c) { setNewCat(null); void load(); }
            })}>{busy ? "Adding…" : "Add"}</button>
          </div>
        </Modal>
      )}
    </>
  );
}
