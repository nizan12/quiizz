"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { db, collection, query, where, getDocs } from "@/lib/firebase";

export default function HomePage() {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleJoinQuiz = async (e) => {
    e.preventDefault();
    if (!inviteCode.trim() || !playerName.trim()) {
      setError("Mohon isi kode undangan dan nama Anda");
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
        )}`
      );
    } catch (err) {
      console.error("Error joining quiz:", err);
      setError("Terjadi kesalahan. Coba lagi.");
      setLoading(false);
    }
  };

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
            Quiz Iya Qiuz
          </h1>
          <p className="hero-subtitle">
            Bergabung dengan quiz menggunakan kode undangan, jawab pertanyaan
            dengan cepat, dan bersaing di leaderboard secara langsung.
          </p>

          {/* Join Card */}
          <div className="join-card animate-fade-in-up delay-200">
            <h2>Gabung Quiz</h2>
            <form onSubmit={handleJoinQuiz}>
              <div className="input-group">
                <label htmlFor="invite-code">Kode Undangan</label>
                <input
                  id="invite-code"
                  type="text"
                  className="input input-lg"
                  placeholder="Masukkan kode"
                  value={inviteCode}
                  onChange={(e) =>
                    setInviteCode(e.target.value.toUpperCase())
                  }
                  maxLength={6}
                  style={{ fontWeight: 800 }}
                />
              </div>
              <div className="input-group">
                <label htmlFor="player-name">Nama Anda</label>
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
              {error && (
                <p style={{ color: "var(--answer-red)", fontSize: "0.85rem", fontWeight: 700, marginTop: "0.5rem" }}>
                  {error}
                </p>
              )}
              <button
                type="submit"
                className="btn btn-purple btn-lg"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner spinner-sm"></span>
                    Mencari...
                  </>
                ) : (
                  "Gabung Sekarang"
                )}
              </button>
            </form>

            <div className="join-divider">atau</div>

            <Link href="/admin" className="btn btn-primary" style={{ width: "100%" }}>
              Buat Quiz Baru
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
