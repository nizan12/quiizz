"use client";

import { useState, useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  db,
  doc,
  getDoc,
  updateDoc,
  collection,
  onSnapshot,
  query,
  orderBy,
  where,
} from "@/lib/firebase";

export default function QuizManagePage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const [quiz, setQuiz] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [showQuestions, setShowQuestions] = useState(false);
  const [floatingReactions, setFloatingReactions] = useState([]);
  const audioRef = useRef(null);

  // Track previous scores and ranks for animation
  const prevScoresRef = useRef({});
  const [scoreDeltas, setScoreDeltas] = useState({});
  const [changedIds, setChangedIds] = useState(new Set());

  useEffect(() => {
    const loadQuiz = async () => {
      try {
        const docSnap = await getDoc(doc(db, "quizzes", id));
        if (docSnap.exists()) {
          setQuiz({ id: docSnap.id, ...docSnap.data() });
        } else {
          router.push("/admin");
        }
      } catch (err) {
        console.error("Error loading quiz:", err);
      }
      setLoading(false);
    };

    loadQuiz();
  }, [id, router]);

  // Real-time participants with rank-change tracking
  useEffect(() => {
    if (!id) return;

    const q = query(
      collection(db, "quizzes", id, "participants"),
      orderBy("score", "desc")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      // Detect score changes and compute deltas
      const prevScores = prevScoresRef.current;
      const newDeltas = {};
      const newChanged = new Set();

      data.forEach((p) => {
        const prevScore = prevScores[p.id];
        if (prevScore !== undefined && p.score > prevScore) {
          newDeltas[p.id] = p.score - prevScore;
          newChanged.add(p.id);
        }
      });

      // Store current scores for next comparison
      const currentScores = {};
      data.forEach((p) => {
        currentScores[p.id] = p.score || 0;
      });
      prevScoresRef.current = currentScores;

      if (newChanged.size > 0) {
        setScoreDeltas(newDeltas);
        setChangedIds(newChanged);

        // Clear the delta indicators after 2 seconds
        setTimeout(() => {
          setScoreDeltas({});
          setChangedIds(new Set());
        }, 2000);
      }

      setParticipants(data);
    });

    return () => unsub();
  }, [id]);

  // Real-time floating reactions listener from participants in waiting room
  useEffect(() => {
    if (!id) return;

    const listenerStartTime = Date.now() - 1000;
    const reactionsRef = collection(db, "quizzes", id, "reactions");
    const q = query(reactionsRef, where("timestamp", ">", listenerStartTime));

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const data = change.doc.data();
            const reactionId = change.doc.id || String(Date.now() + Math.random());
            const emoji = data.emoji;
            const left = data.left ?? (Math.random() * 60 + 20);

            setFloatingReactions((prev) => [...prev, { id: reactionId, emoji, left }]);
            setTimeout(() => {
              setFloatingReactions((prev) => prev.filter((r) => r.id !== reactionId));
            }, 2000);
          }
        });
      },
      (err) => {
        console.warn("Reactions listener error in admin:", err);
      }
    );

    return () => unsub();
  }, [id]);

  // Synchronize audio playback
  useEffect(() => {
    if (quiz?.status === "active" && audioRef.current) {
      const audio = audioRef.current;
      
      const syncAudio = () => {
        if (quiz?.startedAt) {
          const elapsed = (Date.now() - quiz.startedAt) / 1000;
          const duration = audio.duration;
          if (duration > 0 && isFinite(duration)) {
            audio.currentTime = elapsed % duration;
          }
        }
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            if (err.name === "AbortError" || err.name === "NotAllowedError") {
              return;
            }
            console.warn("Audio play warning:", err);
          });
        }
      };

      if (audio.readyState >= 1) { // HAVE_METADATA
        syncAudio();
      } else {
        audio.addEventListener("loadedmetadata", syncAudio, { once: true });
        return () => audio.removeEventListener("loadedmetadata", syncAudio);
      }
    }
  }, [quiz?.status, quiz?.startedAt]);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(quiz.inviteCode);
      setCopied(true);
      showToast("Kode berhasil disalin!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast("Gagal menyalin kode", "error");
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      const updateData = { status: newStatus };
      if (newStatus === "active") {
        updateData.startedAt = Date.now();
      }
      await updateDoc(doc(db, "quizzes", id), updateData);
      setQuiz((prev) => ({ ...prev, status: newStatus, startedAt: updateData.startedAt || prev.startedAt }));
      const labels = { draft: "Draft", active: "Aktif", completed: "Selesai" };
      showToast(`Status diubah ke ${labels[newStatus]}`);
    } catch (err) {
      console.error("Error updating status:", err);
      showToast("Gagal mengubah status", "error");
    }
  };

  const getRankClass = (index) => {
    if (index === 0) return "rank-1";
    if (index === 1) return "rank-2";
    if (index === 2) return "rank-3";
    return "rank-other";
  };

  const getBarClass = (index) => {
    if (index === 0) return "bar-1";
    if (index === 1) return "bar-2";
    if (index === 2) return "bar-3";
    return "bar-other";
  };

  const maxScore = participants.length > 0
    ? Math.max(...participants.map((p) => p.score || 0), 1)
    : 1;

  const optionLabels = ["A", "B", "C", "D"];

  if (loading) {
    return (
      <div className="loading-container" style={{ minHeight: "100vh", background: "var(--bg-light)" }}>
        <div className="spinner spinner-dark"></div>
        <p style={{ color: "var(--text-medium)" }}>Memuat quiz...</p>
      </div>
    );
  }

  if (!quiz) return null;

  return (
    <>
      {quiz.musicFileName && quiz.status === "active" && (
        <audio
          ref={audioRef}
          src={quiz.musicFileName.startsWith("http") ? quiz.musicFileName : `/music/${quiz.musicFileName}`}
          loop
          muted={isMuted}
          style={{ display: "none" }}
        />
      )}
      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type}`}>
            {toast.message}
          </div>
        </div>
      )}

      {/* Floating Reactions from waiting room */}
      {floatingReactions.map((r) => (
        <div
          key={r.id}
          className="floating-reaction-item"
          style={{ left: `${r.left}%` }}
        >
          {r.emoji}
        </div>
      ))}

      <nav className="navbar">
        <Link href="/" className="navbar-brand">
          QuizMaster<span className="brand-dot"></span>
        </Link>
        <div className="navbar-links">
          <Link href="/admin" className="btn btn-secondary btn-sm">
            Dashboard
          </Link>
        </div>
      </nav>

      <div className="manage-container">
        <div className="manage-header animate-fade-in-up">
          <h1>{quiz.title}</h1>
          <p>{quiz.description || "Tidak ada deskripsi"}</p>
        </div>

        <div className="manage-grid">
          {/* Status controls */}
          <div className="status-controls animate-fade-in-up delay-100">
            <div className="status-info">
              <div className={`status-dot ${quiz.status}`}></div>
              <span>
                Status:{" "}
                {quiz.status === "draft"
                  ? "Draft"
                  : quiz.status === "active"
                  ? "Aktif"
                  : "Selesai"}
              </span>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {quiz.status === "draft" && (
                <>
                  <button
                    className="btn btn-success btn-sm"
                    onClick={() => handleStatusChange("active")}
                  >
                    Mulai Quiz
                  </button>
                  <button
                    className="btn btn-purple btn-sm"
                    onClick={() => router.push(`/admin/edit/${id}`)}
                  >
                    Edit Quiz
                  </button>
                </>
              )}
              {quiz.status === "active" && (
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleStatusChange("completed")}
                >
                  Akhiri Quiz
                </button>
              )}
              {quiz.status === "completed" && (
                <button
                  className="btn btn-light btn-sm"
                  onClick={() => handleStatusChange("draft")}
                >
                  Reset ke Draft
                </button>
              )}
              {quiz.musicFileName && quiz.status === "active" && (
                <button
                  className="btn btn-light btn-sm"
                  onClick={() => setIsMuted(!isMuted)}
                >
                  {isMuted ? (
                    <>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                        <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
                        <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
                        <line x1="12" y1="19" x2="12" y2="23"></line>
                        <line x1="8" y1="23" x2="16" y2="23"></line>
                      </svg>
                      <span>Unmute</span>
                    </>
                  ) : (
                    <>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                      </svg>
                      <span>Mute</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Invite Code */}
          <div className="invite-code-card animate-fade-in-up delay-200">
            <h3>Kode Undangan</h3>
            <div className="invite-code-display">{quiz.inviteCode}</div>
            <button
              className="btn btn-primary copy-btn"
              onClick={handleCopyCode}
            >
              {copied ? "Tersalin!" : "Salin Kode"}
            </button>
            <p style={{ marginTop: "0.75rem", fontSize: "0.8rem", opacity: 0.7 }}>
              Bagikan kode ini ke peserta untuk bergabung
            </p>
          </div>

          {/* Participant count card */}
          <div className="participants-card animate-fade-in-up delay-300">
            <h3>
              Peserta{" "}
              <span className="participant-count">
                {participants.length}
              </span>
            </h3>
            {participants.length === 0 ? (
              <p style={{ color: "var(--text-light)", textAlign: "center", padding: "2rem 0" }}>
                Belum ada peserta bergabung
              </p>
            ) : (
              <ul className="participant-list">
                {participants.slice(0, 5).map((p, i) => (
                  <li key={p.id} className="participant-item">
                    <span style={{ color: "var(--text-light)", fontSize: "0.8rem", width: "24px", fontWeight: 800 }}>
                      #{i + 1}
                    </span>
                    <span className="name">{p.name}</span>
                    <span className="score">{p.score || 0} pts</span>
                  </li>
                ))}
                {participants.length > 5 && (
                  <li style={{ textAlign: "center", padding: "0.5rem", color: "var(--text-light)", fontSize: "0.8rem", fontWeight: 700 }}>
                    +{participants.length - 5} peserta lainnya
                  </li>
                )}
              </ul>
            )}
          </div>

          {/* LIVE LEADERBOARD */}
          <div className="live-leaderboard animate-fade-in-up delay-300">
            <div className="live-leaderboard-header">
              <h3>
                Leaderboard
                {quiz.status === "active" && (
                  <span className="live-badge">
                    <span className="live-badge-dot"></span>
                    LIVE
                  </span>
                )}
              </h3>
              <span style={{ fontSize: "0.8rem", color: "var(--text-light)", fontWeight: 700 }}>
                {participants.length} peserta
              </span>
            </div>

            {participants.length === 0 ? (
              <div className="lb-empty">
                Belum ada peserta. Bagikan kode undangan untuk memulai.
              </div>
            ) : (
              <>
                <div className="lb-table-header">
                  <span>Rank</span>
                  <span>Nama</span>
                  <span>Progress</span>
                  <span style={{ textAlign: "right" }}>Skor</span>
                </div>
                <div className="lb-list">
                  {participants.map((p, index) => {
                    const scorePercent = maxScore > 0
                      ? ((p.score || 0) / maxScore) * 100
                      : 0;
                    const hasChanged = changedIds.has(p.id);
                    const delta = scoreDeltas[p.id];

                    return (
                      <div
                        key={p.id}
                        className={`lb-item ${hasChanged ? "rank-changed" : ""}`}
                      >
                        <div className={`lb-rank ${getRankClass(index)}`}>
                          {index + 1}
                        </div>
                        <div className="lb-name">{p.name}</div>
                        <div className="lb-score-bar-container">
                          <div className="lb-score-bar-track">
                            <div
                              className={`lb-score-bar-fill ${getBarClass(index)}`}
                              style={{ width: `${scorePercent}%` }}
                            ></div>
                          </div>
                        </div>
                        <div className="lb-score">
                          {p.score || 0}
                          {hasChanged && delta > 0 && (
                            <span className="score-delta">+{delta}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Questions review */}
          <div className="questions-review animate-fade-in-up delay-400">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ fontSize: "1rem", marginBottom: 0, textTransform: "uppercase" }}>
                Daftar Soal ({quiz.questions?.length || 0})
              </h3>
              <button
                className="btn btn-light btn-sm"
                onClick={() => setShowQuestions(!showQuestions)}
              >
                {showQuestions ? "Sembunyikan Soal" : "Tampilkan Soal"}
              </button>
            </div>
            
            {showQuestions && quiz.questions?.map((q, i) => (
              <div key={i} className="question-review-item">
                <h4>
                  {i + 1}. {q.question}
                </h4>
                <div className="question-review-options">
                  {q.options.map((opt, j) => (
                    <span
                      key={j}
                      className={j === q.correctAnswer ? "correct" : ""}
                    >
                      {optionLabels[j]}. {opt}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
