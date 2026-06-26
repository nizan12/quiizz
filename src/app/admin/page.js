"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  db,
  collection,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
} from "@/lib/firebase";

export default function AdminPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quizToDelete, setQuizToDelete] = useState(null);

  const ADMIN_PIN = "30121998";

  useEffect(() => {
    const stored = sessionStorage.getItem("admin_auth");
    if (stored === "true") {
      setIsAuthenticated(true);
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    const loadQuizzes = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, "quizzes"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setQuizzes(data);
      } catch (err) {
        console.error("Error loading quizzes:", err);
      }
      setLoading(false);
    };

    loadQuizzes();
  }, [isAuthenticated]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (pin === ADMIN_PIN) {
      sessionStorage.setItem("admin_auth", "true");
      setIsAuthenticated(true);
      setPinError("");
    } else {
      setPinError("PIN salah. Coba lagi.");
    }
  };

  const handleDeleteClick = (quizId) => {
    setQuizToDelete(quizId);
  };

  const confirmDelete = async () => {
    if (!quizToDelete) return;
    try {
      await deleteDoc(doc(db, "quizzes", quizToDelete));
      setQuizzes((prev) => prev.filter((q) => q.id !== quizToDelete));
    } catch (err) {
      console.error("Error deleting quiz:", err);
      alert("Gagal menghapus quiz. Silakan periksa koneksi.");
    }
    setQuizToDelete(null);
  };

  const getStatusBadge = (status) => {
    const map = {
      draft: { label: "Draft", className: "badge-draft" },
      active: { label: "Aktif", className: "badge-active" },
      completed: { label: "Selesai", className: "badge-completed" },
    };
    const s = map[status] || map.draft;
    return <span className={`badge ${s.className}`}>{s.label}</span>;
  };

  // Login screen
  if (!isAuthenticated) {
    return (
      <div className="admin-login">
        <div className="admin-login-card animate-scale-in">
          <h1>Admin Panel</h1>
          <p>Masukkan PIN admin untuk mengakses dashboard</p>
          <form onSubmit={handleLogin}>
            <div className="input-group">
              <label htmlFor="admin-pin">PIN Admin</label>
              <input
                id="admin-pin"
                type="password"
                className="input input-lg"
                placeholder="Masukkan PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                maxLength={10}
                autoFocus
                style={{ fontWeight: 800 }}
              />
            </div>
            {pinError && <p className="error-msg">{pinError}</p>}
            <button type="submit" className="btn btn-purple btn-lg" style={{ marginTop: "1rem" }}>
              Masuk
            </button>
          </form>
          <Link href="/" className="back-link">
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <nav className="navbar">
        <Link href="/" className="navbar-brand">
          QuizMaster<span className="brand-dot"></span>
        </Link>
        <div className="navbar-links">
          <Link href="/admin/create" className="btn btn-primary btn-sm">
            Buat Quiz
          </Link>
        </div>
      </nav>

      <div className="admin-container">
        <div className="admin-header animate-fade-in-up">
          <h1>Dashboard Admin</h1>
          <Link href="/admin/create" className="btn btn-purple">
            Buat Quiz Baru
          </Link>
        </div>

        <div className="admin-stats animate-fade-in-up delay-100">
          <div className="stat-card">
            <div className="stat-value">{quizzes.length}</div>
            <div className="stat-label">Total Quiz</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">
              {quizzes.filter((q) => q.status === "active").length}
            </div>
            <div className="stat-label">Quiz Aktif</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">
              {quizzes.reduce(
                (sum, q) => sum + (q.questions ? q.questions.length : 0),
                0
              )}
            </div>
            <div className="stat-label">Total Pertanyaan</div>
          </div>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="spinner spinner-dark"></div>
            <p style={{ color: "var(--text-medium)" }}>Memuat quiz...</p>
          </div>
        ) : quizzes.length === 0 ? (
          <div className="empty-state animate-fade-in">
            <div className="empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <h3>Belum ada quiz</h3>
            <p>Buat quiz pertama Anda untuk memulai</p>
            <Link href="/admin/create" className="btn btn-purple">
              Buat Quiz Pertama
            </Link>
          </div>
        ) : (
          <div className="quiz-grid">
            {quizzes.map((quiz, index) => (
              <div
                key={quiz.id}
                className="quiz-item animate-fade-in-up"
                style={{ animationDelay: `${index * 100}ms` }}
                onClick={() => router.push(`/admin/quiz/${quiz.id}`)}
              >
                <div className="quiz-item-header">
                  <h3>{quiz.title}</h3>
                  {getStatusBadge(quiz.status)}
                </div>
                <p>{quiz.description || "Tidak ada deskripsi"}</p>
                <div className="quiz-item-footer">
                  <span>{quiz.questions ? quiz.questions.length : 0} soal</span>
                  <span className="invite-code">{quiz.inviteCode}</span>
                </div>
                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
                  <button
                    className="btn btn-purple btn-sm"
                    style={{ flex: 1 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/admin/quiz/${quiz.id}`);
                    }}
                  >
                    Kelola
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClick(quiz.id);
                    }}
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {quizToDelete && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex",
          alignItems: "center", justifyContent: "center", padding: "1rem"
        }}>
          <div className="join-card animate-scale-in" style={{ maxWidth: "400px", padding: "2rem" }}>
            <h2 style={{ color: "var(--answer-red)", marginBottom: "1rem", textAlign: "left" }}>Konfirmasi Hapus</h2>
            <p style={{ color: "var(--text-medium)" }}>Yakin ingin menghapus quiz ini secara permanen? Semua data peserta juga akan hilang.</p>
            <div style={{ display: "flex", gap: "1rem", marginTop: "2rem", justifyContent: "flex-end" }}>
              <button className="btn btn-light" onClick={() => setQuizToDelete(null)}>Batal</button>
              <button className="btn btn-danger" onClick={confirmDelete}>Ya, Hapus</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
