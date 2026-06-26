"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  db,
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  orderBy,
} from "@/lib/firebase";

function Confetti() {
  const [pieces, setPieces] = useState([]);

  useEffect(() => {
    const colors = [
      "#E21B3C",
      "#1368CE",
      "#D89E00",
      "#26890C",
      "#46178F",
      "#FF6B35",
    ];
    const newPieces = [];
    for (let i = 0; i < 50; i++) {
      newPieces.push({
        id: i,
        left: Math.random() * 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 3,
        duration: 2 + Math.random() * 3,
        size: 6 + Math.random() * 8,
      });
    }
    setPieces(newPieces);
  }, []);

  return (
    <div className="confetti-container">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

function ResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const participantId = searchParams.get("pid");
  const quizId = searchParams.get("qid");

  const [quiz, setQuiz] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [myData, setMyData] = useState(null);
  const [myRank, setMyRank] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    const loadResults = async () => {
      if (!quizId) {
        setLoading(false);
        return;
      }

      try {
        const quizSnap = await getDoc(doc(db, "quizzes", quizId));
        if (quizSnap.exists()) {
          setQuiz({ id: quizSnap.id, ...quizSnap.data() });
        }

        const q = query(
          collection(db, "quizzes", quizId, "participants"),
          orderBy("score", "desc")
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setParticipants(data);

        const myIndex = data.findIndex((p) => p.id === participantId);
        if (myIndex !== -1) {
          setMyData(data[myIndex]);
          setMyRank(myIndex + 1);
          if (myIndex < 3) {
            setShowConfetti(true);
          }
        }
      } catch (err) {
        console.error("Error loading results:", err);
      }
      setLoading(false);
    };

    loadResults();
  }, [quizId, participantId]);

  if (loading) {
    return (
      <div className="loading-container" style={{ minHeight: "100vh" }}>
        <div className="spinner"></div>
        <p style={{ opacity: 0.7 }}>Memuat hasil...</p>
      </div>
    );
  }

  const totalQuestions = quiz?.questions?.length || 0;
  const correctAnswers = myData?.answers?.filter((a) => a.correct).length || 0;

  const getRankLabel = (rank) => {
    if (rank === 1) return "Juara 1";
    if (rank === 2) return "Juara 2";
    if (rank === 3) return "Juara 3";
    return `Peringkat #${rank}`;
  };

  const getRankClass = (index) => {
    if (index === 0) return "gold";
    if (index === 1) return "silver";
    if (index === 2) return "bronze";
    return "";
  };

  const getRankDisplay = (index) => {
    if (index === 0) return "1st";
    if (index === 1) return "2nd";
    if (index === 2) return "3rd";
    return `#${index + 1}`;
  };

  return (
    <div className="results-container">
      {showConfetti && <Confetti />}

      <div className="results-header">
        <h1>Hasil Quiz</h1>
        <p>{quiz?.title || "Quiz"}</p>
      </div>

      {myData && (
        <div className="results-score-card">
          <div className="big-score">{myData.score || 0}</div>
          <div className="score-label">
            {correctAnswers}/{totalQuestions} jawaban benar
          </div>
          <div className="results-rank">{getRankLabel(myRank)}</div>
          <p style={{ marginTop: "0.5rem", fontSize: "0.8rem", color: "var(--text-light)" }}>
            dari {participants.length} peserta
          </p>
        </div>
      )}

      <div className="leaderboard">
        <h2>Leaderboard</h2>
        {participants.map((p, index) => (
          <div
            key={p.id}
            className={`leaderboard-item ${
              p.id === participantId ? "highlight" : ""
            }`}
          >
            <div className={`leaderboard-rank ${getRankClass(index)}`}>
              {getRankDisplay(index)}
            </div>
            <span className="leaderboard-name">
              {p.name}
              {p.id === participantId && (
                <span style={{ fontSize: "0.75rem", opacity: 0.7, marginLeft: "0.5rem" }}>
                  (Anda)
                </span>
              )}
            </span>
            <span className="leaderboard-score">{p.score || 0}</span>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: "1rem", marginTop: "2rem", flexWrap: "wrap", justifyContent: "center" }}>
        <Link href="/" className="btn btn-primary btn-lg">
          Kembali ke Beranda
        </Link>
      </div>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="loading-container" style={{ minHeight: "100vh" }}>
          <div className="spinner"></div>
          <p style={{ opacity: 0.7 }}>Memuat hasil...</p>
        </div>
      }
    >
      <ResultsContent />
    </Suspense>
  );
}
