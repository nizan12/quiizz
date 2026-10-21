"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { db, collection, query, where, getDocs } from "@/lib/firebase";
import { AVATAR_PRESETS, AVATAR_STYLES, getAvatarUrl, generateRandomSeed, getAvatarInfo } from "@/lib/avatar";

export default function HomePage() {
  const router = useRouter();
  const tabsRef = useRef(null);
  const isDraggingTabs = useRef(false);
  const dragStartX = useRef(0);
  const dragScrollLeft = useRef(0);
  const hasMovedTabs = useRef(false);

  const [inviteCode, setInviteCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [playerNim, setPlayerNim] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_PRESETS[0].id);
  const [avatarTab, setAvatarTab] = useState("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const scrollTabs = (offset) => {
    if (tabsRef.current) {
      try {
        tabsRef.current.scrollBy({ left: offset, behavior: "smooth" });
      } catch {
        tabsRef.current.scrollLeft += offset;
      }
    }
  };

  const handleTabsWheel = (e) => {
    if (tabsRef.current) {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        return;
      }
      if (e.deltaY !== 0) {
        e.preventDefault();
        tabsRef.current.scrollLeft += e.deltaY;
      }
    }
  };

  const handleTabsMouseDown = (e) => {
    if (!tabsRef.current) return;
    isDraggingTabs.current = true;
    hasMovedTabs.current = false;
    dragStartX.current = e.pageX - tabsRef.current.offsetLeft;
    dragScrollLeft.current = tabsRef.current.scrollLeft;
  };

  const handleTabsMouseLeaveOrUp = () => {
    isDraggingTabs.current = false;
  };

  const handleTabsMouseMove = (e) => {
    if (!isDraggingTabs.current || !tabsRef.current) return;
    const x = e.pageX - tabsRef.current.offsetLeft;
    const walk = (x - dragStartX.current);
    if (Math.abs(walk) > 3) {
      hasMovedTabs.current = true;
    }
    tabsRef.current.scrollLeft = dragScrollLeft.current - walk;
  };

  useEffect(() => {
    setSelectedAvatar(
      AVATAR_PRESETS[Math.floor(Math.random() * AVATAR_PRESETS.length)].id
    );
  }, []);

  const handleJoinQuiz = async (e) => {
    e.preventDefault();
    if (!inviteCode.trim() || !playerName.trim() || !playerNim.trim()) {
      setError("Mohon isi kode undangan, nama, dan NIM Anda");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const q = query(
        collection(db, "quizzes"),
        where("inviteCode", "==", inviteCode.trim().toUpperCase())
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setError("Kode undangan tidak ditemukan");
        setLoading(false);
        return;
      }

      const quizDoc = snapshot.docs[0];
      const quizData = quizDoc.data();

      if (quizData.status === "completed") {
        setError("Quiz ini sudah selesai");
        setLoading(false);
        return;
      }

      router.push(
        `/quiz/${inviteCode.trim().toUpperCase()}?name=${encodeURIComponent(
          playerName.trim()
        )}&nim=${encodeURIComponent(playerNim.trim())}&avatar=${encodeURIComponent(
          selectedAvatar
        )}`
      );
    } catch (err) {
      console.error("Error joining quiz:", err);
      setError("Terjadi kesalahan. Coba lagi.");
      setLoading(false);
    }
  };

  const avatarInfo = getAvatarInfo(selectedAvatar);

  return (
    <>
      {/* Navbar */}
      <nav className="navbar">
        <Link href="/" className="navbar-brand">
          QuizMaster<span className="brand-dot"></span>
        </Link>
        <div className="navbar-links">
          <Link href="/admin" className="btn btn-secondary btn-sm">
            Admin Panel
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="hero-content animate-fade-in-up">
          <h1 className="hero-title">
            Quiz Iya Quiz
          </h1>
          <p className="hero-subtitle">
            Bergabung dengan quiz menggunakan kode undangan, jawab pertanyaan
            dengan cepat, dan bersaing di leaderboard secara langsung.
          </p>

          {/* Join Card Landscape */}
          <div className="join-card-landscape animate-fade-in-up delay-200">
            {/* Left Column: Form */}
            <div className="join-form-col">
              <div>
                <div className="join-badge">
                  <span className="join-badge-dot"></span>
                  <span>Quiz Room</span>
                </div>
                <h2 className="join-form-title">Gabung Quiz</h2>
                <p className="join-form-subtitle">
                  Masukkan kode &amp; identitas Anda untuk mulai bertanding.
                </p>

                <form id="join-quiz-form" onSubmit={handleJoinQuiz}>
                  <div className="input-group" style={{ marginBottom: "1rem" }}>
                    <label htmlFor="invite-code">Kode Undangan</label>
                    <input
                      id="invite-code"
                      type="text"
                      className="input input-lg"
                      placeholder="Contoh: AB12CD"
                      value={inviteCode}
                      onChange={(e) =>
                        setInviteCode(e.target.value.toUpperCase())
                      }
                      maxLength={6}
                      style={{ fontWeight: 800, letterSpacing: "2px" }}
                    />
                  </div>

                  <div className="input-group" style={{ marginBottom: "1rem" }}>
                    <label htmlFor="player-name">Nama Lengkap</label>
                    <input
                      id="player-name"
                      type="text"
                      className="input"
                      placeholder="Masukkan nama Anda"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      maxLength={30}
                    />
                  </div>

                  <div className="input-group" style={{ marginBottom: "1.5rem" }}>
                    <label htmlFor="player-nim">NIM</label>
                    <input
                      id="player-nim"
                      type="text"
                      className="input"
                      placeholder="Masukkan NIM Anda"
                      value={playerNim}
                      onChange={(e) => setPlayerNim(e.target.value)}
                      maxLength={20}
                    />
                  </div>

                  {error && (
                    <div className="join-error-banner" style={{ marginBottom: "1rem" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="btn btn-purple btn-lg join-submit-btn"
                    disabled={loading}
                    style={{ marginTop: "0.25rem" }}
                  >
                    {loading ? (
                      <>
                        <span className="spinner spinner-sm"></span>
                        <span>Mencari Quiz...</span>
                      </>
                    ) : (
                      <>
                        <span>Gabung Sekarang</span>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="5" y1="12" x2="19" y2="12" />
                          <polyline points="12 5 19 12 12 19" />
                        </svg>
                      </>
                    )}
                  </button>
                </form>
              </div>

              <div>
                <div className="join-divider">atau</div>
                <Link href="/admin" className="btn btn-light join-admin-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                  </svg>
                  <span>Buat / Kelola Quiz Baru</span>
                </Link>
              </div>
            </div>

            {/* Right Column: Avatar Studio */}
            <div className="join-avatar-col">
              <div className="avatar-header">
                <div>
                  <h3 className="avatar-title">Pilih Avatar</h3>
                  <p className="avatar-subtitle">
                    {avatarTab === "all"
                      ? `${AVATAR_PRESETS.length} variasi karakter tersedia`
                      : `${AVATAR_PRESETS.filter((p) => p.group === avatarTab).length} karakter di kategori ${AVATAR_STYLES.find(s => s.id === avatarTab)?.label || ""}`}
                  </p>
                </div>
              </div>

              {/* Active Avatar Spotlight Card */}
              <div className="avatar-showcase-box">
                <div className="avatar-preview-ring">
                  <img
                    src={getAvatarUrl(selectedAvatar)}
                    alt="Selected Avatar"
                    className="avatar-preview-img"
                  />
                </div>
                <div className="avatar-preview-info">
                  <span className="avatar-preview-badge">Avatar Terpilih</span>
                  <div className="avatar-preview-name">{avatarInfo.label || avatarInfo.name}</div>
                </div>
                <button
                  type="button"
                  className="avatar-random-btn"
                  onClick={() => setSelectedAvatar(generateRandomSeed(avatarTab))}
                  title="Generate karakter acak"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
                  </svg>
                  <span>Acak</span>
                </button>
              </div>

              {/* Category Filter Tabs with Navigation Controls */}
              <div className="avatar-tabs-wrapper">
                <button
                  type="button"
                  className="avatar-tabs-nav-btn"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    scrollTabs(-160);
                  }}
                  title="Geser tab ke kiri"
                  aria-label="Geser tab ke kiri"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6"></polyline>
                  </svg>
                </button>

                <div
                  className="avatar-tabs-bar"
                  ref={tabsRef}
                  onWheel={handleTabsWheel}
                  onMouseDown={handleTabsMouseDown}
                  onMouseLeave={handleTabsMouseLeaveOrUp}
                  onMouseUp={handleTabsMouseLeaveOrUp}
                  onMouseMove={handleTabsMouseMove}
                >
                  {AVATAR_STYLES.map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      className={`avatar-tab-btn ${avatarTab === st.id ? "active" : ""}`}
                      onClick={(e) => {
                        if (hasMovedTabs.current) return;
                        setAvatarTab(st.id);
                      }}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  className="avatar-tabs-nav-btn"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    scrollTabs(160);
                  }}
                  title="Geser tab ke kanan"
                  aria-label="Geser tab ke kanan"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </button>
              </div>

              {/* Avatar Grid (5 columns: 10 items fit in exactly 2 neat rows!) */}
              <div className="avatar-grid-landscape">
                {AVATAR_PRESETS.filter((p) => avatarTab === "all" || p.group === avatarTab).map((preset) => {
                  const isSelected = selectedAvatar === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      className={`avatar-tile-btn ${isSelected ? "selected" : ""}`}
                      onClick={() => setSelectedAvatar(preset.id)}
                      title={preset.label}
                    >
                      <img
                        src={getAvatarUrl(preset.id)}
                        alt={preset.name}
                        loading="lazy"
                      />
                      {isSelected && (
                        <span className="avatar-tile-check">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="avatar-grid-footer">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                <span>Klik avatar untuk memilih, atau gunakan tombol Acak.</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

