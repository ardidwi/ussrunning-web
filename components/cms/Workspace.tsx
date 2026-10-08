"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useDemo } from "./DemoProvider";
import { Field, ImageField, Barcode, DownloadBarcode } from "./Controls";
import {
  Field as FormField,
  Select,
  PageLoading,
  Input,
} from "@/components/ui";
import {
  Role,
  roleLabels,
  can,
  newAccount,
  Story,
  validImage,
} from "@/lib/cms";
export default function Workspace({ member = false }: { member?: boolean }) {
  const { state, ready, error, account, select, update } = useDemo();
  const [tab, setTab] = useState("Ringkasan");
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [story, setStory] = useState<Story | null>(null);
  const [query, setQuery] = useState("");
  useEffect(() => {
    if (!story) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [story]);
  if (!ready)
    return (
      <main className="cms-shell">
        <PageLoading label="Memuat workspace…" />
      </main>
    );
  const role = account?.role || "member";
  const tabs = member
    ? ["Ringkasan", "Profil", "ID & barcode", "Event saya"]
    : [
        "Ringkasan",
        "Konten website",
        "Stories",
        "Galeri",
        "Event",
        ...(can(role, "users") ? ["Pengguna"] : []),
        "Aktivitas",
      ];
  function save(fn: Parameters<typeof update>[0], action: string) {
    if (update(fn, action)) setMessage(action + " · tersimpan di browser ini.");
  }
  function demo(role: Role) {
    const found = state.accounts.find((a) => a.role === role);
    if (found) {
      select(found.id);
      return;
    }
    const created = newAccount("Demo " + roleLabels[role], role);
    if (
      update(
        (s) => ({ ...s, accounts: [...s.accounts, created] }),
        "Buat akun demo",
      )
    )
      select(created.id);
  }
  return (
    <main className="cms-shell">
      <aside className="cms-nav">
        <Link href="/" className="cms-brand">
          USS®<small>Community workspace</small>
        </Link>
        <nav aria-label="Menu dashboard">
          {tabs.map((t) => (
            <button
              key={t}
              aria-current={tab === t ? "page" : undefined}
              onClick={() => {
                setTab(t);
                setMessage("");
              }}
            >
              {t}
            </button>
          ))}
        </nav>
        <Link href="/">Lihat website</Link>
        <Link href={member ? "/admin" : "/dashboard"}>
          {member ? "Preview CMS" : "Preview Member"}
        </Link>
      </aside>
      <section className="cms-main">
        <div className="cms-demo-note">
          <strong>MODE DEMO</strong>
          <span>
            Data hanya di browser ini. Login dan sinkronisasi belum aktif.
          </span>
        </div>
        <header className="cms-top">
          <div>
            <span>MY USS / {member ? "MEMBER" : "CMS"}</span>
            <h1>{tab}</h1>
          </div>
          <span className="cms-badge">
            {account ? roleLabels[role] : "Pilih preview"}
          </span>
        </header>
        <div className="cms-role-picker" aria-label="Simulasi role">
          {(["member", "admin", "super_admin"] as Role[]).map((r) => (
            <button
              aria-pressed={account?.role === r}
              key={r}
              onClick={() => demo(r)}
            >
              Demo {roleLabels[r]}
            </button>
          ))}
        </div>
        {error && (
          <p className="cms-notice" role="alert">
            {error}
          </p>
        )}
        <p className="cms-feedback" role="status">
          {message}
        </p>
        {!account ? (
          <section className="cms-panel">
            <h2>Pilih role untuk mencoba</h2>
            <p>
              Akun contoh memiliki ID unik dan barcode sendiri. Tidak perlu
              memasukkan email atau kata sandi.
            </p>
          </section>
        ) : !member && !can(role, "content") ? (
          <section className="cms-panel">
            <h2>Akses CMS hanya untuk pengelola</h2>
            <p>Role Member mengakses profil dan identitas sendiri.</p>
            <Link href="/dashboard">Buka dashboard Member</Link>
          </section>
        ) : (
          <>
            {tab === "Ringkasan" && (
              <>
                <div className="cms-metrics">
                  <div>
                    <strong>
                      {member
                        ? account.name
                        : state.stories.filter((s) => s.status === "published")
                            .length}
                    </strong>
                    <span>{member ? "Profil demo" : "Stories published"}</span>
                  </div>
                  <div>
                    <strong>{member ? "0" : state.gallery.length}</strong>
                    <span>{member ? "Pendaftaran" : "Foto galeri"}</span>
                  </div>
                  <div>
                    <strong>{member ? "Gratis" : state.accounts.length}</strong>
                    <span>{member ? "Membership" : "Akun demo"}</span>
                  </div>
                </div>
                <section className="cms-panel">
                  <h2>
                    {member
                      ? "Satu identitas untuk komunitas."
                      : "Kelola USS dari satu tempat."}
                  </h2>
                  <p>
                    {member
                      ? "Profil dan barcode akun terhubung ke identitas yang sama. Pendaftaran dan riwayat nyata aktif setelah backend terhubung."
                      : "Edit konten, siapkan Stories, dan pilih foto asli. Publish demo hanya memengaruhi browser ini."}
                  </p>
                  <button
                    onClick={() =>
                      setTab(member ? "ID & barcode" : "Konten website")
                    }
                  >
                    {member ? "Lihat ID & barcode" : "Edit website"}
                  </button>
                </section>
              </>
            )}
            {(tab === "Profil" || tab === "ID & barcode") && (
              <section className="cms-panel">
                <h2>{account.name}</h2>
                <p className="cms-id">{account.memberId}</p>
                <Barcode value={account.barcode} />
                <DownloadBarcode value={account.barcode} />
                <p>
                  Barcode Code 39 berisi ID demo saja, tanpa email atau nomor
                  HP. Bukan tiket event atau bukti login.
                </p>
                {tab === "Profil" && (
                  <form
                    noValidate
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!name.trim()) {
                        setMessage("Isi nama terlebih dahulu.");
                        return;
                      }
                      save(
                        (s) => ({
                          ...s,
                          accounts: s.accounts.map((a) =>
                            a.id === account.id
                              ? { ...a, name: name.trim() }
                              : a,
                          ),
                        }),
                        "Profil diperbarui",
                      );
                    }}
                  >
                    <Field
                      label="Nama tampilan"
                      value={name}
                      onChange={setName}
                    />
                    <button>Simpan profil</button>
                  </form>
                )}
              </section>
            )}
            {tab === "Event saya" && (
              <section className="cms-panel">
                <h2>Belum ada pendaftaran</h2>
                <p>
                  Pendaftaran dan tiket per event akan tersedia setelah Neon
                  terhubung.
                </p>
                <Link href="/runs">Jelajahi event</Link>
              </section>
            )}
            {tab === "Konten website" && (
              <section className="cms-panel">
                <h2>Homepage & login</h2>
                <p>
                  Perubahan masuk draft. Publish untuk melihat hasil pada
                  browser yang sama.
                </p>
                <Field
                  label="Headline"
                  multiline
                  value={state.draft.headline}
                  onChange={(v) =>
                    save(
                      (s) => ({ ...s, draft: { ...s.draft, headline: v } }),
                      "Draft diperbarui",
                    )
                  }
                />
                <Field
                  label="Deskripsi"
                  multiline
                  value={state.draft.description}
                  onChange={(v) =>
                    save(
                      (s) => ({ ...s, draft: { ...s.draft, description: v } }),
                      "Draft diperbarui",
                    )
                  }
                />
                <div className="cms-columns">
                  {(["desktop", "mobile", "loginBackground"] as const).map(
                    (key) => (
                      <ImageField
                        key={key}
                        label={
                          key === "desktop"
                            ? "Background desktop"
                            : key === "mobile"
                              ? "Background mobile"
                              : "Background login"
                        }
                        value={state.draft[key]}
                        onChange={(v) =>
                          save(
                            (s) => ({ ...s, draft: { ...s.draft, [key]: v } }),
                            "Draft gambar diperbarui",
                          )
                        }
                      />
                    ),
                  )}
                </div>
                <FormField
                  label={`Posisi fokus: ${state.draft.focus}%`}
                  hint="Atur posisi visual utama pada pratinjau hero."
                >
                  <Input
                    type="range"
                    min="0"
                    max="100"
                    value={state.draft.focus}
                    onChange={(e) =>
                      save(
                        (s) => ({
                          ...s,
                          draft: { ...s.draft, focus: Number(e.target.value) },
                        }),
                        "Fokus diperbarui",
                      )
                    }
                  />
                </FormField>
                <FormField
                  label={`Overlay: ${state.draft.overlay}%`}
                  hint="Atur lapisan gelap agar teks hero mudah dibaca."
                >
                  <Input
                    type="range"
                    min="0"
                    max="85"
                    value={state.draft.overlay}
                    onChange={(e) =>
                      save(
                        (s) => ({
                          ...s,
                          draft: {
                            ...s.draft,
                            overlay: Number(e.target.value),
                          },
                        }),
                        "Overlay diperbarui",
                      )
                    }
                  />
                </FormField>
                <Field
                  label="Footer note"
                  value={state.draft.footer}
                  onChange={(v) =>
                    save(
                      (s) => ({ ...s, draft: { ...s.draft, footer: v } }),
                      "Draft footer diperbarui",
                    )
                  }
                />
                <div
                  className="cms-hero-preview"
                  style={{
                    backgroundImage: validImage(state.draft.desktop)
                      ? `linear-gradient(rgb(0 0 0 / ${state.draft.overlay / 100}),rgb(0 0 0 / ${state.draft.overlay / 100})),url("${state.draft.desktop}")`
                      : undefined,
                    backgroundPosition: `${state.draft.focus}% center`,
                  }}
                >
                  <h2>{state.draft.headline}</h2>
                  <p>{state.draft.description}</p>
                </div>
                <button
                  onClick={() => {
                    if (
                      !state.draft.headline.trim() ||
                      !["desktop", "mobile", "loginBackground"].every((k) =>
                        validImage(state.draft[k as "desktop"]),
                      )
                    ) {
                      setMessage(
                        "Isi headline dan gunakan URL gambar yang valid.",
                      );
                      return;
                    }
                    save(
                      (s) => ({ ...s, published: { ...s.draft } }),
                      "Konten dipublish",
                    );
                  }}
                >
                  Publish demo
                </button>{" "}
                <Link href="/" target="_blank">
                  Preview website
                </Link>
              </section>
            )}
            {tab === "Stories" && (
              <section className="cms-panel">
                <div className="cms-heading">
                  <h2>USS Stories</h2>
                  <button
                    onClick={() =>
                      setStory({
                        id: crypto.randomUUID(),
                        slug: "",
                        title: "",
                        summary: "",
                        body: "",
                        category: "Community",
                        author: account.name,
                        cover: "",
                        status: "draft",
                        featured: false,
                        publishedAt: null,
                      })
                    }
                  >
                    Buat Story
                  </button>
                </div>
                {story ? (
                  <form
                    noValidate
                    onSubmit={(e) => {
                      e.preventDefault();
                      const slug = story.slug.trim().toLowerCase();
                      if (
                        !story.title.trim() ||
                        !story.body.trim() ||
                        !slug ||
                        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ||
                        !validImage(story.cover)
                      ) {
                        setMessage(
                          "Isi judul dan artikel, gunakan slug huruf kecil dengan tanda hubung, serta URL cover yang valid.",
                        );
                        return;
                      }
                      if (
                        state.stories.some(
                          (s) => s.slug === slug && s.id !== story.id,
                        )
                      ) {
                        setMessage("Slug sudah digunakan. Pilih slug lain.");
                        return;
                      }
                      const value = {
                        ...story,
                        slug,
                        publishedAt:
                          story.status === "published"
                            ? story.publishedAt || new Date().toISOString()
                            : story.publishedAt,
                      };
                      if (
                        update(
                          (s) => ({
                            ...s,
                            stories: [
                              value,
                              ...s.stories.filter((x) => x.id !== value.id),
                            ],
                          }),
                          "Story disimpan",
                        )
                      ) {
                        setStory(null);
                        setMessage("Story tersimpan di browser ini.");
                      }
                    }}
                  >
                    {(
                      [
                        "title",
                        "slug",
                        "summary",
                        "category",
                        "author",
                        "body",
                      ] as const
                    ).map((k) => (
                      <Field
                        key={k}
                        label={
                          {
                            title: "Judul",
                            slug: "Slug URL",
                            summary: "Ringkasan",
                            category: "Kategori",
                            author: "Penulis",
                            body: "Isi artikel",
                          }[k]
                        }
                        value={story[k]}
                        multiline={k === "body" || k === "summary"}
                        onChange={(v) => setStory({ ...story, [k]: v })}
                      />
                    ))}
                    <ImageField
                      label="Cover"
                      value={story.cover}
                      onChange={(v) => setStory({ ...story, cover: v })}
                    />
                    <FormField
                      label="Status"
                      hint="Draft tidak tampil publik. Published tampil di daftar dan artikel."
                    >
                      <Select
                        value={story.status}
                        onChange={(e) =>
                          setStory({
                            ...story,
                            status: e.target.value as Story["status"],
                          })
                        }
                      >
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                        <option value="archived">Arsip</option>
                      </Select>
                    </FormField>
                    <label className="cms-check">
                      <input
                        type="checkbox"
                        checked={story.featured}
                        onChange={(e) =>
                          setStory({ ...story, featured: e.target.checked })
                        }
                      />
                      Featured Story
                    </label>
                    <section className="cms-story-preview">
                      <small>Preview artikel</small>
                      <h2>{story.title || "Judul Story"}</h2>
                      <p>{story.summary}</p>
                      <div>{story.body}</div>
                    </section>
                    <button>Simpan Story</button>
                    <button type="button" onClick={() => setStory(null)}>
                      Batal
                    </button>
                  </form>
                ) : (
                  <>
                    <div className="cms-search">
                      <Field
                        label="Cari Stories"
                        value={query}
                        onChange={setQuery}
                      />
                      {query && (
                        <button
                          aria-label="Hapus pencarian"
                          onClick={() => setQuery("")}
                        >
                          Hapus
                        </button>
                      )}
                    </div>
                    {state.stories
                      .filter((s) =>
                        (s.title + " " + s.category)
                          .toLowerCase()
                          .includes(query.toLowerCase()),
                      )
                      .slice(0, 30)
                      .map((s) => (
                        <div className="cms-row" key={s.id}>
                          <div>
                            <strong>{s.title}</strong>
                            <small>
                              {s.category} · {s.status}
                              {s.featured ? " · Featured" : ""}
                            </small>
                          </div>
                          <button onClick={() => setStory({ ...s })}>
                            Edit
                          </button>
                          {s.status === "published" && (
                            <Link href={"/stories/" + s.slug}>Baca</Link>
                          )}
                        </div>
                      ))}
                    {!state.stories.length && (
                      <p>
                        Belum ada Stories. Buat tulisan pertama untuk media USS.
                      </p>
                    )}
                    <small>
                      Maksimal 30 hasil ditampilkan. Gunakan pencarian untuk
                      menemukan tulisan.
                    </small>
                  </>
                )}
              </section>
            )}
            {tab === "Galeri" && (
              <section className="cms-panel">
                <h2>Foto komunitas</h2>
                <button
                  onClick={() =>
                    save(
                      (s) => ({
                        ...s,
                        gallery: [
                          ...s.gallery,
                          {
                            id: crypto.randomUUID(),
                            url: "",
                            caption: "",
                            visible: false,
                          },
                        ],
                      }),
                      "Foto ditambahkan",
                    )
                  }
                >
                  Tambah foto
                </button>
                {!state.gallery.length && (
                  <p>Belum ada foto. Upload dokumentasi asli dari perangkat.</p>
                )}
                {state.gallery.map((m, index) => (
                  <div className="cms-gallery-editor" key={m.id}>
                    <ImageField
                      label={"Foto " + (index + 1)}
                      value={m.url}
                      onChange={(v) =>
                        save(
                          (s) => ({
                            ...s,
                            gallery: s.gallery.map((x) =>
                              x.id === m.id ? { ...x, url: v } : x,
                            ),
                          }),
                          "Foto disimpan",
                        )
                      }
                    />
                    <Field
                      label="Caption"
                      value={m.caption}
                      onChange={(v) =>
                        save(
                          (s) => ({
                            ...s,
                            gallery: s.gallery.map((x) =>
                              x.id === m.id ? { ...x, caption: v } : x,
                            ),
                          }),
                          "Caption disimpan",
                        )
                      }
                    />
                    <label className="cms-check">
                      <input
                        type="checkbox"
                        checked={m.visible}
                        onChange={(e) => {
                          if (!m.url || !validImage(m.url)) {
                            setMessage("Pilih foto yang valid dahulu.");
                            return;
                          }
                          save(
                            (s) => ({
                              ...s,
                              gallery: s.gallery.map((x) =>
                                x.id === m.id
                                  ? { ...x, visible: e.target.checked }
                                  : x,
                              ),
                            }),
                            "Visibilitas diperbarui",
                          );
                        }}
                      />
                      Tampilkan di website
                    </label>
                    <button
                      disabled={index === 0}
                      onClick={() =>
                        save((s) => {
                          [s.gallery[index - 1], s.gallery[index]] = [
                            s.gallery[index],
                            s.gallery[index - 1],
                          ];
                          return s;
                        }, "Urutan diperbarui")
                      }
                    >
                      Pindah ke atas
                    </button>
                  </div>
                ))}
              </section>
            )}
            {tab === "Event" && (
              <section className="cms-panel">
                <h2>Kerangka pengelolaan event</h2>
                <p>
                  Data event contoh. Perubahan demo belum mengubah registrasi
                  publik.
                </p>
                {state.events.map((ev) => (
                  <div className="cms-gallery-editor" key={ev.id}>
                    <Field
                      label="Nama event"
                      value={ev.title}
                      onChange={(v) =>
                        save(
                          (s) => ({
                            ...s,
                            events: s.events.map((x) =>
                              x.id === ev.id ? { ...x, title: v } : x,
                            ),
                          }),
                          "Draft event disimpan",
                        )
                      }
                    />
                    <Field
                      label="Tanggal"
                      value={ev.date}
                      onChange={(v) =>
                        save(
                          (s) => ({
                            ...s,
                            events: s.events.map((x) =>
                              x.id === ev.id ? { ...x, date: v } : x,
                            ),
                          }),
                          "Draft event disimpan",
                        )
                      }
                    />
                    <Field
                      label="Lokasi"
                      value={ev.location}
                      onChange={(v) =>
                        save(
                          (s) => ({
                            ...s,
                            events: s.events.map((x) =>
                              x.id === ev.id ? { ...x, location: v } : x,
                            ),
                          }),
                          "Draft event disimpan",
                        )
                      }
                    />
                    <Field
                      label="Kuota contoh"
                      type="number"
                      value={String(ev.capacity)}
                      onChange={(v) =>
                        save(
                          (s) => ({
                            ...s,
                            events: s.events.map((x) =>
                              x.id === ev.id
                                ? {
                                    ...x,
                                    capacity: Math.max(
                                      0,
                                      Math.floor(Number(v) || 0),
                                    ),
                                  }
                                : x,
                            ),
                          }),
                          "Kuota demo disimpan",
                        )
                      }
                    />
                  </div>
                ))}
              </section>
            )}
            {tab === "Pengguna" && can(role, "users") && (
              <section className="cms-panel">
                <h2>Akun & role demo</h2>
                <form
                  noValidate
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!name.trim()) {
                      setMessage("Isi nama terlebih dahulu.");
                      return;
                    }
                    save(
                      (s) => ({
                        ...s,
                        accounts: [...s.accounts, newAccount(name.trim())],
                      }),
                      "Member demo dibuat",
                    );
                    setName("");
                  }}
                >
                  <Field
                    label="Nama Member baru"
                    value={name}
                    onChange={setName}
                  />
                  <button>Buat Member demo</button>
                </form>
                {state.accounts.map((a) => (
                  <div className="cms-row" key={a.id}>
                    <div>
                      <strong>{a.name}</strong>
                      <small className="cms-id">{a.memberId}</small>
                    </div>
                    <FormField
                      label="Role demo"
                      hint="Simulasi akses di browser ini; bukan izin produksi."
                    >
                      <Select
                        disabled={a.id === account.id}
                        aria-label={"Role " + a.name}
                        value={a.role}
                        onChange={(e) =>
                          save(
                            (s) => ({
                              ...s,
                              accounts: s.accounts.map((x) =>
                                x.id === a.id
                                  ? { ...x, role: e.target.value as Role }
                                  : x,
                              ),
                            }),
                            "Role demo diperbarui",
                          )
                        }
                      >
                        {Object.entries(roleLabels).map(([r, label]) => (
                          <option key={r} value={r}>
                            {label}
                          </option>
                        ))}
                      </Select>
                    </FormField>
                  </div>
                ))}
                <p>
                  Role pada akun yang sedang digunakan tidak bisa diubah di
                  layar ini.
                </p>
              </section>
            )}
            {tab === "Aktivitas" && (
              <section className="cms-panel">
                <h2>Riwayat demo</h2>
                {state.activity.map((a) => (
                  <div className="cms-row" key={a.id}>
                    <div>
                      <strong>{a.action}</strong>
                      <small>
                        {a.actor} ·{" "}
                        {new Intl.DateTimeFormat("id-ID", {
                          dateStyle: "medium",
                          timeStyle: "short",
                          timeZone: "Asia/Jakarta",
                        }).format(new Date(a.at))}{" "}
                        WIB
                      </small>
                    </div>
                  </div>
                ))}
              </section>
            )}
          </>
        )}
      </section>
    </main>
  );
}
